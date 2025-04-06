// src/pages/api/socket.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { Server as SocketIOServer } from 'socket.io';
import type { Server as HTTPServer } from 'http';
import type { Socket as NetSocket } from 'net';

// Rename the interface to avoid conflicts
interface SocketIONextApiResponse extends NextApiResponse {
  socket: NetSocket & {
    server: HTTPServer & {
      io?: SocketIOServer;
    };
  };
}

interface SessionInfo {
  userId: string;
  username: string;
  sessionId: string;
}

interface SafeMessage {
  role?: string;
  content?: string;
  timestamp?: string;
  senderName?: string;
}

// Track active users per project
const activeProjects: Record<string, Record<string, SessionInfo>> = {};

// Change function name to handler to clearly indicate it's the API handler
export default function handler(
  req: NextApiRequest,
  res: SocketIONextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  if (!res.socket.server.io) {
    console.log('Setting up socket.io server...');
    const io = new SocketIOServer(res.socket.server as any);
    res.socket.server.io = io;
    
    // Set up socket event handlers
    io.on('connection', (socket) => {
      const sessionId = socket.handshake.query.sessionId as string;
      const projectId = socket.handshake.query.projectId as string;
      
      console.log('Client connected:', socket.id, 'Session:', sessionId);

      // User joins a project
      socket.on('join-project', (data: { 
        projectId: string; 
        sessionId: string;
        userId?: string;
        username?: string;
      }) => {
        const { projectId, sessionId, userId = 'anonymous', username = 'User' } = data;
        
        console.log(`Socket ${socket.id} Session ${sessionId} joining project:`, projectId);
        socket.join(`project:${projectId}`);
        
        // Track active user in this project
        if (!activeProjects[projectId]) {
          activeProjects[projectId] = {};
        }
        
        activeProjects[projectId][sessionId] = { userId, username, sessionId };
        
        // Broadcast updated active users list to all clients in this project
        io.to(`project:${projectId}`).emit('active-users-updated', 
          Object.values(activeProjects[projectId])
        );
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id, 'Session:', sessionId);
        
        // Remove user from active projects
        if (projectId) {
          if (activeProjects[projectId] && activeProjects[projectId][sessionId]) {
            delete activeProjects[projectId][sessionId];
            
            // If no users left in project, clean up
            if (Object.keys(activeProjects[projectId]).length === 0) {
              delete activeProjects[projectId];
            } else {
              // Broadcast updated active users list
              io.to(`project:${projectId}`).emit('active-users-updated', 
                Object.values(activeProjects[projectId])
              );
            }
          }
        }
      });

      // Handle new messages with preprocessing to avoid rendering issues
      socket.on('new-message', (data: any) => {
        console.log('New message received from:', sessionId);
        
        // Get the original message
        const originalMessage = data.message || {};
        
        // Create a safe message object that can be rendered without issues
        const safeMessage: SafeMessage = {
          role: originalMessage.role || 'unknown',
          content: originalMessage.content || '',
          timestamp: originalMessage.timestamp || new Date().toISOString(),
        };
        
        // Handle sender carefully to avoid object rendering issues
        if (typeof originalMessage.sender === 'string') {
          // If sender is already a string, use it directly
          safeMessage.senderName = originalMessage.sender;
        } else if (originalMessage.sender && typeof originalMessage.sender === 'object') {
          // If sender is an object, extract username or userId
          safeMessage.senderName = originalMessage.sender.username || 
                                  originalMessage.sender.userId || 
                                  'Unknown';
        } else {
          // If no sender info, try to get from active projects
          const senderInfo = activeProjects[data.projectId]?.[sessionId];
          safeMessage.senderName = senderInfo?.username || 'User';
        }
        
        console.log('Broadcasting safe message:', safeMessage);
        
        // Broadcast the safe message to ALL clients
        io.to(`project:${data.projectId}`).emit('message-received', safeMessage);
      });
      
      socket.on('generating-content', (data) => {
        console.log('Content generation started:', data.contentType);
        io.to(`project:${data.projectId}`).emit('content-generation-started', data);
      });
      
      socket.on('content-generated', (data) => {
        console.log('Content generation completed:', data.contentType);
        io.to(`project:${data.projectId}`).emit('content-generation-completed', data);
      });
    });
  }

  res.status(200).json({ ok: true });
}
