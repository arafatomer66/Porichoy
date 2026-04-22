import { Router, Request, Response } from 'express';
import { AuthService } from './auth.service';
import { env } from '../../../config/env';
import { requireAuth } from '../../../middleware/auth.middleware';

const router = Router();

router.post('/register', async (req: Request, res: Response) => {
  try {
    const identity = await AuthService.register(req.body, req.ip);
    res.status(201).json(identity);
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const result = await AuthService.login(req.body, req.ip, req.headers['user-agent']);
    res.cookie(env.session.cookieName, result.sessionToken, {
      httpOnly: true,
      secure: env.session.secure,
      sameSite: 'lax',
      maxAge: env.session.ttlDays * 86400 * 1000,
    });
    res.json({ identity: result.identity, sessionUuid: result.sessionUuid });
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
});

router.post('/otp/request', async (req: Request, res: Response) => {
  try {
    const result = await AuthService.requestOtp(req.body, req.ip);
    res.json(result);
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
});

router.post('/otp/verify', async (req: Request, res: Response) => {
  try {
    const result = await AuthService.verifyOtp(req.body, req.ip, req.headers['user-agent']);
    res.cookie(env.session.cookieName, result.sessionToken, {
      httpOnly: true,
      secure: env.session.secure,
      sameSite: 'lax',
      maxAge: env.session.ttlDays * 86400 * 1000,
    });
    res.json({ identity: result.identity, sessionUuid: result.sessionUuid });
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
});

router.post('/logout', requireAuth, async (req: Request, res: Response) => {
  try {
    const token = req.cookies?.[env.session.cookieName];
    await AuthService.logout(token, req.identity!.uuid, req.ip);
    res.clearCookie(env.session.cookieName);
    res.json({ message: 'logged_out' });
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
});

router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const { AppDataSource } = await import('../../../config/database');
    const { Identity } = await import('../../../entities/identity.entity');
    const identity = await AppDataSource.getRepository(Identity).findOneBy({ uuid: req.identity!.uuid });
    res.json(identity);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
