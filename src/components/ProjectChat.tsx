// src/components/ProjectChat.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useSocket } from '@/hooks/useSocket';

interface SafeMessage {
  role?: string;
  content?: string;
  timestamp?: string;
  senderName?: string;
}

interface ProjectChatProps {
  projectId: string;
}

export default function ProjectChat({ projectId }: ProjectChatProps) {
  const [input, setInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [chatMessages, setChatMessages] = useState<SafeMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  
  const { isConnected, on, off, sendMessage } = useSocket(projectId);

  // Set up message listener
  useEffect(() => {
    const handleMessageReceived = (message: SafeMessage) => {
      console.log('Message received in component:', message);
      
      // Already preprocessed by the server, just add to state
      setChatMessages(prev => [...prev, message]);
    };
    
    on('message-received', handleMessageReceived);
    
    return () => off('message-received');
  }, [on, off]);
  
  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);
  
  // Send message handler
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() || !isConnected || isLoading) return;
    
    const message = input.trim();
    setInput('');
    setIsLoading(true);
    
    // Send user message
    sendMessage({
      projectId,
      message: {
        role: 'user',
        content: message,
        sender: 'You' // Simple string, will be converted to senderName by server
      }
    });
    
    try {
      // Get AI response
      const response = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, projectId }),
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Send AI response
        sendMessage({
          projectId,
          message: {
            role: 'assistant',
            content: data.response,
            sender: 'AI Assistant' // Simple string, will be converted to senderName by server
          }
        });
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Format timestamp
  const formatTime = (timestamp?: string): string => {
    if (!timestamp) return '';
    
    try {
      return new Date(timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return '';
    }
  };

  return (
    <div className="flex flex-col h-full border rounded-lg overflow-hidden bg-white">
      <div className="p-3 border-b bg-gray-50">
        <h3 className="font-medium">Project Chat</h3>
        {!isConnected && <div className="text-xs text-red-500">Disconnected</div>}
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {chatMessages.length === 0 ? (
          <div className="text-center text-gray-500 py-10">
            No messages yet. Start the conversation!
          </div>
        ) : (
          chatMessages.map((msg, i) => (
            <div 
              key={i} 
              className={`flex ${msg.role === 'assistant' ? 'justify-start' : 'justify-end'}`}
            >
              <div 
                className={`max-w-[75%] rounded-lg p-3 ${
                  msg.role === 'assistant' 
                    ? 'bg-blue-50 text-blue-800'
                    : 'bg-blue-500 text-white'
                }`}
              >
                {msg.role === 'assistant' && (
                  <div className="text-xs font-medium mb-1">
                    {msg.senderName || 'AI Assistant'}
                  </div>
                )}
                
                <div className="text-sm whitespace-pre-wrap">
                  {msg.content || ''}
                </div>
                
                <div className="text-right text-xs mt-1 opacity-70">
                  {formatTime(msg.timestamp)}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="border-t p-3">
        <form onSubmit={handleSendMessage} className="flex items-end space-x-2">
          <input
            type="text"
            className="flex-1 border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Type your message..."
            value={input}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
            disabled={!isConnected || isLoading}
          />
          <button
            type="submit"
            disabled={!isConnected || !input.trim() || isLoading}
            className={`px-4 py-2 rounded-lg ${
              !isConnected || !input.trim() || isLoading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
}
