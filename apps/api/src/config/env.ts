import 'dotenv/config';

export const env = {
  port: parseInt(process.env['PORT'] ?? '3400', 10),
  nodeEnv: process.env['NODE_ENV'] ?? 'development',

  db: {
    host: process.env['DB_HOST'] ?? 'localhost',
    port: parseInt(process.env['DB_PORT'] ?? '5432', 10),
    name: process.env['DB_NAME'] ?? 'porichoy',
    user: process.env['DB_USER'] ?? 'postgres',
    password: process.env['DB_PASSWORD'] ?? 'postgres',
    synchronize: process.env['DB_SYNCHRONIZE'] === 'true',
    logging: process.env['DB_LOGGING'] === 'true',
  },

  jwt: {
    accessTokenTtlSeconds: parseInt(process.env['ACCESS_TOKEN_TTL_SECONDS'] ?? '3600', 10),
    refreshTokenTtlDays: parseInt(process.env['REFRESH_TOKEN_TTL_DAYS'] ?? '30', 10),
    issuer: process.env['JWT_ISSUER'] ?? 'http://localhost:3400',
  },

  session: {
    ttlDays: parseInt(process.env['SESSION_TTL_DAYS'] ?? '7', 10),
    cookieName: 'porichoy_session',
    secure: process.env['NODE_ENV'] === 'production',
  },

  otp: {
    devMode: process.env['OTP_DEV_MODE'] !== 'false',
    devValue: process.env['OTP_DEV_VALUE'] ?? '123456',
    ttlMinutes: parseInt(process.env['OTP_TTL_MINUTES'] ?? '10', 10),
  },

  cors: {
    origins: (process.env['CORS_ORIGINS'] ?? 'http://localhost:3401').split(','),
  },
};
