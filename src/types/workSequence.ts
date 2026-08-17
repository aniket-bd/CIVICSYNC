import { Project, ProjectType, ProjectStatus } from './project';

export interface WorkSequenceFilter {
  primaryProjectId: string;
  allowedStatuses: ProjectStatus[];
  minDepth: number;
  maxDepth: number;
  maxDistanceMeters: number;
  startDateFrom: string;
  startDateTo: string;
  selectedTypes: ProjectType[];
  limitCount: number;
}

export type CollaborationClassification = 
  | 'Potential collaboration'
  | 'Needs engineering review'
  | 'Low relevance';

export interface WorkSequenceMatch {
  candidateProject: Project;
  distanceMeters: number;
  dateOverlapDays: number;
  depthDifferenceMeters: number;
  
  // Deterministic sub-scores (0 - 100)
  spatialScore: number;
  timelineScore: number;
  depthScore: number;
  compatibilityScore: number;
  compositeScore: number; // 0 - 100
  
  // Display Metrics
  estimatedSavingINR: number;
  estimatedDelayImpactDays: number;
  riskScorePercent: number;
  profitSavingOpportunityPercent: number;
  mustTryScorePercent: number;
  skipScorePercent: number;
  
  classification: CollaborationClassification;
  explanationReasons: string[];
  engineeringNotes: string;
  rank?: number; // 1, 2, 3...
}

export interface WorkSequenceResult {
  primaryProject: Project;
  recommendations: WorkSequenceMatch[];
  conflictCount: number;
  totalPotentialSavingsINR: number;
  evaluatedAt: string;
}
