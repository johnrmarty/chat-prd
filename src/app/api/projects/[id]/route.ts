// src/app/api/projects/[id]/route.ts
import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import clientPromise from '@/lib/mongodb';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid project ID format' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('product-discovery');
    
    const project = await db.collection('projects').findOne({
      _id: new ObjectId(id)
    });
    
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    
    return NextResponse.json(project);
  } catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch project',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid project ID format' }, { status: 400 });
    }
    
    const body = await request.json();
    
    const client = await clientPromise;
    const db = client.db('product-discovery');
    
    const result = await db.collection('projects').updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...body, updatedAt: new Date() } }
    );
    
    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    
    return NextResponse.json({ 
      success: true, 
      updated: result.modifiedCount > 0 
    });
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json({ 
      error: 'Failed to update project',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
