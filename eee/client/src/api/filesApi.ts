import apiClient from './client';
import type { FileResponse, FileDetailResponse, FileListResponse } from '../types';

export async function uploadFile(formData: FormData): Promise<FileResponse> {
  const { data } = await apiClient.post('/files/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.file;
}

export async function listFiles(page = 1, limit = 50): Promise<FileListResponse> {
  const { data } = await apiClient.get('/files', { params: { page, limit } });
  return data;
}

export async function getFileDetail(fileId: string): Promise<FileDetailResponse> {
  const { data } = await apiClient.get(`/files/${fileId}`);
  return data.file;
}

export async function downloadFile(fileId: string): Promise<ArrayBuffer> {
  const { data } = await apiClient.get(`/files/${fileId}/download`, {
    responseType: 'arraybuffer',
  });
  return data;
}

export async function deleteFile(fileId: string): Promise<void> {
  await apiClient.delete(`/files/${fileId}`);
}
