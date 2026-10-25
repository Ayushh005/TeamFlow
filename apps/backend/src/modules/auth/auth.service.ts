import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { WorkspaceRole } from '@prisma/client';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Helper: Hashes raw refresh tokens using SHA-256 for secure storage
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Generates Access Token (15m) and Refresh Token (7d)
   */
  private async generateTokens(userId: string, email: string) {
    const accessSecret =
      this.configService.get<string>('JWT_ACCESS_SECRET') ||
      'super_secret_teamflow_access_key';
    const refreshSecret =
      this.configService.get<string>('JWT_REFRESH_SECRET') ||
      'super_secret_teamflow_refresh_key';

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { sub: userId, email },
        {
          secret: accessSecret,
          expiresIn: '15m',
        },
      ),
      this.jwtService.signAsync(
        { sub: userId, email, jti: crypto.randomUUID() },
        {
          secret: refreshSecret,
          expiresIn: '7d',
        },
      ),
    ]);

    return { accessToken, refreshToken };
  }

  /**
   * Register a new user and automatically create their default workspace
   */
  async register(dto: RegisterDto, userAgent?: string, ipAddress?: string) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    // Create user & initial workspace in a single transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email.toLowerCase(),
          passwordHash,
          displayName: dto.displayName,
        },
      });

      const slugBase = dto.displayName.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const uniqueSlug = `${slugBase}-${crypto.randomBytes(3).toString('hex')}`;

      const workspace = await tx.workspace.create({
        data: {
          name: `${dto.displayName}'s Workspace`,
          slug: uniqueSlug,
          createdById: user.id,
          memberships: {
            create: {
              userId: user.id,
              role: WorkspaceRole.OWNER,
            },
          },
        },
      });

      return { user, workspace };
    });

    const tokens = await this.generateTokens(result.user.id, result.user.email);
    const tokenHash = this.hashToken(tokens.refreshToken);

    await this.prisma.refreshSession.create({
      data: {
        userId: result.user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        userAgent,
        ipAddress,
      },
    });

    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        displayName: result.user.displayName,
      },
      tokens,
    };
  }

  /**
   * Login user with email & password, create refresh session
   */
  async login(dto: LoginDto, userAgent?: string, ipAddress?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status === 'SUSPENDED') {
      throw new UnauthorizedException('Account has been suspended');
    }

    const tokens = await this.generateTokens(user.id, user.email);
    const tokenHash = this.hashToken(tokens.refreshToken);

    await this.prisma.refreshSession.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        userAgent,
        ipAddress,
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
      },
      tokens,
    };
  }

  /**
   * Refresh token rotation with reuse detection
   */
  async refreshTokens(rawRefreshToken: string, userAgent?: string, ipAddress?: string) {
    if (!rawRefreshToken) {
      throw new UnauthorizedException('No refresh token provided');
    }

    // Verify JWT integrity
    const refreshSecret =
      this.configService.get<string>('JWT_REFRESH_SECRET') ||
      'super_secret_teamflow_refresh_key';

    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(rawRefreshToken, {
        secret: refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const tokenHash = this.hashToken(rawRefreshToken);
    const session = await this.prisma.refreshSession.findUnique({
      where: { tokenHash },
    });

    // REUSE DETECTION: If token not found or already revoked/rotated
    if (!session || session.revokedAt) {
      this.logger.warn(
        `🚨 Security Alert: Refresh token reuse detected for user ${payload.sub}! Revoking all sessions.`,
      );
      // Invalidate all sessions for this user family
      await this.prisma.refreshSession.updateMany({
        where: { userId: payload.sub },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException(
        'Suspicious session activity detected. Please login again.',
      );
    }

    if (new Date() > session.expiresAt) {
      throw new UnauthorizedException('Session has expired. Please login again.');
    }

    // Revoke old session and issue new rotated pair
    await this.prisma.refreshSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || user.status === 'SUSPENDED') {
      throw new UnauthorizedException('User account no longer active');
    }

    const newTokens = await this.generateTokens(user.id, user.email);
    const newTokenHash = this.hashToken(newTokens.refreshToken);

    await this.prisma.refreshSession.create({
      data: {
        userId: user.id,
        tokenHash: newTokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        rotatedFrom: session.id,
        userAgent,
        ipAddress,
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
      },
      tokens: newTokens,
    };
  }

  /**
   * Revoke session on logout
   */
  async logout(rawRefreshToken?: string) {
    if (!rawRefreshToken) return { success: true };

    const tokenHash = this.hashToken(rawRefreshToken);
    await this.prisma.refreshSession.updateMany({
      where: { tokenHash },
      data: { revokedAt: new Date() },
    });

    return { success: true, message: 'Logged out successfully' };
  }

  /**
   * Retrieve current user profile and scoped workspace memberships
   */
  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        status: true,
        createdAt: true,
        memberships: {
          select: {
            id: true,
            role: true,
            workspace: {
              select: {
                id: true,
                name: true,
                slug: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    return user;
  }
}
