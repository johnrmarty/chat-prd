// src/components/UserPresence.tsx
'use client';

import { useEffect, useState } from 'react';
import { useSocket } from '@/hooks/useSocket';

interface Collaborator {
  userId: string;
  username: string;
  sessionId: string;
  isActive?: boolean;
}

export default function UserPresence({ projectId }: { projectId: string }) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const { on, off } = useSocket(projectId);

  useEffect(() => {
    // Listen for active users updates
    on('active-users-updated', (users: Collaborator[]) => {
      setCollaborators(users.map(user => ({
        ...user,
        isActive: true
      })));
    });
    
    // Clean up listener on unmount
    return () => {
      off('active-users-updated');
    };
  }, [on, off]);

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <span className="text-sm text-gray-500 mr-1">Collaborators:</span>
      {collaborators.length === 0 ? (
        <span className="text-sm text-gray-500 italic">No one else is here</span>
      ) : (
        collaborators.map((user) => (
          <div
            key={user.sessionId}
            className="flex items-center bg-gray-100 rounded-full px-3 py-1"
            title={user.isActive ? "Online" : "Offline"}
          >
            <span className={`w-2 h-2 rounded-full mr-2 ${user.isActive ? 'bg-green-500' : 'bg-gray-300'}`}></span>
            <span className="text-sm">{user.username}</span>
          </div>
        ))
      )}
    </div>
  );
}
