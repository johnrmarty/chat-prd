// src/contexts/SocketContext.tsx
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  joinProject: (projectId: string) => void;
  sendMessage: (projectId: string, message: any) => void;
  startGeneratingContent: (projectId: string, contentType: string) => void;
  contentGenerated: (projectId: string, contentType: string, content: string) => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  joinProject: () => {},
  sendMessage: () => {},
  startGeneratingContent: () => {},
  contentGenerated: () => {},
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Initialize socket connection
    const socketInstance = io();
    setSocket(socketInstance);

    // Set up event listeners
    socketInstance.on('connect', () => {
      setIsConnected(true);
      console.log('Socket connected');
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
      console.log('Socket disconnected');
    });

    // Clean up on unmount
    return () => {
      socketInstance.disconnect();
    };
  }, []);

  // Join a project room
  const joinProject = (projectId: string) => {
    if (socket && isConnected) {
      socket.emit('join-project', projectId);
    }
  };

  // Send a message to project room
  const sendMessage = (projectId: string, message: any) => {
    if (socket && isConnected) {
      socket.emit('new-message', { projectId, message });
    }
  };

  // Notify that content generation has started
  const startGeneratingContent = (projectId: string, contentType: string) => {
    if (socket && isConnected) {
      socket.emit('generating-content', { projectId, contentType });
    }
  };

  // Notify that content has been generated
  const contentGenerated = (projectId: string, contentType: string, content: string) => {
    if (socket && isConnected) {
      socket.emit('content-generated', { projectId, contentType, content });
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        joinProject,
        sendMessage,
        startGeneratingContent,
        contentGenerated,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};
