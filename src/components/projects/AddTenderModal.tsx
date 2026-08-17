import React, { useState } from 'react';
import { Modal } from '../layout/Modal';
import { Project, ProjectType, ProjectStatus, ManagedBy, ProjectGPRData, ProjectVisibility } from '../../types/project';
import { IngestionReport } from '../../types/ingestion';
import { FileParserService } from '../../services/fileParser';
import { ApiIngestionService } from '../../services/apiIngestion';
import { store } from '../../db/store';
import { IngestionPreview } from './IngestionPreview';
import { GPRUploadDropzone } from './GPRUploadDropzone';
import { 
  FileSpreadsheet, 
  FileText, 
  Globe, 
  PenTool, 
  Radar,
  Lock,
  Users,
  Building,
  Shield,
  AlertCircle,
  Plus
} from 'lucide-react';

interface AddTenderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const AVAILABLE_TEAM_USERS = [
  'Er. Rajesh Deshmukh (Lead Engineer)',
  'Ar. Priya Sharma (Urban Planner)',
  'Dr. Anand Kulkarni (GIS Specialist)',
  'Er. Amit Verma (Subsurface Surveyor)',
  'Smt. Neha Joshi (Project Manager)'
];

const AVAILABLE_GROUPS = [
  'Engineering Team',
  'Survey Team',
  'Project Management',
  'GIS & Spatial Cell'
];

export const AddTenderModal: React.FC<AddTenderModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'file' | 'pdf' | 'api'>('create');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ingestionReport, setIngestionReport] = useState<IngestionReport | null>(null);

  // Structured Project Form State
  const [name, setName] = useState('');
  const [tenderNumber, setTenderNumber] = useState(`TND-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
  const [type, setType] = useState<ProjectType>('Water');
  const [description, setDescription] = useState('');
  const [region, setRegion] = useState('Nagpur');
  const [area, setArea] = useState('Dharampeth Zone');
  const [road, setRoad] = useState('West High Court Road');
  const [latitude, setLatitude] = useState('21.1458');
  const [longitude, setLongitude] = useState('79.0682');
  const [budget, setBudget] = useState('45000000');
  const [contractor, setContractor] = useState('L&T Infrastructure JV');
  const [depthMeters, setDepthMeters] = useState('4.5');
  const [heightMeters, setHeightMeters] = useState('0');
  const [status, setStatus] = useState<ProjectStatus>('Ready');

  // GPR State
  const [gprData, setGprData] = useState<ProjectGPRData | null>(null);

  // Visibility State
  const [visibilityType, setVisibilityType] = useState<'private' | 'specific_users' | 'team' | 'organization'>('organization');
  const [selectedUsers, setSelectedUsers] = useState<string[]>(['Er. Rajesh Deshmukh (Lead Engineer)']);
  const [selectedGroup, setSelectedGroup] = useState<string>('Engineering Team');
  const [userSearch, setUserSearch] = useState('');

  // Secondary PDF Ingestion State
  const [pdfSampleText, setPdfSampleText] = useState(
    `Tender Notice No: NMC/WTR/2026/099-B\nName of Work: Sitabuldi to Dharampeth Interconnecting High-Pressure Water Main\nProject Type: Water\nEstimated Cost: ₹ 6.50 Crore\nExcavation Depth: 4.8 m\nTotal Length: 1.8 km\nDiameter: 500 mm DI K9 Pipe\nStart Date: 2026-10-01\nCompletion Date: 2027-01-15\nDepartment: Water Works Department\nAuthority: Nagpur Municipal Corporation\nContractor: NCC Limited Civil Works\nLocation: West High Court Road to Sitabuldi Corridor`
  );

  const resetForm = () => {
    setName('');
    setTenderNumber(`TND-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
    setDescription('');
    setGprData(null);
    setError(null);
    setVisibilityType('organization');
    setStatus('Ready');
  };

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Strict validation: Project name is required
    if (!name.trim()) {
      setError('Project Name is required. Please enter a project title.');
      return;
    }

    const latNum = parseFloat(latitude) || 21.1458;
    const lngNum = parseFloat(longitude) || 79.0682;
    const budgetNum = parseFloat(budget) || 10000000;
    const depthNum = parseFloat(depthMeters) || 3.5;
    const heightNum = parseFloat(heightMeters) || 0;

    const visibility: ProjectVisibility = {
      type: visibilityType,
      users: visibilityType === 'specific_users' ? selectedUsers : undefined,
      groups: visibilityType === 'team' ? [selectedGroup] : undefined
    };

    const newProject: Project = {
      id: 'proj-' + Date.now(),
      name: name.trim(),
      tenderNumber: tenderNumber.trim() || `TND-${Date.now().toString().slice(-4)}`,
      description: description.trim() || `${type} infrastructure development project located at ${road}, ${area}, ${region}.`,
      type,
      budget: budgetNum,
      approvedAmount: budgetNum,
      estimatedAmount: budgetNum * 1.05,
      potentialSaving: budgetNum * 0.08,
      startDate: new Date().toISOString().split('T')[0],
      expectedCompletionDate: new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0],
      durationDays: 180,
      status,
      contractor: contractor || 'Municipal Infrastructure Contractor',
      department: `${type} Engineering Department`,
      authority: 'Nagpur Municipal Corporation',
      managedBy: 'CivicSync',
      locationName: `${road}, ${area}`,
      wardOrRegion: `${region} • ${area}`,
      latitude: latNum,
      longitude: lngNum,
      startCoordinate: { lat: latNum - 0.002, lng: lngNum - 0.002, elevation: 310 },
      endCoordinate: { lat: latNum + 0.002, lng: lngNum + 0.002, elevation: 312 },
      routeGeometry: {
        type: 'LineString',
        coordinates: [
          [lngNum - 0.002, latNum - 0.002],
          [lngNum, latNum],
          [lngNum + 0.002, latNum + 0.002]
        ]
      },
      areaPolygon: {
        type: 'Polygon',
        coordinates: [[
          [lngNum - 0.003, latNum - 0.002],
          [lngNum + 0.003, latNum - 0.002],
          [lngNum + 0.003, latNum + 0.002],
          [lngNum - 0.003, latNum + 0.002],
          [lngNum - 0.003, latNum - 0.002]
        ]]
      },
      depthMeters: depthNum,
      heightMeters: heightNum > 0 ? heightNum : undefined,
      lengthMeters: 1500,
      widthMeters: type === 'Road' ? 12.0 : 3.0,
      diameterMm: type === 'Water' ? 600 : type === 'Sewerage' ? 900 : 250,
      material: type === 'Water' ? 'Ductile Iron (K9)' : type === 'Road' ? 'Bitumen Macadam' : 'Reinforced Concrete',
      constructionMethod: 'Open Trench & Micro-tunneling',
      documents: gprData ? [{
        id: 'doc-gpr-' + Date.now(),
        name: gprData.fileName,
        type: 'GPR',
        url: '#',
        sizeBytes: gprData.fileSize,
        uploadedAt: gprData.uploadDate
      }] : [],
      source: gprData ? `GPR Survey File (${gprData.fileName})` : 'CivicSync Project Creation',
      lastUpdated: new Date().toISOString().split('T')[0],
      confidence: gprData ? 'GPR Survey' : 'User Entered',
      riskScore: 30,
      collaborationPotential: 'High',

      // Extended GPR, Visibility & Management Fields
      gpr: gprData || undefined,
      visibility,
      region: {
        country: 'India',
        state: 'Maharashtra',
        city: region,
        area
      },
      road: {
        name: road,
        type: 'Arterial Corridor'
      },
      fileVersions: gprData ? [{
        version: 1,
        fileName: gprData.fileName,
        fileSize: gprData.fileSize,
        uploadedAt: gprData.uploadDate,
        processingStatus: gprData.processingStatus,
        notes: 'Initial GPR scan upload'
      }] : [],
      visualization3D: {
        available: true,
        source: gprData ? 'GPR' : 'Procedural',
        modelReference: null
      }
    };

    store.addProject(newProject);
    store.setSelectedProjectId(newProject.id);
    resetForm();
    onClose();
    if (onSuccess) onSuccess();
  };

  // Secondary batch ingestion handlers
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    try {
      let report: IngestionReport;
      if (file.name.endsWith('.csv')) {
        report = await FileParserService.parseCSV(file);
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        report = await FileParserService.parseExcel(file);
      } else {
        throw new Error('Unsupported file extension. Please upload .xlsx, .xls, or .csv');
      }
      setIngestionReport(report);
    } catch (err: any) {
      setError(err.message || 'Failed to parse spreadsheet file.');
    } finally {
      setLoading(false);
    }
  };

  const handlePdfParse = async () => {
    setLoading(true);
    setError(null);
    try {
      const mockPdfFile = new File([''], 'MahaTenders_Notice_099B.pdf', { type: 'application/pdf' });
      const report = await FileParserService.parsePDF(mockPdfFile, pdfSampleText);
      setIngestionReport(report);
    } catch (err: any) {
      setError(err.message || 'Failed to extract text from PDF.');
    } finally {
      setLoading(false);
    }
  };

  const handleApiFetch = async () => {
    setLoading(true);
    setError(null);
    try {
      const sources = store.getDataSources();
      const firstSource = sources[0] || {
        id: 'ds-demo',
        name: 'MahaTenders API Gateway',
        url: 'https://api.mahatenders.gov.in',
        type: 'REST',
        authType: 'API Key',
        endpoint: '/nagpur/active',
        updateFrequency: 'Daily',
        status: 'Active',
        fieldMappings: []
      };
      const report = await ApiIngestionService.fetchFromDataSource(firstSource);
      setIngestionReport(report);
    } catch (err: any) {
      setError(err.message || 'Failed connecting to external API endpoint.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmImport = (projects: Project[]) => {
    store.addProjectsBatch(projects);
    setIngestionReport(null);
    onClose();
    if (onSuccess) onSuccess();
  };

  const toggleUserSelection = (userName: string) => {
    if (selectedUsers.includes(userName)) {
      setSelectedUsers(selectedUsers.filter(u => u !== userName));
    } else {
      setSelectedUsers([...selectedUsers, userName]);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        setIngestionReport(null);
        setError(null);
        onClose();
      }}
      title="Create Project & Ingest Tender"
      subtitle="Structured Project Creation, GPR File Attachment, Access & Status Management"
      maxWidth="900px"
    >
      {/* If Ingestion Preview is active, display the dry-run verification UI */}
      {ingestionReport ? (
        <IngestionPreview
          report={ingestionReport}
          onConfirmImport={handleConfirmImport}
          onCancel={() => setIngestionReport(null)}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Source Tabs Submenu */}
          <div style={{
            display: 'flex',
            gap: '8px',
            background: 'rgba(255, 255, 255, 0.85)',
            padding: '5px',
            borderRadius: '14px',
            border: '1px solid rgba(0, 0, 0, 0.08)',
            boxShadow: '0 4px 16px -2px rgba(0, 0, 0, 0.03)'
          }}>
            {[
              { id: 'create', label: '1. Add Project & GPR', icon: Plus },
              { id: 'file', label: '2. Excel / CSV Batch', icon: FileSpreadsheet },
              { id: 'pdf', label: '3. PDF Tender Parser', icon: FileText },
              { id: 'api', label: '4. API Gateway Sync', icon: Globe }
            ].map(tab => {
              const Icon = tab.icon;
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    setError(null);
                  }}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '9px 14px',
                    borderRadius: '10px',
                    fontSize: '12.5px',
                    fontWeight: isSelected ? 700 : 500,
                    cursor: 'pointer',
                    border: isSelected ? '1px solid rgba(0, 113, 227, 0.4)' : '1px solid transparent',
                    background: isSelected 
                      ? '#0071e3' 
                      : 'transparent',
                    color: isSelected ? '#ffffff' : '#515154',
                    boxShadow: isSelected ? '0 4px 14px rgba(0, 113, 227, 0.32)' : 'none',
                    transition: 'all 0.18s'
                  }}
                >
                  <Icon size={15} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Error Banner */}
          {error && (
            <div style={{
              background: 'rgba(254, 242, 240, 0.95)',
              border: '1px solid rgba(194, 65, 27, 0.35)',
              borderRadius: '10px',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: '#c2411b',
              fontSize: '13px',
              fontWeight: 500
            }}>
              <AlertCircle size={17} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* TAB 1: ADD PROJECT & GPR FILE (Primary Workflow) */}
          {activeTab === 'create' && (
            <form onSubmit={handleCreateProject} style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
              {/* SECTION A: Project Information */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0071e3', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  A. Project Information
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#1d1d1f', marginBottom: '4px' }}>
                      Project Name <span style={{ color: '#c2411b' }}>*</span>
                    </label>
                    <input
                      className="form-input"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="e.g. Nagpur Underground Road Corridor"
                      required
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#1d1d1f', marginBottom: '4px' }}>
                      Tender ID / Ref
                    </label>
                    <input
                      className="form-input"
                      value={tenderNumber}
                      onChange={e => setTenderNumber(e.target.value)}
                      placeholder="e.g. TND-2026-001"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#1d1d1f', marginBottom: '4px' }}>
                      Infrastructure Type
                    </label>
                    <select
                      className="form-select"
                      value={type}
                      onChange={e => setType(e.target.value as ProjectType)}
                    >
                      <option value="Water">Water Supply</option>
                      <option value="Drainage">Storm Drainage</option>
                      <option value="Road">Road & Paving</option>
                      <option value="Telecom">Telecom / Fiber</option>
                      <option value="Electrical">Electrical Power</option>
                      <option value="Sewerage">Sewerage Network</option>
                      <option value="Building">Building & Facility</option>
                      <option value="Bridge">Bridge & Flyover</option>
                      <option value="Other">Other Civil Works</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#1d1d1f', marginBottom: '4px' }}>
                      Estimated Budget (₹)
                    </label>
                    <input
                      className="form-input"
                      type="number"
                      value={budget}
                      onChange={e => setBudget(e.target.value)}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#1d1d1f', marginBottom: '4px' }}>
                      Assigned Contractor
                    </label>
                    <input
                      className="form-input"
                      value={contractor}
                      onChange={e => setContractor(e.target.value)}
                      placeholder="e.g. NCC Limited"
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#1d1d1f', marginBottom: '4px' }}>
                    Project Description / Scope
                  </label>
                  <textarea
                    className="form-textarea"
                    rows={2}
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Enter project scope, engineering purpose, and site notes..."
                  />
                </div>
              </div>

              {/* SECTION B: Location & Spatial Geometry */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0071e3', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  B. Location & Coordinates
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#1d1d1f', marginBottom: '4px' }}>
                      Region / City
                    </label>
                    <input
                      className="form-input"
                      value={region}
                      onChange={e => setRegion(e.target.value)}
                      placeholder="e.g. Nagpur"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#1d1d1f', marginBottom: '4px' }}>
                      Area / Ward
                    </label>
                    <input
                      className="form-input"
                      value={area}
                      onChange={e => setArea(e.target.value)}
                      placeholder="e.g. Dharampeth Zone 2"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#1d1d1f', marginBottom: '4px' }}>
                      Road / Site Corridor
                    </label>
                    <input
                      className="form-input"
                      value={road}
                      onChange={e => setRoad(e.target.value)}
                      placeholder="e.g. Wardha Road"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#1d1d1f', marginBottom: '4px' }}>
                      Latitude
                    </label>
                    <input
                      className="form-input"
                      value={latitude}
                      onChange={e => setLatitude(e.target.value)}
                      placeholder="21.1458"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#1d1d1f', marginBottom: '4px' }}>
                      Longitude
                    </label>
                    <input
                      className="form-input"
                      value={longitude}
                      onChange={e => setLongitude(e.target.value)}
                      placeholder="79.0682"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#1d1d1f', marginBottom: '4px' }}>
                      Depth Below Grade (m)
                    </label>
                    <input
                      className="form-input"
                      type="number"
                      step="0.1"
                      value={depthMeters}
                      onChange={e => setDepthMeters(e.target.value)}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#1d1d1f', marginBottom: '4px' }}>
                      Height Above Grade (m)
                    </label>
                    <input
                      className="form-input"
                      type="number"
                      step="0.5"
                      value={heightMeters}
                      onChange={e => setHeightMeters(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* SECTION C: GPR File Upload */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0071e3', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Radar size={16} /> C. GPR Subsurface Data (.gpr)
                </div>

                <GPRUploadDropzone
                  onFileSelected={(data) => setGprData(data)}
                  initialData={gprData || undefined}
                />
              </div>

              {/* SECTION D: Visibility & Access Management */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0071e3', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  D. Visibility & Project Access
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                  {[
                    { id: 'private', label: 'Private', desc: 'Only me', icon: Lock },
                    { id: 'specific_users', label: 'Specific Users', desc: 'Named collaborators', icon: Users },
                    { id: 'team', label: 'Team / Group', desc: 'Target department', icon: Shield },
                    { id: 'organization', label: 'Organization', desc: 'All municipal members', icon: Building }
                  ].map(vis => {
                    const Icon = vis.icon;
                    const isSelected = visibilityType === vis.id;
                    return (
                      <div
                        key={vis.id}
                        onClick={() => setVisibilityType(vis.id as any)}
                        style={{
                          background: isSelected ? 'rgba(0, 113, 227, 0.08)' : 'rgba(255, 255, 255, 0.65)',
                          border: isSelected ? '1.5px solid #0071e3' : '1px solid rgba(0, 0, 0, 0.08)',
                          borderRadius: '12px',
                          padding: '12px',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                          transition: 'all 0.15s'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: isSelected ? '#0071e3' : '#1d1d1f', fontWeight: 600, fontSize: '12.5px' }}>
                          <Icon size={14} />
                          <span>{vis.label}</span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#86868b' }}>{vis.desc}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Specific Users Selector */}
                {visibilityType === 'specific_users' && (
                  <div style={{ background: 'rgba(255, 255, 255, 0.8)', border: '1px solid rgba(0, 0, 0, 0.08)', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#1d1d1f' }}>Select Collaborators</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '140px', overflowY: 'auto' }}>
                      {AVAILABLE_TEAM_USERS.map(user => {
                        const isChecked = selectedUsers.includes(user);
                        return (
                          <label key={user} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#1d1d1f', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleUserSelection(user)}
                              style={{ accentColor: '#0071e3', cursor: 'pointer' }}
                            />
                            <span>{user}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Team / Group Selector */}
                {visibilityType === 'team' && (
                  <div style={{ background: 'rgba(255, 255, 255, 0.8)', border: '1px solid rgba(0, 0, 0, 0.08)', borderRadius: '12px', padding: '14px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#1d1d1f', marginBottom: '6px', display: 'block' }}>Select Target Department</label>
                    <select
                      className="form-select"
                      value={selectedGroup}
                      onChange={e => setSelectedGroup(e.target.value)}
                    >
                      {AVAILABLE_GROUPS.map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* SECTION E: Project Status */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0071e3', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  E. Initial Status
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#1d1d1f', marginBottom: '4px' }}>
                      Project Lifecycle Status
                    </label>
                    <select
                      className="form-select"
                      value={status}
                      onChange={e => setStatus(e.target.value as ProjectStatus)}
                    >
                      <option value="Draft">Draft</option>
                      <option value="Uploaded">Uploaded</option>
                      <option value="Processing">Processing</option>
                      <option value="Ready">Ready</option>
                      <option value="In Review">In Review</option>
                      <option value="Active">Active</option>
                      <option value="Approved">Approved</option>
                      <option value="Pending">Pending</option>
                      <option value="Completed">Completed</option>
                      <option value="Archived">Archived</option>
                      <option value="Failed">Failed</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', gap: '10px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={onClose}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                    >
                      <Plus size={16} />
                      <span>Create Project</span>
                    </button>
                  </div>
                </div>
              </div>
            </form>
          )}

          {/* TAB 2: EXCEL / CSV INGESTION */}
          {activeTab === 'file' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: 'rgba(255, 255, 255, 0.65)', border: '1px solid rgba(255, 255, 255, 0.9)', borderRadius: '12px', padding: '24px', textAlign: 'center' }}>
                <FileSpreadsheet size={36} color="#1a7f37" style={{ margin: '0 auto 10px' }} />
                <h4 style={{ fontSize: '15px', fontWeight: 600, color: '#1d1d1f' }}>Upload Batch Tender Spreadsheet</h4>
                <p style={{ fontSize: '12.5px', color: '#86868b', marginTop: '4px' }}>
                  Supports CSV, XLSX, and XLS formats. Includes automatic deduplication and validation.
                </p>
                <div style={{ marginTop: '16px' }}>
                  <input
                    type="file"
                    accept=".csv, .xlsx, .xls"
                    onChange={handleFileUpload}
                    id="excel-csv-upload"
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="excel-csv-upload" className="btn btn-primary">
                    <span>Select Spreadsheet File</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PDF PARSER */}
          {activeTab === 'pdf' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#1d1d1f' }}>Paste Gazette Tender Notice Text or Upload PDF</div>
              <textarea
                className="form-textarea"
                rows={6}
                value={pdfSampleText}
                onChange={e => setPdfSampleText(e.target.value)}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handlePdfParse}
                  disabled={loading}
                >
                  <span>Extract Tender via Parser</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: API SYNC */}
          {activeTab === 'api' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: 'rgba(255, 255, 255, 0.65)', border: '1px solid rgba(255, 255, 255, 0.9)', borderRadius: '12px', padding: '20px' }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#1d1d1f' }}>MahaTenders Municipal REST Gateway</div>
                <div style={{ fontSize: '12px', color: '#86868b', marginTop: '4px' }}>
                  Sync verified municipal contracts and real-time corridor updates.
                </div>
                <div style={{ marginTop: '16px' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleApiFetch}
                    disabled={loading}
                  >
                    <span>Fetch Live API Tenders</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};
