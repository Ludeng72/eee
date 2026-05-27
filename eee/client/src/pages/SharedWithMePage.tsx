import { useState, useEffect, useCallback } from 'react';
import { getReceivedShares } from '../api/sharingApi';
import { downloadFile as downloadFileApi } from '../api/filesApi';
import { getFileDetail } from '../api/filesApi';
import { decryptFile } from '../services/cryptoService';
import { useAuth } from '../store/authContext';
import type { ShareInfo } from '../types';

export default function SharedWithMePage() {
  const { getPrivateKey } = useAuth();
  const [shares, setShares] = useState<ShareInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await getReceivedShares();
      setShares(data);
    } catch {
      setError('加载失败');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleDownload(share: ShareInfo) {
    try {
      const detail = await getFileDetail(share.file.id);
      const encryptedBlob = await downloadFileApi(share.file.id);
      const privateKey = getPrivateKey();
      const plaintext = await decryptFile(
        encryptedBlob,
        { encryptedDek: detail.encryptedDek, fileIv: detail.fileIv, fileTag: detail.fileTag },
        privateKey,
        detail.checksumSha256
      );
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
      setError(err.message || '下载失败');
    }
  }

  if (isLoading) return <p>加载中...</p>;

  return (
    <div>
      <h1>分享给我的文件</h1>
      {error && <p style={{ color: '#e74c3c' }}>{error}</p>}
      {shares.length === 0 ? (
        <p style={{ color: '#888' }}>暂无分享</p>
      ) : (
        shares.map(s => (
          <div key={s.shareId} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 0', borderBottom: '1px solid #f0f0f0',
          }}>
            <div>
              <div style={{ fontWeight: 500 }}>{s.file.fileName}</div>
              <div style={{ fontSize: 12, color: '#888' }}>
                来自 {s.owner?.email} · {new Date(s.createdAt).toLocaleString('zh-CN')}
              </div>
            </div>
            <button onClick={() => handleDownload(s)}
              style={{ padding: '6px 16px', background: '#3498db', color: '#fff',
                border: 'none', borderRadius: 4 }}>
              下载
            </button>
          </div>
        ))
      )}
    </div>
  );
}
