import { useState, useEffect, useCallback } from 'react';
import { getSentShares, revokeShare } from '../api/sharingApi';
import type { ShareInfo } from '../types';

export default function SharedByMePage() {
  const [shares, setShares] = useState<ShareInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await getSentShares();
      setShares(data);
    } catch {
      setError('加载失败');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleRevoke(shareId: string) {
    try {
      await revokeShare(shareId);
      setShares(prev => prev.filter(s => s.shareId !== shareId));
    } catch {
      setError('撤销失败');
    }
  }

  if (isLoading) return <p>加载中...</p>;

  return (
    <div>
      <h1>我分享的文件</h1>
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
                分享给 {s.recipient?.email} · {new Date(s.createdAt).toLocaleString('zh-CN')}
              </div>
            </div>
            <button onClick={() => handleRevoke(s.shareId)}
              style={{ padding: '6px 16px', background: '#e74c3c', color: '#fff',
                border: 'none', borderRadius: 4 }}>
              撤销分享
            </button>
          </div>
        ))
      )}
    </div>
  );
}
