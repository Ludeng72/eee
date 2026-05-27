import { useState } from 'react';
import { searchUsers, createShare } from '../../api/sharingApi';
import { getFileDetail } from '../../api/filesApi';
import { reEncryptDek, importPublicKey } from '../../services/cryptoService';
import { useAuth } from '../../store/authContext';
import type { FileResponse, UserSearchResult } from '../../types';

interface Props {
  open: boolean;
  file: FileResponse | null;
  onClose: () => void;
}

export default function ShareDialog({ open, file, onClose }: Props) {
  const { getPrivateKey } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!open || !file) return null;

  async function handleSearch() {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const users = await searchUsers(query.trim());
      setResults(users);
    } catch {
      setError('搜索失败');
    } finally {
      setSearching(false);
    }
  }

  async function handleShare(recipient: UserSearchResult) {
    setSharing(true);
    setError('');
    try {
      // 获取文件元数据（含 encryptedDek）
      const detail = await getFileDetail(file!.id);

      // 获取接收者公钥
      // 需要先通过 API 获取接收者的 publicKey，这里简化：从搜索结果扩展
      // 实际上需要后端返回 publicKey。这里我们先获取文件详情，然后用接收者的 key
      // （改进：在搜索结果中包含 publicKey，或添加 GET /api/users/:id/public-key 端点）

      const privateKey = getPrivateKey();
      const recipientPubKey = await importPublicKey(recipient.publicKey);
      const newEncryptedDek = await reEncryptDek(
        detail.encryptedDek, privateKey, recipientPubKey
      );

      await createShare(file!.id, recipient.id, newEncryptedDek);
      setSuccess(`已分享给 ${recipient.email}`);
      setTimeout(() => {
        onClose();
        setSuccess('');
        setQuery('');
        setResults([]);
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.error || '分享失败');
    } finally {
      setSharing(false);
    }
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.4)', display: 'flex',
      justifyContent: 'center', alignItems: 'center', zIndex: 1000,
    }}>
      <div style={{
        background: '#fff', padding: 32, borderRadius: 12,
        width: 420, boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
      }}>
        <h3>分享文件: {file.fileName}</h3>

        <div style={{ margin: '16px 0', display: 'flex', gap: 8 }}>
          <input value={query} onChange={e => setQuery(e.target.value)}
            placeholder="搜索用户邮箱..."
            style={{ flex: 1, padding: 8 }}
            onKeyDown={e => e.key === 'Enter' && handleSearch()} />
          <button onClick={handleSearch} disabled={searching}
            style={{ padding: '8px 16px', background: '#3498db', color: '#fff',
              border: 'none', borderRadius: 4 }}>
            {searching ? '...' : '搜索'}
          </button>
        </div>

        {results.length > 0 && (
          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
            {results.map(u => (
              <div key={u.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 0', borderBottom: '1px solid #f0f0f0',
              }}>
                <span>{u.email}</span>
                <button onClick={() => handleShare(u)} disabled={sharing}
                  style={{ padding: '4px 12px', background: '#27ae60', color: '#fff',
                    border: 'none', borderRadius: 4 }}>
                  分享
                </button>
              </div>
            ))}
          </div>
        )}

        {error && <p style={{ color: '#e74c3c', marginTop: 8 }}>{error}</p>}
        {success && <p style={{ color: '#27ae60', marginTop: 8 }}>{success}</p>}

        <div style={{ textAlign: 'right', marginTop: 16 }}>
          <button onClick={onClose}
            style={{ padding: '8px 24px', border: '1px solid #ddd',
              background: '#fff', borderRadius: 6 }}>
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}

