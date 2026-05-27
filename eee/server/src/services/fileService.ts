import { v4 as uuid } from 'uuid';
import fs from 'fs';
import path from 'path';
import { getDb, saveDb } from '../db/connection';
import { config } from '../config';
import type {
  FileResponse, FileDetailResponse, FileListResponse, UploadFileFields,
} from '../../../shared/types';

export function createFile(
  ownerId: string,
  storagePath: string,
  fields: UploadFileFields
): FileResponse {
  const db = getDb();
  const id = uuid();
  const now = new Date().toISOString();

  db.run(
    `INSERT INTO files (id, owner_id, encrypted_dek, file_name, file_size, encrypted_size,
      mime_type, storage_path, file_iv, file_tag, checksum_sha256, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, ownerId,
      fields.encryptedDek,
      fields.fileName,
      parseInt(fields.fileSize, 10),
      parseInt(fields.encryptedSize, 10),
      fields.mimeType,
      storagePath,
      fields.fileIv,
      fields.fileTag,
      fields.checksumSha256,
      now, now,
    ]
  );
  saveDb();

  return {
    id, ownerId,
    fileName: fields.fileName,
    fileSize: parseInt(fields.fileSize, 10),
    encryptedSize: parseInt(fields.encryptedSize, 10),
    mimeType: fields.mimeType,
    checksumSha256: fields.checksumSha256,
    createdAt: now,
  };
}

export function listFiles(
  ownerId: string,
  page: number = 1,
  limit: number = 50
): FileListResponse {
  const db = getDb();
  const offset = (page - 1) * limit;

  const countResult = db.exec(
    'SELECT COUNT(*) as cnt FROM files WHERE owner_id = ?', [ownerId]
  );
  const total = countResult[0].values[0][0] as number;

  const result = db.exec(
    `SELECT id, owner_id, file_name, file_size, encrypted_size, mime_type, checksum_sha256, created_at
     FROM files WHERE owner_id = ?
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [ownerId, limit, offset]
  );

  const files: FileResponse[] = (result[0]?.values || []).map((row: any) => ({
    id: row[0], ownerId: row[1], fileName: row[2],
    fileSize: row[3], encryptedSize: row[4], mimeType: row[5],
    checksumSha256: row[6], createdAt: row[7],
  }));

  return { files, total, page, limit };
}

export function getFileById(fileId: string, userId: string): FileDetailResponse {
  const db = getDb();

  // 检查是否为文件所有者
  const fileResult = db.exec(
    `SELECT id, owner_id, encrypted_dek, file_name, file_size, encrypted_size,
      mime_type, storage_path, file_iv, file_tag, checksum_sha256, created_at
     FROM files WHERE id = ?`, [fileId]
  );

  // 如果文件属于当前用户
  if (fileResult.length > 0 && fileResult[0].values.length > 0) {
    const row = fileResult[0].values[0];
    if (row[1] === userId) {
      return rowToDetail(row);
    }
  }

  // 检查是否通过分享获得访问
  const shareResult = db.exec(
    `SELECT f.id, f.owner_id, s.encrypted_dek, f.file_name, f.file_size, f.encrypted_size,
      f.mime_type, f.storage_path, f.file_iv, f.file_tag, f.checksum_sha256, f.created_at
     FROM files f
     JOIN shares s ON s.file_id = f.id
     WHERE f.id = ? AND s.recipient_id = ?`, [fileId, userId]
  );

  if (shareResult.length > 0 && shareResult[0].values.length > 0) {
    // 用分享中的 encryptedDek 替换文件表中的
    const row = shareResult[0].values;
    const detail = rowToDetail(row);
    detail.encryptedDek = row[2] as string;
    return detail;
  }

  throw Object.assign(new Error('文件不存在或无权访问'), { status: 404 });
}

function rowToDetail(row: any[]): FileDetailResponse {
  return {
    id: row[0] as string,
    ownerId: row[1] as string,
    encryptedDek: row[2] as string,
    fileName: row[3] as string,
    fileSize: row[4] as number,
    encryptedSize: row[5] as number,
    mimeType: row[6] as string,
    storagePath: row[7] as string,
    fileIv: row[8] as string,
    fileTag: row[9] as string,
    checksumSha256: row[10] as string,
    createdAt: row[11] as string,
  };
}

export function getFilePath(fileId: string, userId: string): { storagePath: string; fileName: string } {
  const file = getFileById(fileId, userId);
  return { storagePath: file.storagePath, fileName: file.fileName };
}

export function deleteFile(fileId: string, userId: string): void {
  const db = getDb();

  const result = db.exec('SELECT owner_id, storage_path FROM files WHERE id = ?', [fileId]);
  if (result.length === 0 || result[0].values.length === 0) {
    throw Object.assign(new Error('文件不存在'), { status: 404 });
  }

  const row = result[0].values[0];
  if (row[0] !== userId) {
    throw Object.assign(new Error('无权删除此文件'), { status: 403 });
  }

  // 删除磁盘上的文件
  const storagePath = row[1] as string;
  const fullPath = path.join(config.uploadsDir, path.basename(storagePath));
  try { fs.unlinkSync(fullPath); } catch { /* 文件可能已不存在 */ }

  // 删除数据库记录（CASCADE 会删除关联的 shares）
  db.run('DELETE FROM files WHERE id = ?', [fileId]);
  saveDb();
}
