// ============================================================
// 加密服务 — 所有客户端加密/解密操作
// 仅使用 Web Crypto API (window.crypto.subtle)
// ============================================================

const PBKDF2_ITERATIONS = 600_000;
const RSA_MODULUS_LENGTH = 2048;
const AES_KEY_LENGTH = 256;
const DEK_BYTE_LENGTH = 32; // 256 bits

// ---------- 编码工具 ----------

export function arrayBufferToBase64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

export function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export function generateRandomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

// ---------- SHA-256 ----------

export async function sha256(data: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// ---------- 主密钥派生 ----------

export async function deriveMasterKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: AES_KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

// ---------- RSA 密钥对 ----------

export async function generateRSAKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: RSA_MODULUS_LENGTH,
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
      hash: 'SHA-256',
    },
    true,
    ['encrypt', 'decrypt']
  );
}

export async function exportPublicKey(key: CryptoKey): Promise<JsonWebKey> {
  return crypto.subtle.exportKey('jwk', key);
}

export async function exportPrivateKey(key: CryptoKey): Promise<JsonWebKey> {
  return crypto.subtle.exportKey('jwk', key);
}

export async function importPublicKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'jwk', jwk,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    true, ['encrypt']
  );
}

export async function importPrivateKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'jwk', jwk,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    true, ['decrypt']
  );
}

// ---------- 私钥包装 ----------

export async function wrapPrivateKey(
  privateKey: CryptoKey,
  masterKey: CryptoKey
): Promise<{ encryptedPrivateKey: string; iv: string; tag: string }> {
  const jwk = await exportPrivateKey(privateKey);
  const iv = generateRandomBytes(12);
  const enc = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    masterKey,
    enc.encode(JSON.stringify(jwk))
  );
  // AES-GCM 输出 = 密文 + 16字节认证标签
  const full = new Uint8Array(ciphertext);
  const tag = full.slice(full.length - 16);
  const ct = full.slice(0, full.length - 16);
  return {
    encryptedPrivateKey: arrayBufferToBase64(ct.buffer),
    iv: arrayBufferToBase64(iv.buffer),
    tag: arrayBufferToBase64(tag.buffer),
  };
}

export async function unwrapPrivateKey(
  encryptedPrivateKey: string,
  iv: string,
  tag: string,
  masterKey: CryptoKey
): Promise<CryptoKey> {
  const ct = base64ToArrayBuffer(encryptedPrivateKey);
  const tagBuf = base64ToArrayBuffer(tag);
  const ivBuf = base64ToArrayBuffer(iv);

  // 合并密文 + tag
  const combined = new Uint8Array(ct.byteLength + tagBuf.byteLength);
  combined.set(new Uint8Array(ct), 0);
  combined.set(new Uint8Array(tagBuf), ct.byteLength);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBuf },
    masterKey,
    combined.buffer
  );

  const dec = new TextDecoder();
  const jwk: JsonWebKey = JSON.parse(dec.decode(decrypted));
  return importPrivateKey(jwk);
}

// ---------- 文件加密 ----------

export interface EncryptedFileOutput {
  encryptedBlob: Blob;
  encryptedDek: string;
  fileIv: string;
  fileTag: string;
  checksumSha256: string;
}

export async function encryptFile(
  plaintext: ArrayBuffer,
  ownerPublicKey: CryptoKey
): Promise<EncryptedFileOutput> {
  // 1. 生成随机 DEK
  const dek = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: AES_KEY_LENGTH },
    true, ['encrypt']
  );

  // 2. 加密文件
  const iv = generateRandomBytes(12);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    dek,
    plaintext
  );

  // 3. 计算明文 checksum
  const checksum = await sha256(plaintext);

  // 4. 分离密文和 tag
  const full = new Uint8Array(ciphertext);
  const tag = full.slice(full.length - 16);
  const ct = full.slice(0, full.length - 16);

  // 5. 用 RSA-OAEP 包装 DEK
  const rawDek = await crypto.subtle.exportKey('raw', dek);
  const wrappedDek = await crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    ownerPublicKey,
    rawDek
  );

  return {
    encryptedBlob: new Blob([ct]),
    encryptedDek: arrayBufferToBase64(wrappedDek),
    fileIv: arrayBufferToBase64(iv.buffer),
    fileTag: arrayBufferToBase64(tag.buffer),
    checksumSha256: checksum,
  };
}

// ---------- 文件解密 ----------

export interface FileDecryptParams {
  encryptedDek: string;
  fileIv: string;
  fileTag: string;
}

export async function decryptFile(
  encryptedBlob: ArrayBuffer,
  params: FileDecryptParams,
  privateKey: CryptoKey,
  expectedChecksum: string
): Promise<ArrayBuffer> {
  // 1. 用 RSA 私钥解开 DEK
  const wrappedDek = base64ToArrayBuffer(params.encryptedDek);
  const rawDek = await crypto.subtle.decrypt(
    { name: 'RSA-OAEP' },
    privateKey,
    wrappedDek
  );

  const dek = await crypto.subtle.importKey(
    'raw', rawDek,
    { name: 'AES-GCM', length: AES_KEY_LENGTH },
    false, ['decrypt']
  );

  // 2. 合并密文 + tag
  const ivBuf = base64ToArrayBuffer(params.fileIv);
  const tagBuf = base64ToArrayBuffer(params.fileTag);
  const combined = new Uint8Array(encryptedBlob.byteLength + tagBuf.byteLength);
  combined.set(new Uint8Array(encryptedBlob), 0);
  combined.set(new Uint8Array(tagBuf), encryptedBlob.byteLength);

  // 3. 解密
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBuf },
    dek,
    combined.buffer
  );

  // 4. 验证 checksum
  const actualChecksum = await sha256(plaintext);
  if (actualChecksum !== expectedChecksum) {
    throw new Error('文件完整性校验失败——文件可能已被篡改');
  }

  return plaintext;
}

// ---------- 分享：重新加密 DEK ----------

export async function reEncryptDek(
  ownerEncryptedDek: string,
  ownerPrivateKey: CryptoKey,
  recipientPublicKey: CryptoKey
): Promise<string> {
  // 1. 用发送者私钥解密 DEK
  const wrappedDek = base64ToArrayBuffer(ownerEncryptedDek);
  const rawDek = await crypto.subtle.decrypt(
    { name: 'RSA-OAEP' },
    ownerPrivateKey,
    wrappedDek
  );

  // 2. 用接收者公钥重新加密
  const newWrappedDek = await crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    recipientPublicKey,
    rawDek
  );

  return arrayBufferToBase64(newWrappedDek);
}
