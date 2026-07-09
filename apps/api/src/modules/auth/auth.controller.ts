import { Controller, Post, Body, HttpCode, HttpStatus, Req, Get, UseGuards, Put } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';

@Controller('v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('otp/send')
  @HttpCode(HttpStatus.OK)
  sendOtp(@Req() req, @Body() sendOtpDto: SendOtpDto) {
    const ip = req.ip || req.connection?.remoteAddress || '127.0.0.1';
    const ua = req.headers['user-agent'] || 'Unknown';
    return this.authService.sendOtp(sendOtpDto, ip, ua);
  }

  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  verifyOtp(@Req() req, @Body() verifyOtpDto: VerifyOtpDto) {
    const ip = req.ip || req.connection?.remoteAddress || '127.0.0.1';
    const ua = req.headers['user-agent'] || 'Unknown';
    return this.authService.verifyOtp(verifyOtpDto, ip, ua);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @HttpCode(HttpStatus.OK)
  getMe(@Req() req) {
    return this.authService.getMe(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Put('profile')
  @HttpCode(HttpStatus.OK)
  updateProfile(@Req() req, @Body() dto: { fullName: string; email: string }) {
    return this.authService.updateProfile(req.user.userId, dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Req() req, @Body() refreshTokenDto: any) {
    const ip = req.ip || req.connection?.remoteAddress || '127.0.0.1';
    const ua = req.headers['user-agent'] || 'Unknown';
    return this.authService.refresh(refreshTokenDto.refreshToken, ip, ua);
  }
}
