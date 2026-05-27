// 与 shared/types.ts 对齐的前端类型定义

export interface UserResponse {
  id: string;
  email: string;
  publicKey: JsonWebKey;
  encryptedPrivateKey: string;
  privateKeyIv: string;
  masterKeySalt: string;
  masterKeyTag: string;
  createdAt: string;
}

export interface AuthResponse {
  user: UserResponse;
  accessToken: string;
  refreshToken: string;
}

export interface FileResponse {
  id: string;
  ownerId: string;
  fileName: string;
  fileSize: number;
  encryptedSize: number;
  mimeType: string;
  checksumSha256: string;
  createdAt: string;
}

export interface FileDetailResponse extends FileResponse {
  encryptedDek: string;
  fileIv: string;
  fileTag: string;
  storagePath: string;
}

export interface FileListResponse {
  files: FileResponse[];
  total: number;
  page: number;
  limit: number;
}

export interface ShareInfo {
  shareId: string;
  file: FileResponse;
  owner?: { id: string; email: string };
  recipient?: { id: string; email: string };
  createdAt: string;
}

export interface UserSearchResult {
  id: string;
  email: string;
  publicKey: JsonWebKey;
}
