import { ConsoleEmailProvider } from '@nauth-toolkit/email-console';
import { DatabaseStorageAdapter } from '@nauth-toolkit/storage-database';
import { MFAMethod, NAuthModuleConfig } from '@nauth-toolkit/nestjs';
import { Logger } from '@nestjs/common';

/**
 * nauth-toolkit configuration.
 *
 * This example uses:
 * - Database storage (no Redis required)
 * - Console email provider (logs emails to stdout — swap for Nodemailer/SES in production)
 * - Google OAuth (disable by leaving GOOGLE_CLIENT_ID unset)
 * - TOTP MFA (Google Authenticator, Authy, etc.)
 * - Custom email verification template (see resources/email-templates/)
 *
 * For production, replace:
 * - DatabaseStorageAdapter → Redis (lower latency for sessions/challenges)
 * - ConsoleEmailProvider → NodemailerEmailProvider or SES
 */
export const authConfig: NAuthModuleConfig = {
  tablePrefix: 'nauth_',

  // Sessions and challenge state are stored here.
  // DatabaseStorageAdapter uses your existing PostgreSQL connection — no Redis needed.
  // For production with high traffic, consider @nauth-toolkit/storage-redis.
  storageAdapter: new DatabaseStorageAdapter(),

  jwt: {
    algorithm: 'HS256',
    issuer: 'nauth-example',
    audience: ['web'],
    accessToken: {
      secret: process.env.JWT_SECRET,
      expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRES_IN || '15m',
    },
    refreshToken: {
      secret: process.env.JWT_REFRESH_SECRET as string,
      expiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRES_IN || '7d',
      rotation: true,
      reuseDetection: true,
    },
  },

  logger: {
    instance: new Logger('NAuth'),
    enablePiiRedaction: true,
    logLevel: 'log',
  },

  signup: {
    enabled: true,
    verificationMethod: 'email',   // email | phone | both | none
    emailVerification: {
      expiresIn: 3600,             // 1 hour
      resendDelay: 60,             // 60 seconds between resends
      maxAttempts: 5,
      maxAttemptsPerIP: 20,
      attemptWindow: 3600,
      baseUrl: `${process.env.FRONTEND_BASE_URL || 'http://localhost:4200'}/auth/verify-email`,
    },
  },

  mfa: {
    enabled: true,
    enforcement: 'OPTIONAL',        // OPTIONAL | REQUIRED
    allowedMethods: [MFAMethod.TOTP],
    issuer: process.env.APP_NAME || 'My App',
    totp: {
      window: 1,
      stepSeconds: 30,
      digits: 6,
      algorithm: 'sha1',
    },
    rememberDevices: 'user_opt_in',
    rememberDeviceDays: 30,
    bypassMFAForTrustedDevices: true,
  },

  password: {
    minLength: 8,
    requireUppercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    preventCommon: true,
    historyCount: 5,
    specialChars: '$#!@',
    passwordReset: {
      codeLength: 6,
      expiresIn: 900,              // 15 minutes
      rateLimitMax: 3,
      rateLimitWindow: 3600,       // 1 hour
      maxAttempts: 3,
    },
  },

  // Token delivery: cookies by default (web), JSON for API clients.
  // 'hybrid' allows both modes on the same backend using @TokenDelivery() decorator.
  tokenDelivery: {
    method: 'cookies',
    cookieOptions: {
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    },
  },

  security: {
    maskSensitiveData: true,
    csrf: {
      cookieName: 'nauth_csrf_token',
      headerName: 'x-csrf-token',
    },
  },

  // Google OAuth — enabled automatically when GOOGLE_CLIENT_ID is set.
  social: {
    redirect: {
      frontendBaseUrl: process.env.FRONTEND_BASE_URL || 'http://localhost:4200',
      allowAbsoluteReturnTo: false,
      allowedReturnToOrigins: [
        process.env.FRONTEND_BASE_URL || 'http://localhost:4200',
        'http://localhost:3000',
      ],
    },
    google: {
      enabled: !!process.env.GOOGLE_CLIENT_ID,
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackUrl: `${process.env.API_BASE_URL || 'http://localhost:3000'}/auth/social/google/callback`,
      scopes: ['openid', 'email', 'profile'],
      autoLink: true,
      allowSignup: true,
    },
  },

  // Console email provider — prints emails to stdout.
  // Replace with NodemailerEmailProvider for real email delivery:
  //
  //   import { NodemailerEmailProvider } from '@nauth-toolkit/email-nodemailer';
  //   emailProvider: new NodemailerEmailProvider({
  //     transport: { host: 'smtp.example.com', port: 587, auth: { user: '...', pass: '...' } },
  //     defaults: { from: 'My App <noreply@example.com>' },
  //   }),
  emailProvider: new ConsoleEmailProvider(),

  email: {
    globalVariables: {
      appName: process.env.APP_NAME || 'My App',
      companyName: process.env.COMPANY_NAME || 'My Company',
      supportEmail: process.env.SUPPORT_EMAIL || 'support@example.com',
    },
    templates: {
      // Custom email templates — see resources/email-templates/ for examples.
      customTemplates: {
        verification: {
          htmlPath: './resources/email-templates/verification.html.hbs',
          textPath: './resources/email-templates/verification.text.hbs',
        },
      },
    },
  },

  emailNotifications: {
    enabled: true,
    suppress: {
      welcome: false,
      passwordChanged: false,
    },
  },

  lockout: {
    enabled: true,
    maxAttempts: 5,
    duration: 300,               // 5 minutes
    resetOnSuccess: true,
  },

  session: {
    maxConcurrent: 5,
    disallowMultipleSessions: false,
    maxLifetime: '30d',
  },

  challenge: {
    maxAttempts: 5,
  },

  auditLogs: {
    enabled: true,
    fireAndForget: true,
  },
} satisfies NAuthModuleConfig;
