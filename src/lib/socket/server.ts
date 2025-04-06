// src/lib/socket/server.ts
import { Server as NetServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { NextApiRequest } from 'next';
import { NextApiResponse } from 'next';

export type NextApiResponseWithSocket = NextApiResponse & {
  socket: {
    server: NetServer & {
      io?: SocketIOServer;
    };
  };
};

export const initSocketServer = (req: NextApiRequest, res: NextApiResponseWithSocket) => {
  if (!res.socket.server.io) {
    console.log('Initializing Socket.io server...');
    const io = new SocketIOServer(res.socket.server);
    
    io.on('connection', (socket) => {
      console.log(`Socket connected: ${socket.id}`);
      
      // Store user data from handshake auth (if available)
      const userId = socket.handshake.auth?.userId || null;
      const userEmail = socket.handshake.auth?.email || null;
      
      if (userId) {
        console.log(`User identified: ${userId} (${userEmail || 'unknown email'})`);
      }
      
      // Handle joining a project room
      socket.on('join-project', (projectId) => {
        socket.join(`project:${projectId}`);
        console.log(`Socket ${socket.id} joined project ${projectId}`);
        
        // Notify others that a user has joined (if we have user data)
        if (userId) {
          socket.to(`project:${projectId}`).emit('user-joined', {
            userId,
            email: userEmail,
            socketId: socket.id,
            timestamp: new Date()
          });
        }
      });
      
      // Handle user messages - this is for normal user chat messages
      socket.on('send-message', (data) => {
        console.log('Message received:', data.message.substring(0, 50) + (data.message.length > 50 ? '...' : ''));
        
        // Create an enhanced message object with metadata
        const enhancedMessage = {
          ...data.message,
          sender: {
            userId: data.userId || userId,
            email: data.userEmail || userEmail,
            socketId: socket.id
          },
          timestamp: data.timestamp || new Date(),
          messageId: data.messageId || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
        };
        
        // Important: Broadcast to ALL clients in the project room INCLUDING sender
        // This ensures everyone sees all messages
        io.to(`project:${data.projectId}`).emit('new-message', enhancedMessage);
      });
      
      // Handle AI-generated messages
      socket.on('ai-message', (data) => {
        console.log('AI message received:', data.message.substring(0, 50) + (data.message.length > 50 ? '...' : ''));
        
        // Create an enhanced AI message
        const enhancedMessage = {
          text: data.message,
          type: 'ai',
          sender: {
            userId: 'ai',
            name: 'AI Assistant'
          },
          requesterId: data.requesterId, // The user who triggered this AI response
          timestamp: new Date(),
          messageId: data.messageId || `ai_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
        };
        
        // Broadcast to ALL clients in the project room
        io.to(`project:${data.projectId}`).emit('new-message', enhancedMessage);
      });
      
      // Handle generating content
      socket.on('generate-content', (data) => {
        io.to(`project:${data.projectId}`).emit('content-generation-started', {
          type: data.contentType,
          userId: data.userId || userId
        });
      });
      
      // Handle content generated
      socket.on('content-generated', (data) => {
        io.to(`project:${data.projectId}`).emit('content-generation-completed', {
          type: data.contentType,
          content: data.content,
          generatedBy: data.userId || userId
        });
      });
      
      // Handle typing indicators
      socket.on('typing', (data) => {
        // Only broadcast typing to others in the room (not back to sender)
        socket.to(`project:${data.projectId}`).emit('user-typing', {
          userId: data.userId || userId,
          email: data.userEmail || userEmail,
          isTyping: data.isTyping
        });
      });
      
      // Handle leaving a project
      socket.on('leave-project', (projectId) => {
        socket.leave(`project:${projectId}`);
        console.log(`Socket ${socket.id} left project ${projectId}`);
        
        // Notify others that user has left (if we have user data)
        if (userId) {
          socket.to(`project:${projectId}`).emit('user-left', {
            userId,
            email: userEmail,
            socketId: socket.id,
            timestamp: new Date()
          });
        }
      });
      
      // Handle disconnections
      socket.on('disconnect', () => {
        console.log(`Socket disconnected: ${socket.id}`);
        // We could notify all rooms this socket was in
      });
    });
    
    res.socket.server.io = io;
  }
  
  return res.socket.server.io;
};
