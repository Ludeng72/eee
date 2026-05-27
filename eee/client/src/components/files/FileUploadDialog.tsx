import { useState, useRef } from 'react';
import { useFiles } from '../../hooks/useFiles';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function FileUploadDialog({ open, onClose }: Props) {
  const { upload } = useFiles();
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'encrypting' | 'uploading' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 100 * 1024 * 1024) {
      setError('文件大小不能超过 100MB');
      return;
    }

    setStatus('encrypting');
    setProgress(5);
    setError('');

    try {
      await upload(file, (pct) => {
        setProgress(pct);
        if (pct < 50) setStatus('encrypting');
        else if (pct < 100) setStatus('uploading');
        else setStatus('done');
      });
      setTimeout(() => {
        onClose();
        setStatus('idle');
        setProgress(0);
      }, 500);
    } catch (err: any) {
      setStatus('error');
      setError(err.message || '上传失败');
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
        <h3>上传文件</h3>

        {status === 'idle' && (
          <div style={{ margin: '20px 0' }}>
            <input ref={inputRef} type="file" onChange={handleFileChange}
              style={{ display: 'block', width: '100%' }} />
            <p style={{ color: '#888', fontSize: 13, marginTop: 8 }}>
              文件将在浏览器端加密后上传，最大 100MB
            </p>
          </div>
        )}

        {(status === 'encrypting' || status === 'uploading' || status === 'done') && (
          <div style={{ margin: '20px 0' }}>
            <div style={{
              height: 8, background: '#eee', borderRadius: 4, overflow: 'hidden',
            }}>
              <div style={{
                height: '100%', width: `${progress}%`,
                background: status === 'done' ? '#27ae60' : '#3498db',
                transition: 'width 0.3s',
              }} />
            </div>
            <p style={{ textAlign: 'center', marginTop: 8, fontSize: 14 }}>
              {status === 'encrypting' && `加密中... ${progress}%`}
              {status === 'uploading' && `上传中... ${progress}%`}
              {status === 'done' && '上传完成!'}
            </p>
          </div>
        )}

        {error && <p style={{ color: '#e74c3c', marginTop: 8 }}>{error}</p>}

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
