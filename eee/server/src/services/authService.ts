import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { getDb, saveDb } from '../db/connection';
import { signAccessToken, generateRefreshToken } from '../utils/jwt';
import { config } from '../config';
import type {
  RegisterRequest, LoginRequest, AuthResponse, UserResponse,
} from '../../../shared/types';

export function register(data: RegisterRequest): AuthResponse {
  const db = getDb();

  // Check uniqueness
  const existing = db.exec('SELECT id FROM users WHERE email = ?', [data.email.toLowerCase().trim()]);
  if (existing.length > 0 && existing[0].values.length > 0) {
    throw Object.assign(new Error('该邮箱已被注册'), { status: 409 });
  }

  const id = uuid();
  const passwordHash = bcrypt.hashSync(data.password, config.bcryptRounds);
  const now = new Date().toISOString();

  db.run(
    `INSERT INTO users (id, email, password_hash, public_key, encrypted_private_key,
      private_key_iv, master_key_salt, master_key_tag, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.email.toLowerCase().trim(),
      passwordHash,
      JSON.stringify(data.publicKey),
      data.encryptedPrivateKey,
      data.privateKeyIv,
      data.masterKeySalt,
      data.masterKeyTag,
      now,
      now,
    ]
  );

  saveDb();

  const user: UserResponse = {
    id, email: data.email.toLowerCase().trim(),
    publicKey: data.publicKey,
    encryptedPrivateKey: data.encryptedPrivateKey,
    privateKeyIv: data.privateKeyIv,
    masterKeySalt: data.masterKeySalt,
    masterKeyTag: data.masterKeyTag,
    createdAt: now,
  };

  const accessToken = signAccessToken({ userId: id, email: user.email });
  const { raw: refreshToken, hash: tokenHash } = generateRefreshToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
  db.run('INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)',
    [uuid(), id, tokenHash, expiresAt]);
  saveDb();

  return { user, accessToken, refreshToken };
}

export function login(data: LoginRequest): AuthResponse {
  const db = getDb();
  const email = data.email.toLowerCase().trim();

  const result = db.exec(
    'SELECT id, email, password_hash, public_key, encrypted_private_key, private_key_iv, master_key_salt, master_key_tag, created_at FROM users WHERE email = ?',
    [email]
  );
  if (result.length === 0 || result[0].values.length === 0) {
    throw Object.assign(new Error('邮箱或密码错误'), { status: 401 });
  }

  const row = result[0].values[0];
  const passwordHash = row[2] as string;

  if (!bcrypt.compareSync(data.password, passwordHash)) {
    throw Object.assign(new Error('邮箱或密码错误'), { status: 401 });
  }

  const user: UserResponse = {
    id: row[0] as string,
    email: row[1] as string,
    publicKey: JSON.parse(row[3] as string),
    encryptedPrivateKey: row[4] as string,
    privateKeyIv: row[5] as string,
    masterKeySalt: row[6] as string,
    masterKeyTag: row[7] as string,
    createdAt: row[8] as string,
  };

  const accessToken = signAccessToken({ userId: user.id, email: user.email });
  const { raw: refreshToken, hash: tokenHash } = generateRefreshToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
  db.run('INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)',
    [uuid(), user.id, tokenHash, expiresAt]);
  saveDb();

  return { user, accessToken, refreshToken };
}

export function refreshAccessToken(refreshToken: string): { accessToken: string; refreshToken: string } {
  const db = getDb();
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

  const result = db.exec(
    'SELECT id, user_id, expires_at FROM refresh_tokens WHERE token_hash = ?',
    [tokenHash]
  );
  if (result.length === 0 || result[0].values.length === 0) {
    throw Object.assign(new Error('无效的刷新令牌'), { status: 401 });
  }

  const row = result[0].values[0];
  const tokenId = row[0] as string;
  const userId = row[1] as string;
  const expiresAt = row[2] as string;

  if (new Date(expiresAt) < new Date()) {
    db.run('DELETE FROM refresh_tokens WHERE id = ?', [tokenId]);
    saveDb();
    throw Object.assign(new Error('刷新令牌已过期'), { status: 401 });
  }

  // Get user email
  const userResult = db.exec('SELECT email FROM users WHERE id = ?', [userId]);
  const email = userResult[0].values[0][0] as string;

  // Rotate tokens
  db.run('DELETE FROM refresh_tokens WHERE id = ?', [tokenId]);

  const accessToken = signAccessToken({ userId, email });
  const newTokens = generateRefreshToken();
  const newExpiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
  db.run('INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)',
    [uuid(), userId, newTokens.hash, newExpiresAt]);
  saveDb();

  return { accessToken, refreshToken: newTokens.raw };
}

export function logout(refreshToken: string, userId: string): void {
  const db = getDb();
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  db.run('DELETE FROM refresh_tokens WHERE token_hash = ? AND user_id = ?', [tokenHash, userId]);
  saveDb();
}
