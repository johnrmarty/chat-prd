// src/app/api/projects/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import clientPromise from '@/lib/mongodb';
import { getAuth, clerkClient } from '@clerk/nextjs/server';

// Helper function to check if user is admin
const isAdmin = (userId: string) => {
  const adminIds = process.env.ADMIN_USER_IDS?.split(',') || [];
  return adminIds.includes(userId);
};

export async function GET(request: Request) {
  try {
    const authResult = await auth();
    const { userId } = authResult;
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if this is an admin requesting all projects
    const url = new URL(request.url);
    const showAll = url.searchParams.get('all') === 'true' && isAdmin(userId);
    
    // Get user's email to query for email-based invitations
    const userEmail = url.searchParams.get('email');
    
    const client = await clientPromise;
    const db = client.db('product-discovery');
    
    let projects;
    
    if (showAll) {
      // Admin view - get all projects
      projects = await db.collection('projects').find({})
        .sort({ updatedAt: -1 }).toArray();
    } else {
      // Query conditions
      const query: any = {
        $or: [
          { createdBy: userId },  // Projects they created
          { participants: userId } // Projects they're invited to by userId
        ]
      };
      
      // Add email to query if provided
      if (userEmail) {
        query.$or.push({ participants: userEmail }); // Projects they're invited to by email
      }
      
      // Regular user view - get only their projects
      projects = await db.collection('projects').find(query)
        .sort({ updatedAt: -1 }).toArray();
    }
    
    return NextResponse.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await auth();
    const { userId } = authResult;
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { name, description, projectType, participants } = body;
    
    if (!name || !description || !projectType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Get current user's email
    let userEmail: string | null = null;
    try {
      // Typed as any to avoid the TS error about users property
      const clerk: any = clerkClient;
      const user = await clerk.users.getUser(userId);
      
      // Find primary email
      const primaryEmailObj = user.emailAddresses.find(
        (email: any) => email.id === user.primaryEmailAddressId
      );
      
      if (primaryEmailObj) {
        userEmail = primaryEmailObj.emailAddress;
      }
    } catch (error) {
      console.error('Error fetching user email:', error);
      // Continue without email if fetch fails
    }
    
    // Process participants: try to convert emails to userIds when possible
    let participantsList: string[] = [];
    
    if (participants && Array.isArray(participants) && participants.length > 0) {
      // Filter valid emails
      const participantEmails = participants.filter((p: string) => 
        typeof p === 'string' && p.includes('@')
      );
      
      // Add all participants as is for now (we'll look up IDs in a future enhancement)
      participantsList = participantEmails;
      
      // Here we could add code to look up userIds for these emails
      // For now, we'll just use the emails directly
    }
    
    const client = await clientPromise;
    const db = client.db('product-discovery');
    
    const project = {
      name,
      description,
      projectType,
      createdBy: userId,
      creatorEmail: userEmail, // Store creator's email
      createdAt: new Date(),
      updatedAt: new Date(),
      participants: participantsList,
      currentMode: 'problem-discovery',
      status: 'in-progress',
    };
    
    const result = await db.collection('projects').insertOne(project);
    
    return NextResponse.json({
      _id: result.insertedId,
      ...project
    });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}
