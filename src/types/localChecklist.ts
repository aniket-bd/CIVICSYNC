export type ComplaintStatus = 
  | 'Submitted'
  | 'Under Review'
  | 'Assigned'
  | 'In Progress'
  | 'Resolved'
  | 'Rejected';

export type ComplaintCategory = 
  | 'Pothole / Road Damage'
  | 'Water Leakage / Pipe Burst'
  | 'Sewer Overflow'
  | 'Traffic Congestion / Blockade'
  | 'Uncovered Trench / Safety Hazard'
  | 'Unauthorized Digging'
  | 'Noise / Pollution'
  | 'Other';

export interface Complaint {
  id: string;
  title: string;
  description: string;
  category: ComplaintCategory;
  locationName: string;
  latitude: number;
  longitude: number;
  projectId?: string;
  projectName?: string;
  photoUrl?: string;
  date: string;
  reporterName: string;
  reporterRole: 'Citizen' | 'Municipal Engineer' | 'Ward Officer' | 'Traffic Police';
  status: ComplaintStatus;
  urgency: 'Low' | 'Medium' | 'High' | 'Critical';
  assignedDepartment?: string;
  assignedOfficer?: string;
  resolutionNotes?: string;
}

export interface HistoricalConstructionRecord {
  id: string;
  projectName: string;
  year: number;
  wardOrRegion: string;
  locationName: string;
  department: string;
  contractor: string;
  budget: number;
  status: 'Completed' | 'Delayed' | 'Defect Rectified';
  knownIssues: string[];
  completionCertificateUrl?: string;
  inspectionSummary: string;
  depthMeters?: number;
  type: string;
}

export interface TrafficImpactSuggestion {
  id: string;
  affectedRoad: string;
  ward: string;
  currentCongestionLevel: 'Low' | 'Moderate' | 'Heavy' | 'Severe';
  potentialDelayMinutes: number;
  bottleneckPoints: string[];
  suggestedConcept: 
    | 'Temporary Diversion Route'
    | 'Partial Single-Lane Closure'
    | 'One-Way Traffic Management'
    | 'Phased Night-Shift Excavation'
    | 'Off-Peak Weekend Utility Slicing';
  conceptDetails: string;
  alternativeRoutes: {
    routeName: string;
    distanceDeltaKm: number;
    estimatedTimeMin: number;
    recommendedVehicleTypes: string[];
  }[];
}
