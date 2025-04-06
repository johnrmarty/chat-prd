// src/hooks/useSocket.ts
import { useEffect, useState, useCallback, useRef } from 'react';
import io, { Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import { useUser } from '@clerk/nextjs';

export function useSocket(projectId?: string) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  const [sessionId] = useState(() => uuidv4()); // Generate unique session ID
  const socketInitialized = useRef(false);
  const { user } = useUser();

  // Initialize socket connection
  useEffect(() => {
    if (socketInitialized.current || !projectId) return;
    
    const socketInit = async () => {
      // Ensure socket server is running
      await fetch('/api/socket');
      
      // Create socket with unique session identifier
      const socketInstance = io({
        query: {
          sessionId,
          projectId
        }
      });
      
      setSocket(socketInstance);

      socketInstance.on('connect', () => {
        console.log('Socket connected with session ID:', sessionId);
        setIsConnected(true);
        
        // Join the project room
        socketInstance.emit('join-project', {
          projectId,
          sessionId,
          userId: user?.id || 'anonymous',
          username: user?.firstName 
            ? `${user.firstName} ${user.lastName || ''}`
            : 'User'
        });
      });

      socketInstance.on('disconnect', () => {
        console.log('Socket disconnected');
        setIsConnected(false);
      });
      
      // Listen for active users updates
      socketInstance.on('active-users-updated', (users) => {
        setActiveUsers(users);
      });
      
      // Listen for incoming messages
      socketInstance.on('message-received', (message) => {
        console.log('Message received:', message);
        setMessages(prev => {
          // Avoid duplicates by checking message id
          if (message.id && prev.some(m => m.id === message.id)) {
            return prev;
          }
          return [...prev, message];
        });
      });
      
      socketInitialized.current = true;
    };

    socketInit();

    return () => {
      // Clean up socket connection on unmount
      if (socket && isConnected) {
        socket.disconnect();
        socketInitialized.current = false;
      }
    };
  }, [projectId, sessionId, user]);

  // Function to send a regular message
  const sendMessage = useCallback((message: any) => {
    if (socket && isConnected && projectId) {
      socket.emit('new-message', {
        projectId,
        message
      });
    }
  }, [socket, isConnected, projectId]);
  
  // Function to send a chat query (user message in chat)
  const sendChatQuery = useCallback((content: string) => {
    if (socket && isConnected && projectId) {
      const messageId = `query_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      socket.emit('chat-query', {
        projectId,
        content,
        messageId,
        timestamp: new Date().toISOString()
      });
      
      return messageId;
    }
    return null;
  }, [socket, isConnected, projectId]);
  
  // Function to broadcast an AI response
  const sendChatResponse = useCallback((content: string, requestedBy?: string) => {
    if (socket && isConnected && projectId) {
      const messageId = `response_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      socket.emit('chat-response', {
        projectId,
        content,
        messageId,
        requestedBy: requestedBy || user?.id || sessionId,
        timestamp: new Date().toISOString()
      });
      
      return messageId;
    }
    return null;
  }, [socket, isConnected, projectId, user, sessionId]);

  // Function to notify content generation started
  const startGeneratingContent = useCallback((contentType: string) => {
    if (socket && isConnected && projectId) {
      socket.emit('generating-content', {
        projectId,
        contentType
      });
    }
  }, [socket, isConnected, projectId]);

  // Function to notify content generation completed
  const contentGenerated = useCallback((contentType: string, content: string) => {
    if (socket && isConnected && projectId) {
      socket.emit('content-generated', {
        projectId,
        contentType,
        content
      });
    }
  }, [socket, isConnected, projectId]);

  // Function to register an event listener
  const on = useCallback((event: string, callback: (...args: any[]) => void) => {
    if (socket) {
      socket.on(event, callback);
    }
  }, [socket]);

  // Function to remove an event listener
  const off = useCallback((event: string) => {
    if (socket) {
      socket.off(event);
    }
  }, [socket]);

  return {
    socket,
    isConnected,
    sessionId,
    messages,
    activeUsers,
    sendMessage,
    sendChatQuery,    // New method for chat messages
    sendChatResponse, // New method for AI responses
    startGeneratingContent,
    contentGenerated,
    on,
    off
  };
}
