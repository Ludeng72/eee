import { useState } from 'react';
import { useFiles } from '../hooks/useFiles';
import FileList from '../components/files/FileList';
import FileUploadDialog from '../components/files/FileUploadDialog';
import ShareDialog from '../components/files/ShareDialog';
import type { FileResponse } from '../types';

export default function DashboardPage() {
  const { files, isLoading, error, upload, download, remove } = useFiles();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [shareFile, setShareFile] = useState<FileResponse | null>(null);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1>我的文件</h1>
        <button onClick={() => setUploadOpen(true)}
          style={{ padding: '10px 24px', background: '#3498db', color: '#fff',
            border: 'none', borderRadius: 6, fontSize: 14 }}>
          + 上传文件
        </button>
      </div>

      {error && <p style={{ color: '#e74c3c', marginBottom: 12 }}>{error}</p>}

      <FileList
        files={files}
        isLoading={isLoading}
        onDownload={download}
        onDelete={remove}
        onShare={(f: FileResponse) => setShareFile(f)}
      />

      <FileUploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)} />
      <ShareDialog open={!!shareFile} file={shareFile} onClose={() => setShareFile(null)} />
    </div>
  );
}
