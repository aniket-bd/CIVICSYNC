export type ProjectType = 
  | 'Water'
  | 'Drainage'
  | 'Road'
  | 'Telecom'
  | 'Electrical'
  | 'Cable'
  | 'Sewerage'
  | 'Building'
  | 'Bridge'
  | 'Other';

export type ProjectStatus = 
  | 'Draft'
  | 'Uploaded'
  | 'Processing'
  | 'Ready'
  | 'In Review'
  | 'Active'
  | 'Approved'
  | 'Pending'
  | 'Completed'
  | 'Closed'
  | 'Delayed'
  | 'Cancelled'
  | 'Archived'
  | 'Failed';

export type ManagedBy = 'CivicSync' | 'Other' | 'Unknown';

export type DataProvenance = 
  | 'Verified Data'
  | 'Calculated'
  | 'Estimated'
  | 'AI Generated'
  | 'User Entered'
  | 'Source Document'
  | 'Imported Data'
  | 'GPR Survey';

export interface Coordinate {
  lat: number;
  lng: number;
  elevation?: number;
}

export type GeoGeometryType = 'Point' | 'LineString' | 'Polygon' | 'MultiPolygon';

export interface GeoGeometry {
  type: GeoGeometryType;
  coordinates: number[] | number[][] | number[][][];
}

export interface ProjectDocument {
  id: string;
  name: string;
  type: 'PDF' | 'XLSX' | 'CSV' | 'CAD' | 'IMAGE' | 'GPR';
  url: string;
  sizeBytes: number;
  uploadedAt: string;
}

export interface ProjectGPRData {
  fileName: string;
  fileSize: number; // in bytes
  fileType: string; // e.g. '.gpr'
  fileReference?: string;
  uploadDate: string;
  processingStatus: 'Draft' | 'Uploaded' | 'Processing' | 'Ready' | 'In Review' | 'Failed';
  processingProgress?: number; // 0-100
  notes?: string;
  radarFrequencyMhz?: number;
  maxDepthScannedMeters?: number;
  anomaliesDetected?: number;
  rawDataAttached?: boolean;
  fileDataUri?: string;
  version?: number;
}

export interface ProjectVisibility {
  type: 'private' | 'specific_users' | 'team' | 'organization';
  users?: string[];
  groups?: string[];
}

export interface ProjectFileVersion {
  version: number;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  processingStatus: string;
  notes?: string;
}

export interface ProjectStation {
  km: number;
  name: string;
  lat: number;
  lng: number;
  depthMeters?: number;
  invertLevelMeters?: number;
  pressureBar?: number;
}

export interface ProjectCrossingUtility {
  id: string;
  name: string;
  type: 'Gas Pipeline' | 'Power Cable (11kV/33kV)' | 'Optical Fiber' | 'Storm Sewer' | 'Water Main';
  depthMeters: number;
  clearanceMeters: number;
  lat: number;
  lng: number;
  clashStatus: 'Clear' | 'Warning' | 'Critical Collision';
}

export interface Project {
  id: string;
  name: string;
  tenderNumber: string;
  description: string;
  type: ProjectType;
  budget: number; // in INR (₹)
  approvedAmount: number;
  estimatedAmount: number;
  potentialSaving: number;
  startDate: string; // ISO format YYYY-MM-DD
  expectedCompletionDate: string;
  actualCompletionDate?: string;
  durationDays: number;
  status: ProjectStatus;
  contractor: string;
  department: string;
  authority: string;
  managedBy: ManagedBy;
  locationName: string;
  wardOrRegion: string;
  latitude: number;
  longitude: number;
  startCoordinate?: Coordinate;
  endCoordinate?: Coordinate;
  routeGeometry?: GeoGeometry;
  areaPolygon?: GeoGeometry;
  stations?: ProjectStation[];
  crossings?: ProjectCrossingUtility[];
  soilStrata?: {
    topsoilDepthMeters: number;
    weatheredBasaltDepthMeters: number;
    hardRockBedrockDepthMeters: number;
  };
  lengthMeters?: number;
  widthMeters?: number;
  depthMeters?: number; // e.g. 5.0m
  heightMeters?: number; // e.g. 24.0m above ground (for buildings, bridges, towers)
  buildingFloors?: number; // e.g. 6 floors
  diameterMm?: number; // e.g. 600mm
  material?: string; // Ductile Iron, HDPE, Reinforced Concrete, Bitumen, Optical Fiber
  constructionMethod?: string; // Open Trench, HDD (Horizontal Directional Drilling), Micro-tunneling, Surface Paving
  documents: ProjectDocument[];
  source: string; // "Nagpur Municipal Portal API", "MahaTenders PDF Ingestion", "Manual Entry", "GPR Survey"
  sourceUrl?: string;
  lastUpdated: string;
  confidence: DataProvenance;
  riskScore: number; // 0-100%
  collaborationPotential: 'High' | 'Medium' | 'Low' | 'Conflict Alert';

  // Extended GPR, Visibility & Management Metadata
  gpr?: ProjectGPRData;
  visibility?: ProjectVisibility;
  region?: {
    country?: string;
    state?: string;
    city?: string;
    area?: string;
  };
  road?: {
    name?: string;
    type?: string;
  };
  fileVersions?: ProjectFileVersion[];
  isArchived?: boolean;
  visualization3D?: {
    available: boolean;
    source: string;
    modelReference?: string | null;
  };
}

export interface ProjectFilterState {
  search: string;
  types: ProjectType[];
  statuses: ProjectStatus[];
  minBudget: number;
  maxBudget: number;
  startDateFrom: string;
  startDateTo: string;
  managedBy: ManagedBy | 'All';
  wardOrRegion: string | 'All';
  minDepth?: number;
  maxDepth?: number;
  visibilityType?: 'All' | 'private' | 'specific_users' | 'team' | 'organization';
  hasGprOnly?: boolean;
}
