import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET() {
  try {
    const client = await clientPromise;
    
    // Attempt to connect and perform a simple operation
    const db = client.db("product-discovery");
    const collections = await db.listCollections().toArray();
    
    return NextResponse.json({ 
      status: 'connected', 
      message: 'Successfully connected to MongoDB',
      collections: collections.map(col => col.name)
    });
  } catch (error) {
    console.error('MongoDB connection error:', error);
    return NextResponse.json({ 
      status: 'error', 
      message: 'Failed to connect to MongoDB',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
