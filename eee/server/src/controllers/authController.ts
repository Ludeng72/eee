import { Request, Response } from 'express';
import * as authService from '../services/authService';

export function register(req: Request, res: Response): void {
  try {
    const result = authService.register(req.body);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message || '注册失败' });
  }
}

export function login(req: Request, res: Response): void {
  try {
    const result = authService.login(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message || '登录失败' });
  }
}

export function refresh(req: Request, res: Response): void {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      res.status(400).json({ error: '缺少刷新令牌' });
      return;
    }
    const result = authService.refreshAccessToken(refreshToken);
    res.json(result);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message || '刷新失败' });
  }
}

export function logout(req: Request, res: Response): void {
  try {
    const { refreshToken } = req.body;
    authService.logout(refreshToken, req.userId!);
    res.status(204).send();
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message || '登出失败' });
  }
}
