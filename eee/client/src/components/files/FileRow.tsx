import { useState } from 'react';
import type { FileResponse } from '../../types';

interface Props {
  file: FileResponse;
  onDownload: () => void;
  onDelete: () => void;
  onShare?: () => void;
  showActions: boolean;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FileRow({ file, onDownload, onDelete, onShare, showActions }: Props) {
  const [confirming, setConfirming] = useState(false);

  function handleDelete() {
    if (confirming) {
      onDelete();
      setConfirming(false);
    } else {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 3000);
    }
  }

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 120px 200px',
      gap: 8, padding: '12px 0', borderBottom: '1px solid #f0f0f0',
      alignItems: 'center', fontSize: 14,
    }}>
      <div>
        <div style={{ fontWeight: 500 }}>{file.fileName}</div>
        <div style={{ fontSize: 12, color: '#aaa' }}>{file.mimeType}</div>
      </div>
      <span>{formatSize(file.fileSize)}</span>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: '#888' }}>
          {new Date(file.createdAt).toLocaleString('zh-CN')}
        </span>
        {showActions && (
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={onDownload}
              style={{ padding: '4px 10px', fontSize: 12, border: '1px solid #3498db',
                background: '#3498db', color: '#fff', borderRadius: 4 }}>
              下载
            </button>
            {onShare && (
              <button onClick={onShare}
                style={{ padding: '4px 10px', fontSize: 12, border: '1px solid #27ae60',
                  background: '#27ae60', color: '#fff', borderRadius: 4 }}>
                分享
              </button>
            )}
            <button onClick={handleDelete}
              style={{ padding: '4px 10px', fontSize: 12, border: '1px solid #e74c3c',
                background: confirming ? '#e74c3c' : '#fff',
                color: confirming ? '#fff' : '#e74c3c', borderRadius: 4 }}>
              {confirming ? '确认删除' : '删除'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
