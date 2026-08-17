export interface GPRAnomaly {
  id: string;
  name: string;
  type: 'Metallic Utility' | 'Non-Metallic Conduit' | 'Void / Cavity' | 'Concrete Structure' | 'Unknown Subsurface Object';
  depthMeters: number;
  latitude: number;
  longitude: number;
  confidence: number; // 0-100%
  dielectricConstant?: number;
  description: string;
}

export interface GPRSurvey {
  id: string;
  surveyName: string;
  fileName: string;
  fileSizeBytes: number;
  surveyDate: string;
  wardOrRegion: string;
  surveyor: string;
  radarFrequencyMhz: number;
  maxDepthScannedMeters: number;
  anomalies: GPRAnomaly[];
  status: 'Processed' | 'Raw' | 'Error';
  notes: string;
}
