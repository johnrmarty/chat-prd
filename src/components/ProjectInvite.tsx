// src/components/ProjectInvite.tsx
'use client';

import { useState } from 'react';

interface ProjectInviteProps {
  projectId: string;
  onInviteSuccess?: () => void;
  onSuccess?: () => void;  // Add this to match the prop name in the page
  onCancel?: () => void;   // Add this to match the prop name in the page
}

export default function ProjectInvite({ 
  projectId, 
  onInviteSuccess, 
  onSuccess,
  onCancel 
}: ProjectInviteProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const response = await fetch(`/api/projects/${projectId}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });
      
      if (response.ok) {
        setSuccess(`Invitation sent to ${email}`);
        setEmail('');
        // Call both success callbacks if provided
        if (onInviteSuccess) onInviteSuccess();
        if (onSuccess) onSuccess();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to send invitation');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="mt-4">
      <h3 className="text-lg font-medium text-gray-900 mb-2">Invite Collaborator</h3>
      <form onSubmit={handleInvite} className="flex items-center">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter email address"
          className="flex-1 border border-gray-300 rounded-l-md py-2 px-4 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={loading}
          required
        />
        <button
          type="submit"
          disabled={loading || !email.trim()}
          className={`bg-blue-600 text-white px-4 py-2 rounded-r-md ${
            loading || !email.trim() ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'
          }`}
        >
          {loading ? 'Sending...' : 'Invite'}
        </button>
      </form>
      {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
      {success && <p className="text-sm text-green-600 mt-1">{success}</p>}
      
      {/* Add Cancel button if onCancel prop is provided */}
      {onCancel && (
        <button
          onClick={onCancel}
          className="mt-3 text-sm text-gray-600 hover:text-gray-800"
        >
          Cancel
        </button>
      )}
    </div>
  );
}
