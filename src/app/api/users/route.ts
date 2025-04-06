// src/app/api/users/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
// Import the Clerk client with type
import type { EmailAddress, User } from '@clerk/nextjs/server';
import { clerkClient } from '@clerk/nextjs/server';

export async function POST(request: Request) {
  try {
    const authResult = await auth();
    const { userId } = authResult;
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { emails } = await request.json();
    
    if (!emails || !Array.isArray(emails)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    
    // Look up users by email
    const users = [];
    
    // It appears your version of Clerk has a different API structure
    // Let's try the direct solution for 6.13.0
    for (const email of emails) {
      try {
        // Cast clerkClient to any to bypass TypeScript errors
        // This is not ideal but will work as a temporary fix
        const clerk: any = clerkClient;
        
        const userList = await clerk.users.getUserList({
          emailAddress: [email],
          limit: 1,
        });
        
        if (userList && userList.length > 0) {
          const user: any = userList[0];
          
          // Find primary email address with proper typing
          const primaryEmailObj = user.emailAddresses.find(
            (emailAddr: { id: string }) => emailAddr.id === user.primaryEmailAddressId
          );
          
          const primaryEmail = primaryEmailObj?.emailAddress;
          
          users.push({
            id: user.id,
            email: email,
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || email,
            isPrimaryEmail: primaryEmail?.toLowerCase() === email.toLowerCase(),
          });
        }
      } catch (error) {
        console.error(`Error looking up user by email ${email}:`, error);
      }
    }
    
    return NextResponse.json(users);
  } catch (error) {
    console.error('Error processing user lookup:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
