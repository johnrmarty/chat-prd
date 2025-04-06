// src/app/api/projects/[id]/invite/route.ts
import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import clientPromise from '@/lib/mongodb';
import { auth, clerkClient } from '@clerk/nextjs/server';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await auth();
    const { userId } = authResult;
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const id = params.id;
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
    }
    
    const { email } = await request.json();
    
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }
    
    const client = await clientPromise;
    const db = client.db('product-discovery');
    
    // First check if user can invite (is admin or project owner)
    const project = await db.collection('projects').findOne({
      _id: new ObjectId(id)
    });
    
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    
    // Check if user is admin
    const isAdmin = (process.env.ADMIN_USER_IDS || '').split(',').includes(userId);
    
    // Check if user is project owner
    const isOwner = project.createdBy === userId;
    
    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: 'Not authorized to invite users' }, { status: 403 });
    }
    
    // Check if invited user already has an account in Clerk
    let invitedUserId: string | null = null;
    try {
      // Typed as any to avoid TypeScript errors
      const clerk: any = clerkClient;
      
      // Find users with this email
      const users = await clerk.users.getUserList({
        emailAddress: [email],
        limit: 1
      });
      
      if (users && users.length > 0) {
        invitedUserId = users[0].id;
        
        // If we found a userId, check if they're already a participant
        if (
          project.participants && 
          Array.isArray(project.participants) && 
          project.participants.includes(invitedUserId)
        ) {
          return NextResponse.json({ 
            error: 'This user is already a participant' 
          }, { status: 400 });
        }
      }
    } catch (error) {
      console.error('Error looking up user in Clerk:', error);
      // Continue with just the email if Clerk lookup fails
    }
    
    // Check if email is already in the participants list
    if (
      project.participants && 
      Array.isArray(project.participants) && 
      project.participants.includes(email)
    ) {
      return NextResponse.json({ 
        error: 'This email is already a participant' 
      }, { status: 400 });
    }
    
    // Determine what to add to participants list
    const participantToAdd = invitedUserId || email;
    
    // Add participantToAdd to participants if not already included
    await db.collection('projects').updateOne(
      { _id: new ObjectId(id) },
      { 
        $addToSet: { participants: participantToAdd },
        $set: { updatedAt: new Date() }
      }
    );
    
    return NextResponse.json({ 
      success: true,
      message: `Invitation sent to ${email}`,
      addedAs: participantToAdd 
    });
  } catch (error) {
    console.error('Error inviting user:', error);
    return NextResponse.json({ 
      error: 'Failed to invite user',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
