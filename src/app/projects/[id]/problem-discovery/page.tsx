// src/app/projects/[id]/problem-discovery/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import UserPresence from '@/components/UserPresence';
import { useSocket } from '@/hooks/useSocket';
// Remove toast import for now
// import { toast } from 'react-hot-toast';

interface Project {
  _id: string;
  name: string;
  description: string;
  currentStateSummary?: string;
  problemStatement?: string;
}

// Define a proper type for the role field
type MessageRole = 'user' | 'assistant' | 'system';

interface Message {
  role: MessageRole;
  content: string;
  sender?: string;
  timestamp?: string;
}

export default function ProblemDiscoveryPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeUsers, setActiveUsers] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Add a temporary hook stub for socket functions
  
  const { isConnected, sendMessage, startGeneratingContent, contentGenerated, on, off } = useSocket(id);
  
  // Add this socket message listener
useEffect(() => {
    console.log('Setting up message listener with on function:', !!on);
    
    // Using the on function from useSocket
    on('message-received', (message: Message) => {
      console.log('Received message via socket:', message);
      
      // Avoid duplicating messages from yourself
      if (message.sender !== 'You') {
        setMessages(prev => [...prev, message]);
      }
    });
    
    // Using the on function for content generation events
    on('content-generation-started', (data: { contentType: string }) => {
      console.log('Someone is generating content:', data.contentType);
      // You could add a toast notification here
    });
    
    on('content-generation-completed', (data: { contentType: string, content: string }) => {
      console.log('Content generated:', data.contentType);
      
      // Update the project data based on what was generated
      if (data.contentType === 'current-state-summary') {
        setProject(prev => prev ? {...prev, currentStateSummary: data.content} : null);
      } else if (data.contentType === 'problem-statement') {
        setProject(prev => prev ? {...prev, problemStatement: data.content} : null);
      }
    });
    
    return () => {
      console.log('Removing socket listeners');
      off('message-received');
      off('content-generation-started');
      off('content-generation-completed');
    };
  }, [on, off]);
  

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const response = await fetch(`/api/projects/${id}`);
        if (response.ok) {
          const data = await response.json();
          setProject(data);
          
          // Initialize with system message
          const initialMessages: Message[] = [
            {
              role: 'system',
              content: 'Problem Discovery session started. Describe the current state and challenges you\'re facing.',
              timestamp: new Date().toISOString()
            }
          ];
          
          // Add current state summary if it exists
          if (data.currentStateSummary) {
            initialMessages.push({
              role: 'assistant',
              content: `Current State Summary: ${data.currentStateSummary}`,
              timestamp: new Date().toISOString()
            });
          }
          
          // Add problem statement if it exists
          if (data.problemStatement) {
            initialMessages.push({
              role: 'assistant',
              content: `Problem Statement: ${data.problemStatement}`,
              timestamp: new Date().toISOString()
            });
          }
          
          setMessages(initialMessages);
        } else {
          console.error('Failed to load project');
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProject();
  }, [id]);
  
  useEffect(() => {
    // Scroll to bottom when messages change
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;
    
    const userMessage: Message = {
      role: 'user',
      content: input,
      sender: 'You', // This would be the user's name in a real app
      timestamp: new Date().toISOString(), // Store as ISO string for consistency
    };
    
    // Add message to local state - use a proper type-safe setter
    setMessages(prevMessages => [...prevMessages, userMessage]);
    
    // Send message to other collaborators (placeholder)
    if (isConnected) {
        console.log('Broadcasting message to collaborators:', userMessage);
      sendMessage(userMessage);
    }
    
    setInput('');
    setIsProcessing(true);
    
    try {
      const response = await fetch(`/api/claude`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          projectId: id,
          messages: [...messages, userMessage],
          mode: 'problem-discovery'
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        
        const aiResponse: Message = {
          role: 'assistant',
          content: data.response || "I'm analyzing your input. Please provide more details about the problem.",
          timestamp: new Date().toISOString(),
        };
        
        // Add AI response to local state
        setMessages(prevMessages => [...prevMessages, aiResponse]);
        
        // Broadcast AI response to collaborators
        if (isConnected) {
          sendMessage(aiResponse);
        }
      } else {
        // Handle error
        const errorMessage: Message = {
          role: 'assistant',
          content: "I'm sorry, I encountered an error processing your request. Please try again.",
          timestamp: new Date().toISOString()
        };
        
        setMessages(prevMessages => [...prevMessages, errorMessage]);
        
        if (isConnected) {
          sendMessage(errorMessage);
        }
      }
    } catch (error) {
      console.error('Error:', error);
      // Fallback response for demo since we don't have Claude API integrated yet
      setTimeout(() => {
        const fallbackResponse: Message = {
          role: 'assistant',
          content: "Thank you for describing the issue. Based on what you've shared, it sounds like the main challenge is related to user experience and process efficiency. Could you tell me more about the specific pain points users are experiencing?",
          timestamp: new Date().toISOString()
        };
        
        setMessages(prevMessages => [...prevMessages, fallbackResponse]);
        
        if (isConnected) {
          sendMessage(fallbackResponse);
        }
      }, 1000);
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleGenerateSummary = async () => {
    setIsProcessing(true);
    
    // Notify collaborators that summary generation has started
    if (isConnected) {
      startGeneratingContent('current-state-summary');
    }
    
    try {
      // This is a placeholder for actual implementation
      setTimeout(() => {
        const summary = "The current checkout process has multiple pain points including a high cart abandonment rate of 38%, slow page loading times, and confusing form validation. Users must navigate through 5 separate screens to complete a purchase, leading to frustration and lost revenue.";
        
        // Update the project on the server
        fetch(`/api/projects/${id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            currentStateSummary: summary
          })
        });
        
        // Update local state
        setProject(prev => prev ? {...prev, currentStateSummary: summary} : null);
        
        // Add message about the generated summary
        const summaryMessage: Message = {
          role: 'assistant',
          content: `I've generated a current state summary: ${summary}`,
          timestamp: new Date().toISOString()
        };
        
        setMessages(prevMessages => [...prevMessages, summaryMessage]);
        
        // Notify collaborators about the generated summary
        if (isConnected) {
          contentGenerated('current-state-summary', summary);
          sendMessage(summaryMessage);
        }
      }, 1500);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleGenerateProblemStatement = async () => {
    setIsProcessing(true);
    
    // Notify collaborators that problem statement generation has started
    if (isConnected) {
      startGeneratingContent('problem-statement');
    }
    
    try {
      // This is a placeholder for actual implementation
      setTimeout(() => {
        const problemStatement = "The mobile checkout process suffers from excessive steps, unclear validation, and slow performance, resulting in a 38% cart abandonment rate and negative user feedback.";
        
        // Update the project on the server
        fetch(`/api/projects/${id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            problemStatement: problemStatement
          })
        });
        
        // Update local state
        setProject(prev => prev ? {...prev, problemStatement: problemStatement} : null);
        
        // Add message about the generated problem statement
        const statementMessage: Message = {
          role: 'assistant',
          content: `I've generated a problem statement: ${problemStatement}`,
          timestamp: new Date().toISOString()
        };
        
        setMessages(prevMessages => [...prevMessages, statementMessage]);
        
        // Notify collaborators about the generated problem statement
        if (isConnected) {
          contentGenerated('problem-statement', problemStatement);
          sendMessage(statementMessage);
        }
      }, 1500);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsProcessing(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
        <p className="ml-2">Loading problem discovery workspace...</p>
      </div>
    );
  }
  
  if (!project) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
          <p className="text-red-700">Project not found</p>
        </div>
        <Link href="/projects" className="text-blue-600 hover:text-blue-800">
          ← Back to Projects
        </Link>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="bg-white shadow-sm px-4 py-3 flex items-center justify-between">
      <div className="flex items-center">
        <Link 
            href={`/projects/${id}`}
            className="text-blue-600 hover:text-blue-800 mr-4"
        >
            ← Back to Project
        </Link>
        <h1 className="text-xl font-semibold text-gray-900 mr-4">{project.name} - Problem Discovery</h1>
        
        {/* Add the UserPresence component */}
        <UserPresence projectId={id} />
        
        {/* Connection status indicator */}
        <div className="ml-4 flex items-center">
            <span 
            className={`w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
            ></span>
            <span className="text-xs text-gray-500">
            {isConnected ? 'Connected' : 'Disconnected'}
            </span>
        </div>
    </div>

        <div className="flex items-center space-x-3">
          <button 
            onClick={handleGenerateSummary}
            disabled={isProcessing}
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm rounded"
          >
            Generate Current State Summary
          </button>
          <button 
            onClick={handleGenerateProblemStatement}
            disabled={isProcessing}
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm rounded"
          >
            Generate Problem Statement
          </button>
        </div>
      </header>
      
      {/* Main workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* Chat area */}
        <div className="flex-1 flex flex-col bg-gray-50">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div 
                  key={index} 
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-3xl rounded-lg px-4 py-2 ${
                      message.role === 'system' 
                        ? 'bg-gray-200 text-gray-700' 
                        : message.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white shadow text-gray-800'
                    }`}
                  >
                    {message.sender && (
                      <p className="text-xs mb-1 font-medium">
                        {message.sender}
                      </p>
                    )}
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    {message.timestamp && (
                        <p className="text-xs mt-1 opacity-70">
                            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>
          
          {/* Input area */}
          <div className="border-t border-gray-200 bg-white p-4">
            <form onSubmit={handleSubmit} className="flex items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Describe the current process and its challenges..."
                className="flex-1 border border-gray-300 rounded-l-md py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isProcessing}
              />
              <button
                type="submit"
                disabled={isProcessing || !input.trim()}
                className={`bg-blue-600 text-white px-4 py-2 rounded-r-md ${
                  isProcessing || !input.trim() ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'
                }`}
              >
                {isProcessing ? 'Processing...' : 'Send'}
              </button>
            </form>
          </div>
        </div>
        
        {/* Summary panel */}
        <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto p-4">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Project Insights</h2>
          
          {project.currentStateSummary && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Current State Summary</h3>
              <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded border border-gray-200">
                {project.currentStateSummary}
              </p>
            </div>
          )}
          
          {project.problemStatement && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Problem Statement</h3>
              <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded border border-gray-200">
                {project.problemStatement}
              </p>
            </div>
          )}
          
          {(!project.currentStateSummary && !project.problemStatement) && (
            <p className="text-sm text-gray-500">
              Start discussing the problem with the AI assistant to generate insights.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
