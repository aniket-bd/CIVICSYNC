import { Project, ProjectFilterState } from '../types/project';
import { Complaint, HistoricalConstructionRecord, TrafficImpactSuggestion } from '../types/localChecklist';
import { GPRSurvey } from '../types/gpr';
import { DataSourceConfig } from '../types/ingestion';
import {
  INITIAL_PROJECTS,
  INITIAL_COMPLAINTS,
  INITIAL_REGIONAL_HISTORY,
  INITIAL_TRAFFIC_SUGGESTIONS,
  INITIAL_GPR_SURVEYS,
  INITIAL_DATA_SOURCES
} from './initialData';

export type UserRole = 'Admin' | 'Project Manager' | 'Engineer' | 'Viewer';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  department: string;
  role: UserRole;
  avatarUrl?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  entityType: 'Project' | 'Complaint' | 'GPR' | 'DataSource' | 'System';
  entityId?: string;
}

class CivicSyncStore {
  private projects: Project[] = [];
  private complaints: Complaint[] = [];
  private regionalHistory: HistoricalConstructionRecord[] = [];
  private trafficSuggestions: TrafficImpactSuggestion[] = [];
  private gprSurveys: GPRSurvey[] = [];
  private dataSources: DataSourceConfig[] = [];
  private auditLogs: AuditLog[] = [];
  private currentUser: UserProfile = {
    id: 'usr-001',
    name: 'Er. Rajesh Deshmukh',
    email: 'rajesh.deshmukh@civicsync.gov.in',
    department: 'Municipal Infrastructure Planning Cell',
    role: 'Admin'
  };
  private selectedProjectId: string | null = 'TND-005';
  private activeTab: 'overview' | 'projects' | 'work-sequence' | 'local-checklist' | 'map3d' = 'overview';
  
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const storedProjectsRaw = localStorage.getItem('civicsync_projects');
      const parsedProjects: Project[] = storedProjectsRaw ? JSON.parse(storedProjectsRaw) : [];
      
      // Ensure all 25 demo projects exist in store (Single Source of Truth)
      const projectMap = new Map<string, Project>();
      INITIAL_PROJECTS.forEach(p => projectMap.set(p.id, p));
      parsedProjects.forEach(p => projectMap.set(p.id, p));
      this.projects = Array.from(projectMap.values());

      const storedComplaints = localStorage.getItem('civicsync_complaints');
      this.complaints = storedComplaints ? JSON.parse(storedComplaints) : INITIAL_COMPLAINTS;

      const storedHistory = localStorage.getItem('civicsync_history');
      this.regionalHistory = storedHistory ? JSON.parse(storedHistory) : INITIAL_REGIONAL_HISTORY;

      const storedTraffic = localStorage.getItem('civicsync_traffic');
      this.trafficSuggestions = storedTraffic ? JSON.parse(storedTraffic) : INITIAL_TRAFFIC_SUGGESTIONS;

      const storedGpr = localStorage.getItem('civicsync_gpr');
      this.gprSurveys = storedGpr ? JSON.parse(storedGpr) : INITIAL_GPR_SURVEYS;

      const storedDataSources = localStorage.getItem('civicsync_datasources');
      this.dataSources = storedDataSources ? JSON.parse(storedDataSources) : INITIAL_DATA_SOURCES;

      const storedUser = localStorage.getItem('civicsync_user');
      if (storedUser) this.currentUser = JSON.parse(storedUser);

      const storedLogs = localStorage.getItem('civicsync_audit_logs');
      this.auditLogs = storedLogs ? JSON.parse(storedLogs) : [
        {
          id: 'log-001',
          timestamp: new Date().toISOString(),
          userId: this.currentUser.id,
          userName: this.currentUser.name,
          action: 'System Initialized',
          details: 'CivicSync municipal database loaded with verified municipal infrastructure records.',
          entityType: 'System'
        }
      ];
    } catch (err) {
      console.warn('LocalStorage error, using initial dataset:', err);
      this.projects = INITIAL_PROJECTS;
      this.complaints = INITIAL_COMPLAINTS;
      this.regionalHistory = INITIAL_REGIONAL_HISTORY;
      this.trafficSuggestions = INITIAL_TRAFFIC_SUGGESTIONS;
      this.gprSurveys = INITIAL_GPR_SURVEYS;
      this.dataSources = INITIAL_DATA_SOURCES;
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem('civicsync_projects', JSON.stringify(this.projects));
      localStorage.setItem('civicsync_complaints', JSON.stringify(this.complaints));
      localStorage.setItem('civicsync_history', JSON.stringify(this.regionalHistory));
      localStorage.setItem('civicsync_traffic', JSON.stringify(this.trafficSuggestions));
      localStorage.setItem('civicsync_gpr', JSON.stringify(this.gprSurveys));
      localStorage.setItem('civicsync_datasources', JSON.stringify(this.dataSources));
      localStorage.setItem('civicsync_user', JSON.stringify(this.currentUser));
      localStorage.setItem('civicsync_audit_logs', JSON.stringify(this.auditLogs.slice(0, 100)));
    } catch (e) {
      console.warn('Failed saving to LocalStorage', e);
    }
    this.notify();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(l => l());
  }

  public logAction(action: string, details: string, entityType: AuditLog['entityType'], entityId?: string) {
    const log: AuditLog = {
      id: 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toISOString(),
      userId: this.currentUser.id,
      userName: this.currentUser.name,
      action,
      details,
      entityType,
      entityId
    };
    this.auditLogs.unshift(log);
    this.saveToStorage();
  }

  // Getters
  public getProjects(): Project[] {
    return this.projects;
  }

  public getProjectById(id: string): Project | undefined {
    return this.projects.find(p => p.id === id);
  }

  public getComplaints(): Complaint[] {
    return this.complaints;
  }

  public getRegionalHistory(): HistoricalConstructionRecord[] {
    return this.regionalHistory;
  }

  public getTrafficSuggestions(): TrafficImpactSuggestion[] {
    return this.trafficSuggestions;
  }

  public getGPRSurveys(): GPRSurvey[] {
    return this.gprSurveys;
  }

  public getDataSources(): DataSourceConfig[] {
    return this.dataSources;
  }

  public getCurrentUser(): UserProfile {
    return this.currentUser;
  }

  public getSelectedProjectId(): string | null {
    return this.selectedProjectId;
  }

  public getActiveTab(): 'overview' | 'projects' | 'work-sequence' | 'local-checklist' | 'map3d' {
    return this.activeTab;
  }

  public getAuditLogs(): AuditLog[] {
    return this.auditLogs;
  }

  // Setters & Actions
  public setSelectedProjectId(id: string | null) {
    this.selectedProjectId = id;
    this.notify();
  }

  public setActiveTab(tab: 'overview' | 'projects' | 'work-sequence' | 'local-checklist' | 'map3d') {
    this.activeTab = tab;
    this.notify();
  }

  public setCurrentUser(user: UserProfile) {
    this.currentUser = user;
    this.logAction('User Switched Role', `User changed role to ${user.role}`, 'System', user.id);
    this.saveToStorage();
  }

  public addProject(project: Project) {
    this.projects.unshift(project);
    this.logAction('Created Tender Project', `Added project: ${project.name} (${project.tenderNumber})`, 'Project', project.id);
    this.saveToStorage();
  }

  public addProjectsBatch(projects: Project[]) {
    this.projects = [...projects, ...this.projects];
    this.logAction('Batch Ingested Tenders', `Successfully imported ${projects.length} tender projects into database.`, 'Project');
    this.saveToStorage();
  }

  public updateProject(id: string, updates: Partial<Project>) {
    const idx = this.projects.findIndex(p => p.id === id);
    if (idx !== -1) {
      this.projects[idx] = { ...this.projects[idx], ...updates, lastUpdated: new Date().toISOString().split('T')[0] };
      this.logAction('Updated Tender Project', `Modified project fields for: ${this.projects[idx].name}`, 'Project', id);
      this.saveToStorage();
    }
  }

  public deleteProject(id: string) {
    const p = this.projects.find(x => x.id === id);
    this.projects = this.projects.filter(x => x.id !== id);
    if (this.selectedProjectId === id) this.selectedProjectId = null;
    this.logAction('Deleted Tender Project', `Removed project: ${p?.name || id}`, 'Project', id);
    this.saveToStorage();
  }

  public addComplaint(complaint: Complaint) {
    this.complaints.unshift(complaint);
    this.logAction('Submitted Complaint', `New civic issue reported: ${complaint.title}`, 'Complaint', complaint.id);
    this.saveToStorage();
  }

  public updateComplaintStatus(id: string, status: Complaint['status'], resolutionNotes?: string) {
    const idx = this.complaints.findIndex(c => c.id === id);
    if (idx !== -1) {
      this.complaints[idx].status = status;
      if (resolutionNotes) this.complaints[idx].resolutionNotes = resolutionNotes;
      this.logAction('Updated Complaint Status', `Complaint ${this.complaints[idx].title} set to ${status}`, 'Complaint', id);
      this.saveToStorage();
    }
  }

  public addGPRSurvey(survey: GPRSurvey) {
    this.gprSurveys.unshift(survey);
    this.logAction('Uploaded GPR Survey', `Processed subsurface radar file: ${survey.fileName}`, 'GPR', survey.id);
    this.saveToStorage();
  }

  public addDataSource(source: DataSourceConfig) {
    this.dataSources.unshift(source);
    this.logAction('Added Data Source Connector', `Configured external endpoint: ${source.name}`, 'DataSource', source.id);
    this.saveToStorage();
  }

  public resetToDefault() {
    this.projects = [...INITIAL_PROJECTS];
    this.complaints = [...INITIAL_COMPLAINTS];
    this.regionalHistory = [...INITIAL_REGIONAL_HISTORY];
    this.trafficSuggestions = [...INITIAL_TRAFFIC_SUGGESTIONS];
    this.gprSurveys = [...INITIAL_GPR_SURVEYS];
    this.dataSources = [...INITIAL_DATA_SOURCES];
    this.selectedProjectId = 'proj-001';
    this.logAction('Database Reset', 'Reset all stores to verified municipal initial dataset.', 'System');
    this.saveToStorage();
  }
}

export const store = new CivicSyncStore();
