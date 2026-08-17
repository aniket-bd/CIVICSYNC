import { Project, ProjectType } from './project';

export interface FieldMapping {
  sourceField: string;
  targetField: keyof Project;
  required: boolean;
  defaultValue?: string | number;
  transformer?: 'string' | 'number' | 'date' | 'geometry' | 'projectType';
}

export interface DataSourceConfig {
  id: string;
  name: string;
  url: string;
  type: 'REST' | 'OData' | 'GeoServer' | 'GraphQL';
  authType: 'None' | 'Bearer Token' | 'API Key' | 'Basic';
  authKeyOrToken?: string;
  endpoint: string;
  updateFrequency: 'Manual' | 'Hourly' | 'Daily' | 'Weekly';
  lastSynchronized?: string;
  status: 'Active' | 'Inactive' | 'Error';
  fieldMappings: FieldMapping[];
}

export interface ValidationIssue {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface IngestionPreviewItem {
  index: number;
  rawRecord: Record<string, unknown>;
  parsedProject?: Partial<Project>;
  isValid: boolean;
  isDuplicate: boolean;
  missingFields: string[];
  issues: ValidationIssue[];
  selectedForImport: boolean;
}

export interface IngestionReport {
  sourceType: 'API' | 'PDF' | 'Excel' | 'CSV' | 'Manual';
  sourceName: string;
  totalRecords: number;
  validRecordsCount: number;
  missingFieldsCount: number;
  invalidRecordsCount: number;
  duplicateRecordsCount: number;
  previewItems: IngestionPreviewItem[];
}
