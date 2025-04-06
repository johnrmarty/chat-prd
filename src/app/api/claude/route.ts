// src/app/api/claude/route.ts
import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// Initialize the Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY || '',
});

// Define the proper types for messages
interface ApiMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface RequestMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  sender?: string;
  timestamp?: Date;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { projectId, messages, mode } = body;
    
    // Format messages for Claude with proper typing
    const formattedMessages: ApiMessage[] = messages.map((m: RequestMessage) => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content
    }));
    
    // Add a system prompt based on the mode
    let systemPrompt;
    if (mode === 'problem-discovery') {
      systemPrompt = "You are an expert product manager specialized in helping teams discover and articulate problems. Help the user analyze their current situation, identify pain points, and develop clear problem statements.";
    } else if (mode === 'solution-workshop') {
      systemPrompt = "You are an expert product manager specialized in developing innovative solutions. Help the user brainstorm and refine solutions to their problem, focusing on user needs and technical feasibility.";
    } else {
      systemPrompt = "You are a helpful product management assistant.";
    }
    
    // Call Claude API
    const response = await anthropic.messages.create({
      model: "claude-3-opus-20240229",
      system: systemPrompt,
      messages: formattedMessages,
      max_tokens: 1000,
    });
    
    // Safely extract the response text
    let responseText = "";
    if (response.content && response.content.length > 0) {
      const firstContent = response.content[0];
      if (firstContent.type === 'text') {
        responseText = firstContent.text;
      }
    }
    
    return NextResponse.json({ 
      response: responseText 
    });
  } catch (error) {
    console.error('Error processing Claude request:', error);
    return NextResponse.json({ 
      error: 'Failed to process request',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
