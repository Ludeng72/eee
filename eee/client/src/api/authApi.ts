import apiClient from './client';
import type { AuthResponse } from '../types';

export async function register(payload: {
  email: string;
  password: string;
  publicKey: JsonWebKey;
  encryptedPrivateKey: string;
  privateKeyIv: string;
  masterKeySalt: string;
  masterKeyTag: string;
}): Promise<AuthResponse> {
  const { data } = await apiClient.post('/auth/register', payload);
  return data;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const { data } = await apiClient.post('/auth/login', { email, password });
  return data;
}

export async function logout(refreshToken: string): Promise<void> {
  await apiClient.post('/auth/logout', { refreshToken });
}
