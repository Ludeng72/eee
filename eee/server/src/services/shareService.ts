import { v4 as uuid } from 'uuid';
import { getDb, saveDb } from '../db/connection';
import type { CreateShareRequest, ShareResponse, SharedFileResponse } from '../../../shared/types';

export function createShare(data: CreateShareRequest, ownerId: string): ShareResponse {
  const db = getDb();

  // 验证文件属于 owner
  const fileResult = db.exec('SELECT id FROM files WHERE id = ? AND owner_id = ?',
    [data.fileId, ownerId]);
  if (fileResult.length === 0 || fileResult[0].values.length === 0) {
    throw Object.assign(new Error('文件不存在'), { status: 404 });
  }

  // 验证接收者存在
  const userResult = db.exec('SELECT id FROM users WHERE id = ?', [data.recipientId]);
  if (userResult.length === 0 || userResult[0].values.length === 0) {
    throw Object.assign(new Error('接收者不存在'), { status: 404 });
  }

  // 不能分享给自己
  if (data.recipientId === ownerId) {
    throw Object.assign(new Error('不能分享给自己'), { status: 400 });
  }

  // 检查是否已分享
  const existing = db.exec(
    'SELECT id FROM shares WHERE file_id = ? AND recipient_id = ?',
    [data.fileId, data.recipientId]
  );
  if (existing.length > 0 && existing[0].values.length > 0) {
    throw Object.assign(new Error('已分享给该用户'), { status: 409 });
  }

  const id = uuid();
  const now = new Date().toISOString();

  db.run(
    `INSERT INTO shares (id, file_id, owner_id, recipient_id, encrypted_dek, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, data.fileId, ownerId, data.recipientId, data.encryptedDek, now]
  );
  saveDb();

  return { id, fileId: data.fileId, ownerId, recipientId: data.recipientId,
    encryptedDek: data.encryptedDek, createdAt: now };
}

export function getReceivedShares(userId: string): SharedFileResponse[] {
  const db = getDb();

  const result = db.exec(
    `SELECT s.id as share_id, f.id, f.owner_id, f.file_name, f.file_size,
      f.encrypted_size, f.mime_type, f.checksum_sha256, f.created_at,
      u.email as owner_email, s.created_at as share_created
     FROM shares s
     JOIN files f ON f.id = s.file_id
     JOIN users u ON u.id = s.owner_id
     WHERE s.recipient_id = ?
     ORDER BY s.created_at DESC`,
    [userId]
  );

  return (result[0]?.values || []).map((row: any) => ({
    shareId: row[0],
    file: {
      id: row[1], ownerId: row[2], fileName: row[3],
      fileSize: row[4], encryptedSize: row[5], mimeType: row[6],
      checksumSha256: row[7], createdAt: row[8],
    },
    owner: { id: row[2], email: row[9] },
    createdAt: row[10],
  }));
}

export function getSentShares(userId: string): SharedFileResponse[] {
  const db = getDb();

  const result = db.exec(
    `SELECT s.id as share_id, f.id, f.owner_id, f.file_name, f.file_size,
      f.encrypted_size, f.mime_type, f.checksum_sha256, f.created_at,
      u.email as recipient_email, s.created_at as share_created
     FROM shares s
     JOIN files f ON f.id = s.file_id
     JOIN users u ON u.id = s.recipient_id
     WHERE s.owner_id = ?
     ORDER BY s.created_at DESC`,
    [userId]
  );

  return (result[0]?.values || []).map((row: any) => ({
    shareId: row[0],
    file: {
      id: row[1], ownerId: row[2], fileName: row[3],
      fileSize: row[4], encryptedSize: row[5], mimeType: row[6],
      checksumSha256: row[7], createdAt: row[8],
    },
    recipient: { id: row[2], email: row[9] },
    createdAt: row[10],
  }));
}

export function deleteShare(shareId: string, userId: string): void {
  const db = getDb();

  const result = db.exec('SELECT owner_id FROM shares WHERE id = ?', [shareId]);
  if (result.length === 0 || result[0].values.length === 0) {
    throw Object.assign(new Error('分享不存在'), { status: 404 });
  }

  if (result[0].values[0][0] !== userId) {
    throw Object.assign(new Error('无权撤销分享'), { status: 403 });
  }

  db.run('DELETE FROM shares WHERE id = ?', [shareId]);
  saveDb();
}

export function searchUsers(query: string, currentUserId: string): { id: string; email: string; publicKey: JsonWebKey }[] {
  const db = getDb();
  const result = db.exec(
    `SELECT id, email, public_key FROM users
     WHERE email LIKE ? AND id != ?
     LIMIT 10`,
    [`%${query}%`, currentUserId]
  );
  return (result[0]?.values || []).map((row: any) => ({
    id: row[0], email: row[1], publicKey: JSON.parse(row[2]),
  }));
}
