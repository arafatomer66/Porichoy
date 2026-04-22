import { Router, Request, Response } from 'express';
import { OAuthService } from './oauth.service';
import { getJwks } from '../../../config/keys';
import { env } from '../../../config/env';
import { requireAuth } from '../../../middleware/auth.middleware';

const router = Router();

router.get('/authorize', requireAuth, async (req: Request, res: Response) => {
  try {
    const { client_id, redirect_uri, scope, response_type, code_challenge, code_challenge_method, state } = req.query as Record<string, string>;
    const result = await OAuthService.authorize({
      clientId: client_id, redirectUri: redirect_uri, scope: scope ?? 'openid',
      responseType: response_type, codeChallenge: code_challenge,
      codeChallengeMethod: code_challenge_method, identityUuid: req.identity!.uuid,
      consentGiven: false, state,
    });
    if (result.requiresConsent) return res.json({ requiresConsent: true, client: result.client });
    res.redirect(result.redirectUrl!);
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
});

router.post('/authorize/consent', requireAuth, async (req: Request, res: Response) => {
  try {
    const { clientId, redirectUri, scope, responseType, codeChallenge, codeChallengeMethod, state, decision } = req.body;
    if (decision === 'deny') return res.redirect(`${redirectUri}?error=access_denied${state ? `&state=${state}` : ''}`);

    const result = await OAuthService.authorize({
      clientId, redirectUri, scope: scope ?? 'openid', responseType,
      codeChallenge, codeChallengeMethod, identityUuid: req.identity!.uuid,
      consentGiven: true, state,
    });
    res.redirect(result.redirectUrl!);
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
});

router.post('/token', async (req: Request, res: Response) => {
  try {
    const { grant_type, code, redirect_uri, code_verifier, refresh_token, client_id, client_secret } = req.body;
    const result = await OAuthService.token({ grantType: grant_type, code, redirectUri: redirect_uri, codeVerifier: code_verifier, refreshToken: refresh_token, clientId: client_id, clientSecret: client_secret });
    res.json(result);
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
});

router.get('/userinfo', requireAuth, async (req: Request, res: Response) => {
  try {
    const info = await OAuthService.userinfo(req.identity!.uuid);
    res.json(info);
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
});

router.get('/jwks', (_req, res) => { res.json(getJwks()); });

router.get('/.well-known/openid-configuration', (_req, res) => {
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

export default router;
