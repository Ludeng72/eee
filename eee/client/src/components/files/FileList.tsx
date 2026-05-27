import type { FileResponse } from '../../types';
import FileRow from './FileRow';

interface Props {
  files: FileResponse[];
  isLoading: boolean;
  onDownload: (fileId: string, fileName: string) => void;
  onDelete: (fileId: string) => void;
  onShare?: (file: FileResponse) => void;
  showActions?: boolean;
}

export default function FileList({ files, isLoading, onDownload, onDelete, onShare, showActions = true }: Props) {
  if (isLoading) {
    return <p style={{ color: '#888' }}>加载中...</p>;
  }

  if (files.length === 0) {
    return <p style={{ color: '#888' }}>暂无文件</p>;
  }

  return (
    <div>
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 120px 200px',
        gap: 8, padding: '8px 0', borderBottom: '2px solid #eee',
        fontWeight: 600, fontSize: 13, color: '#888'
      }}>
        <span>文件名</span>
        <span>大小</span>
        <span>上传时间</span>
      </div>
      {files.map(f => (
        <FileRow key={f.id} file={f}
          onDownload={() => onDownload(f.id, f.fileName)}
          onDelete={() => onDelete(f.id)}
          onShare={onShare ? () => onShare(f) : undefined}
          showActions={showActions}
        />
      ))}
    </div>
  );
}
