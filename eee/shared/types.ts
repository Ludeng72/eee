// ============================================================
// DTOs shared between client and server — single source of truth
// ============================================================

// --- Auth ---
export interface RegisterRequest {
  email: string;
  password: string;
  publicKey: JsonWebKey;
  encryptedPrivateKey: string;
  privateKeyIv: string;
  masterKeySalt: string;
  masterKeyTag: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: UserResponse;
  accessToken: string;
  refreshToken: string;
}

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

// --- Files ---
export interface UploadFileFields {
  encryptedDek: string;
  fileName: string;
  fileSize: string;        // comes as string from FormData
  mimeType: string;
  fileIv: string;
  fileTag: string;
  checksumSha256: string;
  encryptedSize: string;
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

export interface FileDetailResponse {
  id: string;
  ownerId: string;
  fileName: string;
  fileSize: number;
  encryptedSize: number;
  mimeType: string;
  encryptedDek: string;
  fileIv: string;
  fileTag: string;
  checksumSha256: string;
  storagePath: string;
  createdAt: string;
}

export interface FileListResponse {
  files: FileResponse[];
  total: number;
  page: number;
  limit: number;
}

// --- Shares ---
export interface CreateShareRequest {
  fileId: string;
  recipientId: string;
  encryptedDek: string;
}

export interface ShareResponse {
  id: string;
  fileId: string;
  ownerId: string;
  recipientId: string;
  encryptedDek: string;
  createdAt: string;
}

export interface SharedFileResponse {
  shareId: string;
  file: FileResponse;
  owner?: { id: string; email: string };
  recipient?: { id: string; email: string };
  createdAt: string;
}

// --- Users ---
export interface UserSearchResult {
  id: string;
  email: string;
  publicKey: JsonWebKey;
}
