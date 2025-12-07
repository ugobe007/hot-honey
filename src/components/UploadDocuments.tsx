import React, { useState } from 'react';
import { API_BASE } from '@/lib/apiConfig';

const UploadDocuments: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append('document', file);

    try {
      const response = await fetch(`${API_BASE}/api/documents`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        setStatus('Upload successful!');
      } else {
        setStatus('Upload failed.');
      }
    } catch (error) {
      console.error(error);
      setStatus('An error occurred during upload.');
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Upload Startup Documents</h2>
      <input type="file" onChange={handleFileChange} className="mb-2" />
      <button onClick={handleUpload} className="bg-blue-600 text-white px-4 py-2 rounded">
        Upload
      </button>
      <p className="mt-2 text-sm text-gray-700">{status}</p>
    </div>
  );
};

export default UploadDocuments;
