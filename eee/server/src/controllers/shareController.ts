import { Request, Response } from 'express';
import * as shareService from '../services/shareService';

export function createShare(req: Request, res: Response): void {
  try {
    const share = shareService.createShare(req.body, req.userId!);
    res.status(201).json({ share });
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

export function getReceivedShares(req: Request, res: Response): void {
  try {
    const shares = shareService.getReceivedShares(req.userId!);
    res.json({ shares });
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

export function getSentShares(req: Request, res: Response): void {
  try {
    const shares = shareService.getSentShares(req.userId!);
    res.json({ shares });
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

export function deleteShare(req: Request, res: Response): void {
  try {
    shareService.deleteShare(req.params.id, req.userId!);
    res.status(204).send();
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

export function searchUsers(req: Request, res: Response): void {
  try {
    const query = (req.query.q as string) || '';
    const users = shareService.searchUsers(query, req.userId!);
    res.json({ users });
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message });
  }
}
