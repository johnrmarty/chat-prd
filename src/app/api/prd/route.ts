import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import clientPromise from '@/lib/mongodb';
import Anthropic from '@anthropic-ai/sdk';

// Initialize the Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY || '',
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { projectId } = body;
    
    // Fetch the project data
    const client = await clientPromise;
    const db = client.db('product-discovery');
    
    const project = await db.collection('projects').findOne({
      _id: new ObjectId(projectId)
    });
    
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    
    // Create a prompt for Claude to generate the PRD
    const prompt = `
    Please create a comprehensive Product Requirements Document (PRD) based on the following project information:
    
    Project Name: ${project.name}
    Project Description: ${project.description}
    Problem Statement: ${project.problemStatement || 'Not specified'}
    Current State Summary: ${project.currentStateSummary || 'Not specified'}
    Solution Proposal: ${project.solutionProposal || 'Not specified'}
    Implementation Roadmap: ${project.implementationRoadmap || 'Not specified'}
    
    The PRD should include the following sections:
    1. Executive Summary
    2. Problem Background
    3. User Personas & Use Cases
    4. Solution Overview
    5. Functional Requirements
    6. Technical Requirements
    7. User Interface & Experience
    8. Success Metrics
    9. Implementation Timeline
    10. Risks & Mitigations
    
    Format the document professionally with appropriate Markdown formatting.
    `;
    
    const response = await anthropic.messages.create({
      model: "claude-3-opus-20240229",
      system: "You are an expert product manager specialized in creating detailed, professional Product Requirements Documents (PRDs).",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 4000,
    });
    
    let prdContent = "";
    if (response.content && response.content.length > 0) {
      const firstContent = response.content[0];
      if (firstContent.type === 'text') {
        prdContent = firstContent.text;
      }
    }
    
    // Update the project with the PRD
    await db.collection('projects').updateOne(
      { _id: new ObjectId(projectId) },
      { 
        $set: { 
          prd: prdContent,
          updatedAt: new Date() 
        } 
      }
    );
    
    return NextResponse.json({ 
      success: true,
      prd: prdContent
    });
  } catch (error) {
    console.error('Error generating PRD:', error);
    return NextResponse.json({ 
      error: 'Failed to generate PRD',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
