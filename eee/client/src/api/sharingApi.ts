import apiClient from './client';
import type { ShareInfo, UserSearchResult } from '../types';

export async function createShare(fileId: string, recipientId: string, encryptedDek: string) {
  const { data } = await apiClient.post('/shares', { fileId, recipientId, encryptedDek });
  return data.share;
}

export async function getReceivedShares(): Promise<ShareInfo[]> {
  const { data } = await apiClient.get('/shares/received');
  return data.shares;
}

export async function getSentShares(): Promise<ShareInfo[]> {
  const { data } = await apiClient.get('/shares/sent');
  return data.shares;
}

export async function revokeShare(shareId: string): Promise<void> {
  await apiClient.delete(`/shares/${shareId}`);
}

export async function searchUsers(query: string): Promise<UserSearchResult[]> {
  const { data } = await apiClient.get('/users/search', { params: { q: query } });
  return data.users;
}
