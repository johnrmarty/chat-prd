export interface Project {
    _id?: string;
    name: string;
    description: string;
    projectType: 'new-application' | 'enhancement' | 'process-improvement';
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
    participants: string[];
    currentMode: 'problem-discovery' | 'solution-workshop';
    status: 'in-progress' | 'completed';
    problemStatement?: string;
    currentStateSummary?: string;
    solutionProposal?: string;
    implementationRoadmap?: string;
  }
  