import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private setRefreshTokenCookie(res: Response, refreshToken: string) {
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });
  }

  private clearRefreshTokenCookie(res: Response) {
    res.clearCookie('refreshToken', {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    });
  }

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user account with default workspace' })
  @ApiResponse({ status: 201, description: 'User successfully created' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const userAgent = req.headers['user-agent'];
    const ip = req.ip;
    const result = await this.authService.register(dto, userAgent, ip);

    this.setRefreshTokenCookie(res, result.tokens.refreshToken);

    return {
      success: true,
      data: {
        user: result.user,
        accessToken: result.tokens.accessToken,
      },
    };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // Redis-backed rate limiting (5 attempts/min)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const userAgent = req.headers['user-agent'];
    const ip = req.ip;
    const result = await this.authService.login(dto, userAgent, ip);

    this.setRefreshTokenCookie(res, result.tokens.refreshToken);

    return {
      success: true,
      data: {
        user: result.user,
        accessToken: result.tokens.accessToken,
      },
    };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate and refresh access token via HttpOnly cookie' })
  @ApiResponse({ status: 200, description: 'Token refreshed' })
  @ApiResponse({ status: 401, description: 'Invalid or reused token' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.['refreshToken'] || req.body?.refreshToken;
    const userAgent = req.headers['user-agent'];
    const ip = req.ip;

    const result = await this.authService.refreshTokens(refreshToken, userAgent, ip);
    this.setRefreshTokenCookie(res, result.tokens.refreshToken);

    return {
      success: true,
      data: {
        user: result.user,
        accessToken: result.tokens.accessToken,
      },
    };
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout and revoke active session' })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.['refreshToken'] || req.body?.refreshToken;
    await this.authService.logout(refreshToken);
    this.clearRefreshTokenCookie(res);

    return {
      success: true,
      message: 'Logged out successfully',
    };
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user and workspace memberships' })
  @ApiResponse({ status: 200, description: 'Profile retrieved' })
  async me(@CurrentUser('id') userId: string) {
    const user = await this.authService.getMe(userId);
    return {
      success: true,
      data: user,
    };
  }
}
