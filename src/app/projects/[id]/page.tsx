// src/app/projects/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import ProjectInvite from '@/components/ProjectInvite';

interface Project {
  _id: string;
  name: string;
  description: string;
  projectType: string;
  createdBy: string;
  creatorEmail?: string;
  createdAt: string;
  updatedAt: string;
  participants: string[];
  currentMode: 'problem-discovery' | 'solution-workshop';
  status: 'in-progress' | 'completed';
  problemStatement?: string;
  currentStateSummary?: string;
  solutionProposal?: string;
  implementationRoadmap?: string;
}

interface Participant {
  id: string;
  email?: string;
  displayName: string;
  isEmail: boolean;
}

export default function ProjectDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const { isSignedIn, user } = useUser();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formattedParticipants, setFormattedParticipants] = useState<Participant[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  
  // Define isAdmin helper function
  const isAdmin = (userId: string) => {
    const adminIds = process.env.NEXT_PUBLIC_ADMIN_USER_IDS?.split(',') || [];
    return adminIds.includes(userId);
  };
  
  // Check if current user is an admin
  const userIsAdmin = user ? isAdmin(user.id) : false;

  // Format project participants for display
  const formatParticipants = async (participants: string[]) => {
    if (!participants || participants.length === 0) return [];
    
    const formatted: Participant[] = participants.map(participant => {
      // Check if participant is an email or userId
      const isEmail = participant.includes('@');
      
      return {
        id: participant,
        displayName: isEmail ? participant : participant.substring(0, 8) + '...',
        isEmail
      };
    });
    
    return formatted;
  };

  useEffect(() => {
    if (!isSignedIn) return;

    const fetchProject = async () => {
      try {
        const response = await fetch(`/api/projects/${id}`);
        if (response.ok) {
          const data = await response.json();
          setProject(data);
          
          // Format the participants
          const formatted = await formatParticipants(data.participants || []);
          setFormattedParticipants(formatted);
        } else {
          setError('Failed to load project');
          console.error('Error fetching project:', await response.text());
        }
      } catch (err) {
        setError('An unexpected error occurred');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [id, isSignedIn]);

  // Function to refresh project data after inviting someone
  const refreshProject = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/projects/${id}`);
      if (response.ok) {
        const data = await response.json();
        setProject(data);
        
        // Format the participants
        const formatted = await formatParticipants(data.participants || []);
        setFormattedParticipants(formatted);
      }
    } catch (err) {
      console.error('Error refreshing project:', err);
    } finally {
      setLoading(false);
      setShowInviteModal(false); // Close modal after refresh
    }
  };

  if (!isSignedIn) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p>Please sign in to view this project.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
        <p className="ml-2">Loading project...</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
          <p className="text-red-700">{error || 'Project not found'}</p>
        </div>
        <Link 
          href="/projects"
          className="text-blue-600 hover:text-blue-800"
        >
          ← Back to Projects
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link 
          href="/projects"
          className="text-blue-600 hover:text-blue-800 mb-4 inline-block"
        >
          ← Back to Projects
        </Link>
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
          <div className="flex items-center gap-2">
            {(user?.id === project.createdBy || userIsAdmin) && (
              <button 
                className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1.5 rounded text-sm"
                onClick={() => setShowInviteModal(true)}
              >
                Invite
              </button>
            )}
            <button className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1.5 rounded text-sm">
              Export
            </button>
          </div>
        </div>
        <p className="text-gray-600 mt-2">{project.description}</p>
      </div>
  
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-4 py-5 border-b border-gray-200 bg-gray-50">
            <h3 className="text-lg font-medium text-gray-900">Project Details</h3>
          </div>
          <div className="px-4 py-5">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-6">
              <div>
                <dt className="text-sm font-medium text-gray-500">Type</dt>
                <dd className="mt-1 text-sm text-gray-900 capitalize">{project.projectType.replace('-', ' ')}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1 text-sm text-gray-900 capitalize">{project.status.replace('-', ' ')}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Current Mode</dt>
                <dd className="mt-1 text-sm text-gray-900 capitalize">{project.currentMode.replace('-', ' ')}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Created</dt>
                <dd className="mt-1 text-sm text-gray-900">{new Date(project.createdAt).toLocaleDateString()}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                <dd className="mt-1 text-sm text-gray-900">{new Date(project.updatedAt).toLocaleDateString()}</dd>
              </div>
            </dl>
          </div>
        </div>
  
        <div className="bg-white rounded-lg shadow overflow-hidden md:col-span-2">
          <div className="px-4 py-5 border-b border-gray-200 bg-gray-50">
            <h3 className="text-lg font-medium text-gray-900">Work Space</h3>
          </div>
          <div className="px-4 py-5 space-y-6">
            <div>
              <p className="text-gray-700 mb-2">
                Identify and analyze the core problems that need to be solved.
              </p>
              <button 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-medium"
                onClick={() => router.push(`/projects/${id}/problem-discovery`)}
              >
                Launch Problem Discovery
              </button>
            </div>
            
            <div>
              <p className="text-gray-700 mb-2">
                Develop solutions for the identified problems and generate implementation roadmaps.
              </p>
              <button 
                className={`w-full py-2 rounded font-medium ${
                  project.problemStatement 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
                onClick={() => {
                  if (project.problemStatement) {
                    router.push(`/projects/${id}/solution-workshop`);
                  }
                }}
                disabled={!project.problemStatement}
                title={!project.problemStatement ? "Complete Problem Discovery first" : ""}
              >
                Launch Solution Workshop
              </button>
            </div>
          </div>
        </div>
      </div>
  
      {/* Collaborators section */}
      <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
        <div className="px-4 py-5 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-medium text-gray-900">Collaborators</h3>
        </div>
        <div className="px-4 py-5">
          {/* Show current collaborators */}
          {formattedParticipants.length > 0 ? (
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">Project Team</h4>
              <ul className="space-y-2">
                {formattedParticipants.map((participant, index) => (
                  <li key={index} className="text-sm text-gray-800 flex items-center">
                    <span className={`inline-block w-2 h-2 rounded-full mr-2 ${participant.isEmail ? 'bg-yellow-400' : 'bg-green-500'}`}></span>
                    {participant.displayName}
                    {project.createdBy === participant.id && <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">Owner</span>}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No collaborators yet.</p>
          )}
          
          {/* Invite button (only for owner/admin) */}
          {(user?.id === project.createdBy || userIsAdmin) && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="mt-4 bg-blue-100 hover:bg-blue-200 text-blue-800 px-4 py-2 rounded-md text-sm font-medium"
            >
              + Invite Collaborators
            </button>
          )}
        </div>
      </div>
  
      {/* Invite Modal - only show when open and the user has permission */}
      {showInviteModal && (user?.id === project.createdBy || userIsAdmin) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">Invite Collaborators</h3>
            <ProjectInvite 
                projectId={id} 
                onInviteSuccess={refreshProject}  // Use existing prop
                onCancel={() => setShowInviteModal(false)}
            />
            </div>
        </div>
        )}
  
      {/* Project content sections */}
      <div className="space-y-6">
        {project.problemStatement && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-4 py-5 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-medium text-gray-900">Problem Statement</h3>
            </div>
            <div className="px-4 py-5">
              <p className="text-gray-700">{project.problemStatement}</p>
            </div>
          </div>
        )}
  
        {project.currentStateSummary && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-4 py-5 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-medium text-gray-900">Current State Summary</h3>
            </div>
            <div className="px-4 py-5">
              <p className="text-gray-700">{project.currentStateSummary}</p>
            </div>
          </div>
        )}
  
        {project.solutionProposal && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-4 py-5 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-medium text-gray-900">Solution Proposal</h3>
            </div>
            <div className="px-4 py-5">
              <p className="text-gray-700">{project.solutionProposal}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );  
}
