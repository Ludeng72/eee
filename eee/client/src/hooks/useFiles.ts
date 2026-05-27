import { useState, useCallback, useEffect } from 'react';
import * as filesApi from '../api/filesApi';
import * as cryptoService from '../services/cryptoService';
import { useAuth } from '../store/authContext';
import type { FileResponse } from '../types';

export function useFiles() {
  const { getPrivateKey, user } = useAuth();
  const [files, setFiles] = useState<FileResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await filesApi.listFiles();
      setFiles(result.files);
      setTotal(result.total);
    } catch (err: any) {
      setError(err.response?.data?.error || '加载文件列表失败');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) refresh();
  }, [user, refresh]);

  const upload = useCallback(async (
    file: File,
    onProgress?: (pct: number) => void
  ): Promise<void> => {
    setError(null);
    try {
      onProgress?.(10);

      // 1. 读取文件内容
      const plaintext = await file.arrayBuffer();
      onProgress?.(20);

      // 2. 客户端加密
      const publicKey = getPrivateKey(); // 我们需要公钥来加密 DEK
      // 从 sessionStorage 获取用户的 publicKey JWK
      const userData = JSON.parse(sessionStorage.getItem('user')!);
      const pubKey = await cryptoService.importPublicKey(userData.publicKey);
      const encrypted = await cryptoService.encryptFile(plaintext, pubKey);
      onProgress?.(50);

      // 3. 构建 FormData
      const formData = new FormData();
      formData.append('file', encrypted.encryptedBlob, file.name + '.enc');
      formData.append('encryptedDek', encrypted.encryptedDek);
      formData.append('fileName', file.name);
      formData.append('fileSize', String(plaintext.byteLength));
      formData.append('mimeType', file.type || 'application/octet-stream');
      formData.append('fileIv', encrypted.fileIv);
      formData.append('fileTag', encrypted.fileTag);
      formData.append('checksumSha256', encrypted.checksumSha256);
      formData.append('encryptedSize', String(encrypted.encryptedBlob.size));

      // 4. 上传
      await filesApi.uploadFile(formData);
      onProgress?.(100);

      await refresh();
    } catch (err: any) {
      setError(err.response?.data?.error || '上传失败');
      throw err;
    }
  }, [getPrivateKey, refresh]);

  const download = useCallback(async (fileId: string, fileName: string): Promise<void> => {
    setError(null);
    try {
      // 1. 获取文件元数据
      const detail = await filesApi.getFileDetail(fileId);

      // 2. 下载加密数据
      const encryptedBlob = await filesApi.downloadFile(fileId);

      // 3. 客户端解密
      const privateKey = getPrivateKey();
      const plaintext = await cryptoService.decryptFile(
        encryptedBlob,
        { encryptedDek: detail.encryptedDek, fileIv: detail.fileIv, fileTag: detail.fileTag },
        privateKey,
        detail.checksumSha256
      );

      // 4. 触发浏览器下载
      const blob = new Blob([plaintext], { type: detail.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = detail.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || '下载失败');
      throw err;
    }
  }, [getPrivateKey]);

  const remove = useCallback(async (fileId: string): Promise<void> => {
    setError(null);
    try {
      await filesApi.deleteFile(fileId);
      await refresh();
    } catch (err: any) {
      setError(err.response?.data?.error || '删除失败');
      throw err;
    }
  }, [refresh]);

  return { files, total, isLoading, error, upload, download, remove, refresh };
}
