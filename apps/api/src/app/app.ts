import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from '../config/env';
import { errorHandler } from '../middleware/error.middleware';

import authRouter from '../modules/ping/auth/auth.router';
import oauthRouter from '../modules/ping/oauth/oauth.router';
import authzRouter from '../modules/ping/authz/authz.router';
import sessionsRouter from '../modules/ping/sessions/sessions.router';
import clientsRouter from '../modules/ping/clients/clients.router';

import applicationsRouter from '../modules/sailpoint/applications/applications.router';
import rolesRouter from '../modules/sailpoint/roles/roles.router';
import assignmentsRouter from '../modules/sailpoint/assignments/assignments.router';
import reviewsRouter from '../modules/sailpoint/reviews/reviews.router';
import lifecycleRouter from '../modules/sailpoint/lifecycle/lifecycle.router';

import auditRouter from '../modules/audit/audit.router';
import identitiesRouter from '../modules/admin/identities/identities.router';

export function createApp() {
  const app = express();

  app.use(cors({
    origin: env.cors.origins,
    credentials: true,
  }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'porichoy-api' }));

  // OIDC discovery — standard path
  app.get('/.well-known/openid-configuration', (_req, res) => {
    const base = env.jwt.issuer;
    res.json({
      issuer: base,
      authorization_endpoint: `${base}/oauth/authorize`,
      token_endpoint: `${base}/oauth/token`,
      userinfo_endpoint: `${base}/oauth/userinfo`,
      jwks_uri: `${base}/oauth/jwks`,
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
      subject_types_supported: ['public'],
      id_token_signing_alg_values_supported: ['RS256'],
      scopes_supported: ['openid', 'profile', 'email', 'entitlements'],
      token_endpoint_auth_methods_supported: ['client_secret_basic', 'none'],
      code_challenge_methods_supported: ['S256'],
    });
  });

  // Ping side
  app.use('/auth', authRouter);
  app.use('/oauth', oauthRouter);
  app.use('/authz', authzRouter);
  app.use('/sessions', sessionsRouter);
  app.use('/clients', clientsRouter);

  // SailPoint side
  app.use('/applications', applicationsRouter);
  app.use('/roles', rolesRouter);
  app.use('/assignments', assignmentsRouter);
  app.use('/reviews', reviewsRouter);
  app.use('/lifecycle', lifecycleRouter);

  // Shared
  app.use('/audit', auditRouter);
  app.use('/identities', identitiesRouter);

  app.use(errorHandler);

  return app;
}
