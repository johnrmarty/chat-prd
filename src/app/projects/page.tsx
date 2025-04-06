'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';

interface Owner {
  id: string;
  name: string;
}

interface Project {
  _id: string;
  name: string;
  description: string;
  projectType: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  participants: string[];
  currentMode: 'problem-discovery' | 'solution-workshop';
  status: 'in-progress' | 'completed';
  ownerName?: string; // Added for display purposes
}

// Helper function to check if user is admin
const isAdmin = (userId: string) => {
  const adminIds = process.env.NEXT_PUBLIC_ADMIN_USER_IDS?.split(',') || [];
  return adminIds.includes(userId);
};

export default function ProjectsPage() {
  const { isSignedIn, user } = useUser();
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'my-projects' | 'all-projects'>('my-projects');
  const [selectedOwner, setSelectedOwner] = useState<string | null>(null);
  const [projectOwners, setProjectOwners] = useState<Owner[]>([]);
  
  // Check if user is admin
  const userIsAdmin = user ? isAdmin(user.id) : false;

  // Function to fetch project owner names (simplified version)
  const fetchOwnerNames = async (ownerIds: string[]): Promise<Owner[]> => {
    // In a real implementation, you would make an API call to get user details
    // For simplicity, we'll just return placeholder names
    return ownerIds.map(id => ({
      id,
      name: id === user?.id ? `${user.firstName} ${user.lastName} (You)` : `User ${id.substring(0, 5)}`
    }));
  };
  
  useEffect(() => {
    // Only fetch projects if the user is signed in
    if (isSignedIn) {
      fetchProjects();
    }
  }, [isSignedIn, viewMode, selectedOwner]);

// Updated fetchProjects function
const fetchProjects = async () => {
    try {
      if (!isSignedIn || !user) {
        setLoading(false);
        return;
      }
      
      // Get user's email for email-based invitations
      const primaryEmail = user.primaryEmailAddress?.emailAddress;
      
      // For admins viewing all projects, use a different parameter
      let endpoint = userIsAdmin && viewMode === 'all-projects' 
        ? '/api/projects?all=true' 
        : '/api/projects';
      
      // Add email parameter to find projects where user is invited by email
      if (primaryEmail) {
        endpoint += endpoint.includes('?') 
          ? `&email=${encodeURIComponent(primaryEmail)}` 
          : `?email=${encodeURIComponent(primaryEmail)}`;
      }
      
      const response = await fetch(endpoint);
      
      if (response.ok) {
        const data = await response.json();
        
        // Process the projects data
        setProjects(data);
        
        // Extract unique project owners for filtering
        if (userIsAdmin) {
          // Extract owner IDs first, then create a Set, then convert back to array
          const allOwnerIds = data.map((p: Project) => p.createdBy);
          
          // Create a Set with explicit string type to remove duplicates
          const uniqueOwnerIdsSet = new Set<string>(allOwnerIds);
          
          // Convert back to array
          const ownerIds = Array.from(uniqueOwnerIdsSet);
          
          const ownersWithNames = await fetchOwnerNames(ownerIds);
          
          // Add owner names to projects for display
          const projectsWithOwnerNames = data.map((project: Project) => {
            const owner = ownersWithNames.find(o => o.id === project.createdBy);
            return {
              ...project,
              ownerName: owner ? owner.name : 'Unknown User'
            };
          });
        
          setProjects(projectsWithOwnerNames);
          
          // Apply owner filter if selected
          if (selectedOwner) {
            setFilteredProjects(projectsWithOwnerNames.filter((p: Project) => p.createdBy === selectedOwner));
          } else {
            setFilteredProjects(projectsWithOwnerNames);
          }
        } else {
          // For regular users, just show their projects
          setFilteredProjects(data);
        }
      } else {
        console.error('Error fetching projects:', await response.text());
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };
  

  if (!isSignedIn) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p>Please sign in to view your projects.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-gray-900">
          {viewMode === 'all-projects' ? 'All Projects' : 'My Projects'}
        </h2>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          {userIsAdmin && (
            <div className="flex items-center space-x-4">
              <div className="flex rounded-md shadow-sm">
                <button
                  className={`px-4 py-2 text-sm font-medium ${
                    viewMode === 'my-projects'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  } border border-gray-300 rounded-l-md`}
                  onClick={() => {
                    setViewMode('my-projects');
                    setSelectedOwner(null);
                  }}
                >
                  My Projects
                </button>
                <button
                  className={`px-4 py-2 text-sm font-medium ${
                    viewMode === 'all-projects'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  } border border-gray-300 rounded-r-md`}
                  onClick={() => setViewMode('all-projects')}
                >
                  All Projects
                </button>
              </div>
              
              {viewMode === 'all-projects' && (
                <select
                  className="rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 p-2"
                  value={selectedOwner || ''}
                  onChange={(e) => setSelectedOwner(e.target.value || null)}
                >
                  <option value="">All Owners</option>
                  {projectOwners.map(owner => (
                    <option key={owner.id} value={owner.id}>
                      {owner.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
          
          <Link 
            href="/projects/new"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow transition w-full sm:w-auto text-center"
          >
            + New Project
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-2 text-gray-600">Loading projects...</p>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
          <p className="text-gray-600 mb-4">Create your first project to get started</p>
          <Link 
            href="/projects/new"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow transition"
          >
            Create a Project
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <div key={project._id} className="bg-white rounded-lg shadow overflow-hidden hover:shadow-md transition">
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">{project.name}</h3>
                <p className="text-gray-600 mb-4 text-sm line-clamp-2">{project.description}</p>
                
                {userIsAdmin && viewMode === 'all-projects' && (
                  <p className="text-xs text-gray-500 mb-2">
                    Owner: {project.ownerName}
                  </p>
                )}
                
                <div className="flex justify-between text-sm text-gray-500 mb-4">
                  <span>Last active: {new Date(project.updatedAt).toLocaleDateString()}</span>
                  <span className="capitalize">{project.status.replace('-', ' ')}</span>
                </div>
                
                <div className="flex justify-between">
                  <Link 
                    href={`/projects/${project._id}`}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm transition"
                  >
                    Continue
                  </Link>
                  
                  {(user?.id === project.createdBy || userIsAdmin) && (
                    <div className="flex space-x-2">
                      <button 
                        className="text-gray-600 hover:text-gray-900 px-3 py-1.5 text-sm border border-gray-300 rounded"
                        onClick={() => {/* Implement rename functionality */}}
                      >
                        Rename
                      </button>
                      <button 
                        className="text-red-600 hover:text-red-800 px-3 py-1.5 text-sm border border-red-300 rounded"
                        onClick={() => {/* Implement delete functionality */}}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
