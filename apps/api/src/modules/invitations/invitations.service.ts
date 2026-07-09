import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../core/database/database.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';

@Injectable()
export class InvitationsService {
  constructor(private prisma: DatabaseService) {}

  async createInvitation(organizationId: string, dto: CreateInvitationDto) {
    // Check if role exists
    const role = await this.prisma.role.findUnique({
      where: { id: dto.roleId },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    // Verify role belongs to organization or is a system role
    if (role.organizationId && role.organizationId !== organizationId) {
      throw new BadRequestException('Role does not belong to this organization');
    }

    // Generate expires at (e.g., 7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create invitation
    const invitation = await this.prisma.organizationInvitation.create({
      data: {
        organizationId,
        phoneNumber: dto.phoneNumber,
        roleId: dto.roleId,
        status: 'Pending',
        expiresAt,
      },
    });

    // TODO: Emit event to notification worker (e.g. BullMQ)
    console.log(`Sending invitation SMS to ${dto.phoneNumber}`);

    return invitation;
  }

  async acceptInvitation(userId: string, phoneNumber: string, invitationId: string) {
    const invitation = await this.prisma.organizationInvitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.phoneNumber !== phoneNumber) {
      throw new BadRequestException('Phone number mismatch');
    }

    if (invitation.status !== 'Pending') {
      throw new BadRequestException(`Invitation is already ${invitation.status}`);
    }

    if (new Date() > invitation.expiresAt) {
      await this.prisma.organizationInvitation.update({
        where: { id: invitationId },
        data: { status: 'Expired' },
      });
      throw new BadRequestException('Invitation has expired');
    }

    // Create organization user
    await this.prisma.organizationUser.create({
      data: {
        userId,
        organizationId: invitation.organizationId,
        roleId: invitation.roleId,
        isActive: true,
      },
    });

    // Mark invitation as accepted
    await this.prisma.organizationInvitation.update({
      where: { id: invitationId },
      data: { status: 'Accepted' },
    });

    return { message: 'Invitation accepted successfully' };
  }
}
