'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export function useSocket(projectId?: string) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Initialize socket connection
    const initSocket = async () => {
      await fetch('/api/socket'); // Initialize socket server
      
      const socketInstance = io();
      
      socketInstance.on('connect', () => {
        console.log('Socket connected');
        setIsConnected(true);
        
        // Join project room if projectId is provided
        if (projectId) {
          socketInstance.emit('join-project', projectId);
        }
      });
      
      socketInstance.on('disconnect', () => {
        console.log('Socket disconnected');
        setIsConnected(false);
      });
      
      setSocket(socketInstance);
      
      return () => {
        socketInstance.disconnect();
      };
    };
    
    initSocket();
    
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [projectId]);

  return { socket, isConnected };
}