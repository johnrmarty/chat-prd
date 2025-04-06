// src/server/socket.ts
import { Server as SocketIOServer } from 'socket.io';
import type { Server as HTTPServer } from 'http';
import type { NextApiRequest, NextApiResponse } from 'next';
import type { Socket as NetSocket } from 'net';

export const config = {
  api: {
    bodyParser: false,
  },
};

interface SocketServer extends HTTPServer {
  io?: SocketIOServer | undefined;
}

interface SocketWithIO extends NetSocket {
  server: SocketServer;
}

interface NextApiResponseWithSocket extends NextApiResponse {
  socket: SocketWithIO;
}

// This function is called by our API endpoint to setup the socket server
export const setupSocketServer = (req: NextApiRequest, res: NextApiResponseWithSocket) => {
  // If socket.io server is already running, return it
  if (res.socket.server.io) {
    console.log('Socket.io server already running');
    return res.socket.server.io;
  }

  console.log('Setting up socket.io server...');
  const io = new SocketIOServer(res.socket.server);
  res.socket.server.io = io;

  // Socket.io server events
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Join a project room
    socket.on('join-project', (projectId: string) => {
      console.log(`Socket ${socket.id} joining project room:`, projectId);
      socket.join(`project:${projectId}`);
    });

    // Handle new messages
    socket.on('new-message', (data: { projectId: string; message: any }) => {
      console.log('New message received:', data);
      // Broadcast to all clients in the project room except sender
      socket.to(`project:${data.projectId}`).emit('message-received', data.message);
    });

    // Handle when someone is generating content
    socket.on('generating-content', (data: { projectId: string; contentType: string }) => {
      console.log('Content generation started:', data);
      socket.to(`project:${data.projectId}`).emit('content-generation-started', data);
    });

    // Handle when content has been generated
    socket.on('content-generated', (data: { projectId: string; contentType: string; content: string }) => {
      console.log('Content generation completed:', data.contentType);
      socket.to(`project:${data.projectId}`).emit('content-generation-completed', data);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  return io;
};
