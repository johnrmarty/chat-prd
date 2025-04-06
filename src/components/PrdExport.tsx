// src/components/PrdExport.tsx
'use client';

import { useState } from 'react';
import { useSocket } from '@/hooks/useSocket';

interface PrdExportProps {
  projectId: string;
  disabled?: boolean;
}

export default function PrdExport({ projectId, disabled = false }: PrdExportProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Get socket connection for real-time collaboration
  const { isConnected, startGeneratingContent, contentGenerated } = useSocket(projectId);

  const handleGeneratePRD = async () => {
    setLoading(true);
    setError('');
    
    // Notify collaborators that PRD generation has started
    if (isConnected) {
      startGeneratingContent('prd');
    }
    
    try {
      const response = await fetch('/api/prd', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ projectId }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate PRD');
      }
      
      const data = await response.json();
      
      // Create a downloadable file
      const blob = new Blob([data.prd], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Product_Requirements_Document.md';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      // Notify collaborators that PRD generation is complete
      if (isConnected) {
        contentGenerated('prd', 'PRD document has been generated and can be downloaded.');
      }
      
    } catch (err) {
      console.error('Error generating PRD:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleGeneratePRD}
        disabled={disabled || loading}
        className={`px-3 py-1.5 text-sm rounded ${
          disabled || loading
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
      >
        {loading ? 'Generating...' : 'Generate & Download PRD'}
      </button>
      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
    </div>
  );
}
