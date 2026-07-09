import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from '../../core/database/database.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { PlatformAuthorizationService } from '../platform-roles/platform-authorization.service';
import { PlatformGlobalSettingsService } from '../platform-global-settings/platform-global-settings.service';

function parseUserAgent(uaStr?: string) {
  const lowercase = (uaStr || '').toLowerCase();
  let device = 'Desktop';
  if (lowercase.includes('mobile') || lowercase.includes('android') || lowercase.includes('iphone')) {
    device = 'Mobile';
  } else if (lowercase.includes('ipad') || lowercase.includes('tablet')) {
    device = 'Tablet';
  }

  let browser = 'Chrome';
  if (lowercase.includes('firefox')) {
    browser = 'Firefox';
  } else if (lowercase.includes('safari') && !lowercase.includes('chrome')) {
    browser = 'Safari';
  } else if (lowercase.includes('edge')) {
    browser = 'Edge';
  } else if (lowercase.includes('opera')) {
    browser = 'Opera';
  }

  return { device, browser };
}

@Injectable()
export class AuthService {
  // In a real application, use Redis to store OTPs.
  private otpStore = new Map<string, string>();

  constructor(
    private prisma: DatabaseService,
    private jwtService: JwtService,
    private auditLogs: AuditLogsService,
    private platformAuthz: PlatformAuthorizationService,
    private globalSettings: PlatformGlobalSettingsService,
  ) {}

  private async findUserByPhone(phoneNumber: string) {
    // 1. Try exact match
    let user = await this.prisma.user.findUnique({
      where: { phoneNumber },
    });
    if (user) return user;

    // 2. Try match without '+' prefix
    const withoutPlus = phoneNumber.replace(/^\+/, '');
    user = await this.prisma.user.findUnique({
      where: { phoneNumber: withoutPlus },
    });
    if (user) return user;

    // 3. Try match with '+' prepended
    if (!phoneNumber.startsWith('+')) {
      user = await this.prisma.user.findUnique({
        where: { phoneNumber: `+${phoneNumber}` },
      });
      if (user) return user;
    }

    // 4. Try match by extracting last 10 digits
    const clean = phoneNumber.replace(/\D/g, '');
    if (clean.length >= 10) {
      const last10 = clean.slice(-10);
      user = await this.prisma.user.findFirst({
        where: {
          OR: [
            { phoneNumber: { endsWith: last10 } },
            { phoneNumber: last10 }
          ]
        }
      });
      if (user) return user;
    }

    return null;
  }

  async sendOtp(dto: SendOtpDto, ip?: string, ua?: string) {
    const { phoneNumber, mode } = dto;
    const { device, browser } = parseUserAgent(ua);
    
    // Check duplicate phone number for signup mode
    if (mode === 'signup') {
      const userExists = await this.findUserByPhone(phoneNumber);
      if (userExists) {
        // Log signup failure
        await this.auditLogs.logEvent({
          action: 'OTP Failed',
          user: phoneNumber,
          details: `OTP signup request failed. Phone number ${phoneNumber} is already registered.`,
          eventType: 'LOGIN_FAILED',
          eventCategory: 'Authentication',
          metadata: { failureReason: 'Phone already registered', device, browser },
          ipAddress: ip,
          userAgent: ua,
        });

        throw new BadRequestException('Phone number is already registered. Please sign in instead.');
      }
    }

    // Generate a 6-digit OTP (Mocking 123456 for now)
    const otp = '123456'; 
    this.otpStore.set(phoneNumber, otp);

    // Log OTP Sent
    await this.auditLogs.logEvent({
      action: 'OTP Sent',
      user: phoneNumber,
      details: `Dispatched SMS OTP verification code to ${phoneNumber} (${mode || 'login'} mode).`,
      eventType: 'OTP_SENT',
      eventCategory: 'Authentication',
      metadata: { mode, device, browser },
      ipAddress: ip,
      userAgent: ua,
    });

    // TODO: Integrate SMS provider (Twilio/SNS)
    console.log(`Sending OTP ${otp} to ${phoneNumber}`);

    return { message: 'OTP sent successfully' };
  }

  async verifyOtp(dto: VerifyOtpDto, ip?: string, ua?: string) {
    const { phoneNumber, otp, fullName, mode } = dto;
    const { device, browser } = parseUserAgent(ua);

    const storedOtp = this.otpStore.get(phoneNumber);
    if (!storedOtp || storedOtp !== otp) {
      // Log login failure
      await this.auditLogs.logEvent({
        action: 'Login Failed',
        user: phoneNumber,
        details: `OTP verification failed for phone number ${phoneNumber}. Reason: Invalid or expired OTP.`,
        eventType: 'LOGIN_FAILED',
        eventCategory: 'Authentication',
        metadata: { failureReason: 'Invalid or expired OTP', device, browser },
        ipAddress: ip,
        userAgent: ua,
      });

      // If this phone belongs to a Platform User, track the failed attempt
      // and auto-lock after repeated failures (PLT-007 Security).
      const maybeUser = await this.findUserByPhone(phoneNumber);
      if (maybeUser) {
        const platformUser = await this.prisma.platformAdminUser.findUnique({ where: { userId: maybeUser.id } });
        if (platformUser && platformUser.status !== 'LOCKED' && platformUser.status !== 'ARCHIVED') {
          const { loginAttemptThreshold, accountLockDurationMinutes } = await this.globalSettings.getLoginPolicy();
          const attempts = platformUser.failedLoginAttempts + 1;
          const shouldLock = attempts >= loginAttemptThreshold;
          await this.prisma.platformAdminUser.update({
            where: { id: platformUser.id },
            data: {
              failedLoginAttempts: attempts,
              status: shouldLock ? 'LOCKED' : platformUser.status,
              isActive: shouldLock ? false : platformUser.isActive,
              lockedUntil: shouldLock ? new Date(Date.now() + accountLockDurationMinutes * 60 * 1000) : platformUser.lockedUntil,
            },
          });
          if (shouldLock) {
            await this.auditLogs.logEvent({
              userId: maybeUser.id,
              action: 'Platform User Locked',
              user: maybeUser.fullName || phoneNumber,
              details: `${maybeUser.fullName} was locked out after ${attempts} failed login attempts.`,
              eventType: 'PLATFORM_USER_LOCKED',
              eventCategory: 'Platform Users',
              entityType: 'PlatformAdminUser',
              entityId: platformUser.id,
            });
          }
        }
      }

      throw new BadRequestException('Invalid or expired OTP');
    }

    // Clear OTP after successful verification
    this.otpStore.delete(phoneNumber);

    // Double check duplicate on verification for signup
    let user = await this.findUserByPhone(phoneNumber);

    if (mode === 'signup' && user) {
      await this.auditLogs.logEvent({
        action: 'Login Failed',
        user: phoneNumber,
        details: `OTP verification failed for phone number ${phoneNumber} on signup. Reason: Already registered.`,
        eventType: 'LOGIN_FAILED',
        eventCategory: 'Authentication',
        metadata: { failureReason: 'Phone number already registered', device, browser },
        ipAddress: ip,
        userAgent: ua,
      });
      throw new BadRequestException('Phone number is already registered.');
    }

    let isNewAccount = false;
    if (!user) {
      isNewAccount = true;
      user = await this.prisma.user.create({
        data: {
          phoneNumber,
          fullName: fullName || 'New User',
          isVerified: true,
        },
      });
    }

    // Generate JWT
    const payload = { sub: user.id, phoneNumber: user.phoneNumber };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    // Reset failed-attempt counters and complete invitation acceptance for
    // Platform Users on every successful login (PLT-007).
    const platformUser = await this.prisma.platformAdminUser.findUnique({ where: { userId: user.id } });
    if (platformUser) {
      const wasPending = platformUser.status === 'PENDING_INVITATION';
      await this.prisma.platformAdminUser.update({
        where: { id: platformUser.id },
        data: {
          failedLoginAttempts: 0,
          status: wasPending ? 'ACTIVE' : platformUser.status,
          isActive: wasPending ? true : platformUser.isActive,
          acceptedAt: wasPending ? new Date() : platformUser.acceptedAt,
        },
      });
      if (wasPending) {
        await this.auditLogs.logEvent({
          userId: user.id,
          action: 'Invitation Accepted',
          user: user.fullName || user.phoneNumber,
          details: `${user.fullName} accepted their platform invitation and signed in for the first time.`,
          eventType: 'PLATFORM_INVITATION_ACCEPTED',
          eventCategory: 'Platform Users',
          entityType: 'PlatformAdminUser',
          entityId: platformUser.id,
        });
      }
    }

    // Try to find if user has organizations
    const orgUser = await this.prisma.organizationUser.findFirst({
      where: { userId: user.id, isActive: true },
      include: {
        organization: true,
        role: true,
        roles: true,
      },
    });

    // Find active employee record and primary gym assignment
    const employee = await this.prisma.employee.findFirst({
      where: { userId: user.id },
      include: {
        employeeGymAssignments: {
          where: { isPrimary: true },
        },
      },
    });

    let roleKey = 'owner';
    const allRoles = orgUser ? [orgUser.role, ...(orgUser.roles || [])] : [];
    const isOwner = allRoles.some(r => r.name.toLowerCase().includes('owner'));
    const isManager = allRoles.some(r => r.name.toLowerCase().includes('manager'));
    const isReceptionist = allRoles.some(r => r.name.toLowerCase().includes('receptionist'));
    const isTrainer = allRoles.some(r => r.name.toLowerCase().includes('trainer'));
    const isDietitian = allRoles.some(r => r.name.toLowerCase().includes('dietitian'));

    if (isOwner) roleKey = 'owner';
    else if (isManager) roleKey = 'branch_manager';
    else if (isReceptionist) roleKey = 'receptionist';
    else if (isTrainer) roleKey = 'trainer';
    else if (isDietitian) roleKey = 'dietitian';
    else if (allRoles.length > 0) roleKey = allRoles[0].name.toLowerCase();

    const normalizedUser = {
      id: user.id,
      name: user.fullName,
      email: user.email || '',
      phone: user.phoneNumber,
      role: roleKey,
      organizationId: orgUser?.organizationId || '',
      gymId: employee?.employeeGymAssignments?.[0]?.gymId || '',
    };

    const sessionId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    // Log Account Created if new
    if (isNewAccount) {
      await this.auditLogs.logEvent({
        userId: user.id,
        action: 'Account Created',
        user: user.fullName || user.phoneNumber,
        details: `Created new user account for ${user.fullName} (${user.phoneNumber}).`,
        eventType: 'ACCOUNT_CREATED',
        eventCategory: 'Authentication',
        entityType: 'User',
        entityId: user.id,
        metadata: { device, browser },
        ipAddress: ip,
        userAgent: ua,
      });
    }

    // Log Login Success & Session Created
    await this.auditLogs.logEvent({
      organizationId: orgUser?.organizationId || null,
      userId: user.id,
      action: 'Login Success',
      user: user.fullName || user.phoneNumber,
      details: `User ${user.fullName} logged in successfully via OTP verification.`,
      eventType: 'LOGIN_SUCCESS',
      eventCategory: 'Authentication',
      entityType: 'User',
      entityId: user.id,
      metadata: { sessionId, device, browser, organizationName: orgUser?.organization?.name || 'None' },
      ipAddress: ip,
      userAgent: ua,
    });

    return {
      accessToken,
      refreshToken,
      user: normalizedUser,
    };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const orgUser = await this.prisma.organizationUser.findFirst({
      where: { userId: user.id, isActive: true },
      include: {
        organization: true,
        role: true,
        roles: true,
      },
    });

    const employee = await this.prisma.employee.findFirst({
      where: { userId: user.id },
      include: {
        employeeGymAssignments: {
          where: { isPrimary: true },
        },
      },
    });

    const platformAdmin = await this.prisma.platformAdminUser.findUnique({ where: { userId: user.id } });

    // PLT-008: effective permissions from the dynamic RBAC engine, additive
    // alongside the legacy platformRole field. Future modules should read
    // this instead of comparing platformRole to a hardcoded string.
    let effectivePermissions: string[] = [];
    if (platformAdmin?.isActive) {
      const perms = await this.platformAuthz.getEffectivePermissionsForUser(platformAdmin.id);
      effectivePermissions = perms.filter((p) => p.effect === 'ALLOW').map((p) => p.key);
    }

    let roleKey = 'owner';
    const allRoles = orgUser ? [orgUser.role, ...(orgUser.roles || [])] : [];
    const isOwner = allRoles.some(r => r.name.toLowerCase().includes('owner'));
    const isManager = allRoles.some(r => r.name.toLowerCase().includes('manager'));
    const isReceptionist = allRoles.some(r => r.name.toLowerCase().includes('receptionist'));
    const isTrainer = allRoles.some(r => r.name.toLowerCase().includes('trainer'));
    const isDietitian = allRoles.some(r => r.name.toLowerCase().includes('dietitian'));

    if (isOwner) roleKey = 'owner';
    else if (isManager) roleKey = 'branch_manager';
    else if (isReceptionist) roleKey = 'receptionist';
    else if (isTrainer) roleKey = 'trainer';
    else if (isDietitian) roleKey = 'dietitian';
    else if (allRoles.length > 0) roleKey = allRoles[0].name.toLowerCase();

    const normalizedUser = {
      id: user.id,
      name: user.fullName,
      email: user.email || '',
      phone: user.phoneNumber,
      role: roleKey,
      organizationId: orgUser?.organizationId || '',
      gymId: employee?.employeeGymAssignments?.[0]?.gymId || '',
      platformRole: platformAdmin?.isActive ? platformAdmin.role : null,
      effectivePermissions,
    };

    return {
      user: normalizedUser,
    };
  }

  async updateProfile(userId: string, dto: { fullName: string; email: string }) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        fullName: dto.fullName,
        email: dto.email,
      },
    });

    const orgUser = await this.prisma.organizationUser.findFirst({
      where: { userId: user.id, isActive: true },
      include: {
        organization: true,
        role: true,
        roles: true,
      },
    });

    const employee = await this.prisma.employee.findFirst({
      where: { userId: user.id },
      include: {
        employeeGymAssignments: {
          where: { isPrimary: true },
        },
      },
    });

    let roleKey = 'owner';
    const allRoles = orgUser ? [orgUser.role, ...(orgUser.roles || [])] : [];
    const isOwner = allRoles.some(r => r.name.toLowerCase().includes('owner'));
    const isManager = allRoles.some(r => r.name.toLowerCase().includes('manager'));
    const isReceptionist = allRoles.some(r => r.name.toLowerCase().includes('receptionist'));
    const isTrainer = allRoles.some(r => r.name.toLowerCase().includes('trainer'));
    const isDietitian = allRoles.some(r => r.name.toLowerCase().includes('dietitian'));

    if (isOwner) roleKey = 'owner';
    else if (isManager) roleKey = 'branch_manager';
    else if (isReceptionist) roleKey = 'receptionist';
    else if (isTrainer) roleKey = 'trainer';
    else if (isDietitian) roleKey = 'dietitian';
    else if (allRoles.length > 0) roleKey = allRoles[0].name.toLowerCase();

    const normalizedUser = {
      id: user.id,
      name: user.fullName,
      email: user.email || '',
      phone: user.phoneNumber,
      role: roleKey,
      organizationId: orgUser?.organizationId || '',
      gymId: employee?.employeeGymAssignments?.[0]?.gymId || '',
    };

    return {
      user: normalizedUser,
    };
  }

  async refresh(refreshToken: string, ip?: string, ua?: string) {
    const { device, browser } = parseUserAgent(ua);
    try {
      const payload = this.jwtService.verify(refreshToken);
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      const newPayload = { sub: user.id, phoneNumber: user.phoneNumber };
      const newAccessToken = this.jwtService.sign(newPayload);
      const newRefreshToken = this.jwtService.sign(newPayload, { expiresIn: '7d' });

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        user,
      };
    } catch (err) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }
}
