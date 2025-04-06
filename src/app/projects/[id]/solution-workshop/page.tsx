// src/app/projects/[id]/solution-workshop/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSocket } from '@/hooks/useSocket';
import PrdExport from '@/components/PrdExport';
import { toast } from 'react-hot-toast';
import UserPresence from '@/components/UserPresence';

// Define a proper type for the role field
type MessageRole = 'user' | 'assistant' | 'system';

interface Project {
  _id: string;
  name: string;
  description: string;
  problemStatement?: string;
  currentStateSummary?: string;
  solutionProposal?: string;
  implementationRoadmap?: string;
}

interface Message {
  role: MessageRole;
  content: string;
  sender?: string;
  timestamp?: Date;
}

export default function SolutionWorkshopPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Get socket functions
  const { isConnected, sendMessage, startGeneratingContent, contentGenerated, on, off } = useSocket(id as string);
  
  // Set up socket event listeners
  useEffect(() => {
    if (isConnected) {
      // Listen for messages from other users
      on('message-received', (message: Message) => {
        if (message.sender !== 'You') {
          setMessages(prevMessages => [...prevMessages, message]);
          toast(`New message from ${message.sender || 'collaborator'}`);
        }
      });
      
      // Listen for content generation notifications
      on('content-generation-started', (data: { contentType: string }) => {
        toast(`A collaborator is generating ${data.contentType}...`, {
          icon: '⏳',
        });
      });
      
      // Listen for completed content
      on('content-generation-completed', (data: { contentType: string, content: string }) => {
        if (data.contentType === 'solution-proposal') {
          setProject(prev => prev ? {...prev, solutionProposal: data.content} : null);
          toast.success('Solution proposal has been updated');
        } else if (data.contentType === 'implementation-roadmap') {
          setProject(prev => prev ? {...prev, implementationRoadmap: data.content} : null);
          toast.success('Implementation roadmap has been updated');
        }
      });
    }
    
    return () => {
      // Clean up listeners
      off('message-received');
      off('content-generation-started');
      off('content-generation-completed');
    };
  }, [isConnected, on, off]);
  
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
              content: 'Solution Workshop session started. I\'ll help you develop solutions based on the problem statement.',
              timestamp: new Date()
            }
          ];
          
          // Add problem statement if it exists
          if (data.problemStatement) {
            initialMessages.push({
              role: 'assistant',
              content: `Problem Statement: ${data.problemStatement}`,
              timestamp: new Date()
            });
          } else {
            initialMessages.push({
              role: 'assistant',
              content: 'No problem statement found. It\'s recommended to complete the Problem Discovery phase first to clearly define the problem.',
              timestamp: new Date()
            });
          }
          
          // Add solution proposal if it exists
          if (data.solutionProposal) {
            initialMessages.push({
              role: 'assistant',
              content: `Current Solution Proposal: ${data.solutionProposal}`,
              timestamp: new Date()
            });
          }
          
          // Add implementation roadmap if it exists
          if (data.implementationRoadmap) {
            initialMessages.push({
              role: 'assistant',
              content: `Implementation Roadmap: ${data.implementationRoadmap}`,
              timestamp: new Date()
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
      sender: 'You',
      timestamp: new Date()
    };
    
    // Add message to local state
    setMessages(prevMessages => [...prevMessages, userMessage]);
    
    // Send message to collaborators
    if (isConnected) {
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
          mode: 'solution-workshop'
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        
        const aiResponse: Message = {
          role: 'assistant',
          content: data.response || "I'm analyzing your input. Please provide more details about your solution ideas.",
          timestamp: new Date()
        };
        
        // Add AI response to local state
        setMessages(prevMessages => [...prevMessages, aiResponse]);
        
        // Send to collaborators
        if (isConnected) {
          sendMessage(aiResponse);
        }
      } else {
        // Handle error
        const errorMessage: Message = {
          role: 'assistant',
          content: "I'm sorry, I encountered an error processing your request. Please try again.",
          timestamp: new Date()
        };
        
        setMessages(prevMessages => [...prevMessages, errorMessage]);
        
        if (isConnected) {
          sendMessage(errorMessage);
        }
      }
    } catch (error) {
      console.error('Error:', error);
      
      // Fallback response
      setTimeout(() => {
        const fallbackResponse: Message = {
          role: 'assistant',
          content: "Thank you for sharing your solution idea. Based on what you've described, this could significantly improve the user experience. Would you like me to elaborate on implementation approaches or help refine the concept further?",
          timestamp: new Date()
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
  
  const handleGenerateSolutionProposal = async () => {
    setIsProcessing(true);
    
    // Notify collaborators
    if (isConnected) {
      startGeneratingContent('solution-proposal');
    }
    
    try {
      setTimeout(() => {
        const solutionProposal = "Implement a single-page progressive checkout with real-time validation, animated transitions, and smart defaults. The solution reduces the 5-step process to a single scrollable interface with auto-save and form recovery. Key features include address auto-completion, skeleton loading placeholders, and biometric payment confirmation.";
        
        // Update the project on the server
        fetch(`/api/projects/${id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            solutionProposal: solutionProposal
          })
        });
        
        // Update local state
        setProject(prev => prev ? {...prev, solutionProposal: solutionProposal} : null);
        
        // Add message about the generated solution
        const solutionMessage: Message = {
          role: 'assistant',
          content: `I've generated a solution proposal: ${solutionProposal}`,
          timestamp: new Date()
        };
        
        setMessages(prevMessages => [...prevMessages, solutionMessage]);
        
        // Notify collaborators
        if (isConnected) {
          contentGenerated('solution-proposal', solutionProposal);
          sendMessage(solutionMessage);
        }
      }, 1500);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleGenerateImplementationRoadmap = async () => {
    setIsProcessing(true);
    
    // Notify collaborators
    if (isConnected) {
      startGeneratingContent('implementation-roadmap');
    }
    
    try {
      setTimeout(() => {
        const implementationRoadmap = `
Phase 1 (2 weeks): Design & Foundation
- UI/UX wireframes and mockups
- Component architecture setup
- Backend API specifications

Phase 2 (3 weeks): Core Functionality
- Progressive form implementation
- Real-time validation
- Address auto-completion integration

Phase 3 (2 weeks): Enhanced Features
- Payment processing integration
- Smart defaults and personalization
- Performance optimization

Phase 4 (1 week): Testing & Refinement
- User acceptance testing
- A/B testing setup
- Analytics implementation

Phase 5 (Ongoing): Launch & Iteration
- Phased rollout to users
- Metric monitoring
- Continuous improvement`;
        
        // Update the project on the server
        fetch(`/api/projects/${id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            implementationRoadmap: implementationRoadmap
          })
        });
        
        // Update local state
        setProject(prev => prev ? {...prev, implementationRoadmap: implementationRoadmap} : null);
        
        // Add message about the generated roadmap
        const roadmapMessage: Message = {
          role: 'assistant',
          content: `I've generated an implementation roadmap: ${implementationRoadmap}`,
          timestamp: new Date()
        };
        
        setMessages(prevMessages => [...prevMessages, roadmapMessage]);
        
        // Notify collaborators
        if (isConnected) {
          contentGenerated('implementation-roadmap', implementationRoadmap);
          sendMessage(roadmapMessage);
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
        <p className="ml-2">Loading solution workshop...</p>
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
            <h1 className="text-xl font-semibold text-gray-900 mr-4">{project.name} - Solution Workshop</h1>
            
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
            onClick={handleGenerateSolutionProposal}
            disabled={isProcessing}
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm rounded"
          >
            Generate Solution Proposal
          </button>
          <button 
            onClick={handleGenerateImplementationRoadmap}
            disabled={isProcessing || !project.solutionProposal}
            className={`px-3 py-1.5 text-sm rounded ${
              project.solutionProposal 
                ? 'bg-gray-100 hover:bg-gray-200 text-gray-800' 
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            Generate Roadmap
          </button>
          <PrdExport
            projectId={id as string}
            disabled={isProcessing || !project.implementationRoadmap}
          />
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
                        {message.timestamp.toLocaleTimeString ? message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (new Date(message.timestamp)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                placeholder="Describe your solution ideas or ask questions..."
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
          
          {project.problemStatement && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Problem Statement</h3>
              <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded border border-gray-200">
                {project.problemStatement}
              </p>
            </div>
          )}
          
          {project.solutionProposal && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Solution Proposal</h3>
              <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded border border-gray-200">
                {project.solutionProposal}
              </p>
            </div>
          )}
          
          {project.implementationRoadmap && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Implementation Roadmap</h3>
              <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded border border-gray-200 whitespace-pre-line">
                {project.implementationRoadmap}
              </p>
            </div>
          )}
          
          {(!project.solutionProposal && !project.implementationRoadmap) && (
            <p className="text-sm text-gray-500">
              Start discussing solution ideas with the AI assistant to generate proposals and roadmaps.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
