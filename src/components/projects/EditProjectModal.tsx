import React, { useState, useEffect } from 'react';
import { Modal } from '../layout/Modal';
import { Project, ProjectType, ProjectStatus, ProjectGPRData, ProjectVisibility } from '../../types/project';
import { store } from '../../db/store';
import { GPRUploadDropzone } from './GPRUploadDropzone';
import { 
  Radar, 
  Lock, 
  Users, 
  Building, 
  Shield, 
  AlertTriangle, 
  Save, 
  Archive, 
  Trash2,
  History,
  FileCheck
} from 'lucide-react';

interface EditProjectModalProps {
  project: Project | null;
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

export const EditProjectModal: React.FC<EditProjectModalProps> = ({
  project,
  isOpen,
  onClose,
  onSuccess
}) => {
  if (!project) return null;

  const [name, setName] = useState(project.name);
  const [tenderNumber, setTenderNumber] = useState(project.tenderNumber);
  const [type, setType] = useState<ProjectType>(project.type);
  const [description, setDescription] = useState(project.description);
  const [region, setRegion] = useState(project.region?.city || project.wardOrRegion.split('•')[0]?.trim() || 'Nagpur');
  const [area, setArea] = useState(project.region?.area || project.locationName.split(',')[1]?.trim() || 'Dharampeth');
  const [road, setRoad] = useState(project.road?.name || project.locationName.split(',')[0]?.trim() || project.locationName);
  const [latitude, setLatitude] = useState(project.latitude.toString());
  const [longitude, setLongitude] = useState(project.longitude.toString());
  const [budget, setBudget] = useState(project.budget.toString());
  const [depthMeters, setDepthMeters] = useState((project.depthMeters || 3.5).toString());
  const [heightMeters, setHeightMeters] = useState((project.heightMeters || 0).toString());
  const [status, setStatus] = useState<ProjectStatus>(project.status);

  // Visibility
  const [visibilityType, setVisibilityType] = useState<'private' | 'specific_users' | 'team' | 'organization'>(
    project.visibility?.type || 'organization'
  );
  const [selectedUsers, setSelectedUsers] = useState<string[]>(
    project.visibility?.users || ['Er. Rajesh Deshmukh (Lead Engineer)']
  );
  const [selectedGroup, setSelectedGroup] = useState<string>(
    project.visibility?.groups?.[0] || 'Engineering Team'
  );

  // GPR Replacement State & Safety
  const [gprData, setGprData] = useState<ProjectGPRData | null>(project.gpr || null);
  const [showReplaceGprConfirm, setShowReplaceGprConfirm] = useState(false);
  const [pendingNewGpr, setPendingNewGpr] = useState<ProjectGPRData | null>(null);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (project) {
      setName(project.name);
      setTenderNumber(project.tenderNumber);
      setType(project.type);
      setDescription(project.description);
      setLatitude(project.latitude.toString());
      setLongitude(project.longitude.toString());
      setBudget(project.budget.toString());
      setDepthMeters((project.depthMeters || 3.5).toString());
      setHeightMeters((project.heightMeters || 0).toString());
      setStatus(project.status);
      setVisibilityType(project.visibility?.type || 'organization');
      setSelectedUsers(project.visibility?.users || ['Er. Rajesh Deshmukh (Lead Engineer)']);
      setSelectedGroup(project.visibility?.groups?.[0] || 'Engineering Team');
      setGprData(project.gpr || null);
      setShowReplaceGprConfirm(false);
      setShowArchiveConfirm(false);
      setShowDeleteConfirm(false);
      setError(null);
    }
  }, [project]);

  const handleGprFileSelected = (newGpr: ProjectGPRData | null) => {
    if (!newGpr) {
      setGprData(null);
      return;
    }

    if (project.gpr && project.gpr.fileName !== newGpr.fileName) {
      setPendingNewGpr(newGpr);
      setShowReplaceGprConfirm(true);
    } else {
      setGprData(newGpr);
    }
  };

  const confirmReplaceGpr = () => {
    if (pendingNewGpr) {
      setGprData(pendingNewGpr);
      setShowReplaceGprConfirm(false);
      setPendingNewGpr(null);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Project Name is required.');
      return;
    }

    const latNum = parseFloat(latitude) || project.latitude;
    const lngNum = parseFloat(longitude) || project.longitude;
    const budgetNum = parseFloat(budget) || project.budget;
    const depthNum = parseFloat(depthMeters) || 3.5;
    const heightNum = parseFloat(heightMeters) || 0;

    // Maintain file versioning history
    const existingVersions = project.fileVersions || [];
    let updatedVersions = [...existingVersions];

    if (gprData && (!project.gpr || project.gpr.fileName !== gprData.fileName)) {
      const nextVersionNum = existingVersions.length + 1;
      updatedVersions.unshift({
        version: nextVersionNum,
        fileName: gprData.fileName,
        fileSize: gprData.fileSize,
        uploadedAt: gprData.uploadDate,
        processingStatus: gprData.processingStatus,
        notes: `Version ${nextVersionNum} — Updated GPR radar survey`
      });
    }

    const visibility: ProjectVisibility = {
      type: visibilityType,
      users: visibilityType === 'specific_users' ? selectedUsers : undefined,
      groups: visibilityType === 'team' ? [selectedGroup] : undefined
    };

    store.updateProject(project.id, {
      name: name.trim(),
      tenderNumber: tenderNumber.trim(),
      type,
      description: description.trim(),
      budget: budgetNum,
      approvedAmount: budgetNum,
      depthMeters: depthNum,
      heightMeters: heightNum > 0 ? heightNum : undefined,
      status,
      locationName: `${road}, ${area}`,
      wardOrRegion: `${region} • ${area}`,
      latitude: latNum,
      longitude: lngNum,
      gpr: gprData || undefined,
      visibility,
      fileVersions: updatedVersions,
      region: {
        country: 'India',
        state: 'Maharashtra',
        city: region,
        area
      },
      road: {
        name: road,
        type: 'Arterial Corridor'
      }
    });

    onClose();
    if (onSuccess) onSuccess();
  };

  const handleArchive = () => {
    store.updateProject(project.id, {
      status: 'Archived',
      isArchived: true
    });
    onClose();
    if (onSuccess) onSuccess();
  };

  const handleDelete = () => {
    store.deleteProject(project.id);
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
      onClose={onClose}
      title={`Edit Project: ${project.name}`}
      subtitle={`Tender ID: ${project.tenderNumber} · ID: ${project.id}`}
      maxWidth="880px"
    >
      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
        {error && (
          <div style={{
            background: 'rgba(254, 242, 240, 0.95)',
            border: '1px solid rgba(194, 65, 27, 0.35)',
            borderRadius: '10px',
            padding: '10px 14px',
            color: '#c2411b',
            fontSize: '13px',
            fontWeight: 500
          }}>
            {error}
          </div>
        )}

        {/* SECTION A: Project Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#0071e3', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            A. Project Specification
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#1d1d1f', marginBottom: '4px' }}>
                Project Name *
              </label>
              <input
                className="form-input"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#1d1d1f', marginBottom: '4px' }}>
                Tender ID
              </label>
              <input
                className="form-input"
                value={tenderNumber}
                onChange={e => setTenderNumber(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#1d1d1f', marginBottom: '4px' }}>
                Type
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
                Status
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
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#1d1d1f', marginBottom: '4px' }}>
                Budget (₹)
              </label>
              <input
                className="form-input"
                type="number"
                value={budget}
                onChange={e => setBudget(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#1d1d1f', marginBottom: '4px' }}>
              Description
            </label>
            <textarea
              className="form-textarea"
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>
        </div>

        {/* SECTION B: Location */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#0071e3', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            B. Spatial Location & Coordinates
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#1d1d1f', marginBottom: '4px' }}>Region</label>
              <input className="form-input" value={region} onChange={e => setRegion(e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#1d1d1f', marginBottom: '4px' }}>Area</label>
              <input className="form-input" value={area} onChange={e => setArea(e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#1d1d1f', marginBottom: '4px' }}>Road / Corridor</label>
              <input className="form-input" value={road} onChange={e => setRoad(e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#1d1d1f', marginBottom: '4px' }}>Latitude</label>
              <input className="form-input" value={latitude} onChange={e => setLatitude(e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#1d1d1f', marginBottom: '4px' }}>Longitude</label>
              <input className="form-input" value={longitude} onChange={e => setLongitude(e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#1d1d1f', marginBottom: '4px' }}>Depth (m)</label>
              <input className="form-input" type="number" step="0.1" value={depthMeters} onChange={e => setDepthMeters(e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#1d1d1f', marginBottom: '4px' }}>Height (m)</label>
              <input className="form-input" type="number" step="0.5" value={heightMeters} onChange={e => setHeightMeters(e.target.value)} />
            </div>
          </div>
        </div>

        {/* SECTION C: GPR File & Versioning */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#0071e3', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Radar size={16} /> C. GPR Subsurface Data & Versioning
          </div>

          <GPRUploadDropzone
            onFileSelected={handleGprFileSelected}
            initialData={gprData || undefined}
          />

          {/* Replacement Confirmation Dialog */}
          {showReplaceGprConfirm && pendingNewGpr && (
            <div style={{
              background: 'rgba(254, 248, 231, 0.95)',
              border: '1px solid rgba(154, 103, 0, 0.35)',
              borderRadius: '12px',
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#9a6700', fontWeight: 600, fontSize: '13px' }}>
                <AlertTriangle size={17} />
                <span>Confirm GPR File Replacement</span>
              </div>
              <p style={{ fontSize: '12px', color: '#515154', lineHeight: 1.45 }}>
                You are about to replace <strong>{project.gpr?.fileName}</strong> with <strong>{pendingNewGpr.fileName}</strong>. The existing file will be preserved in the versioning history.
              </p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={confirmReplaceGpr}
                >
                  Confirm & Update Version
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setShowReplaceGprConfirm(false);
                    setPendingNewGpr(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* File Versioning History */}
          {project.fileVersions && project.fileVersions.length > 0 && (
            <div style={{ background: 'rgba(255, 255, 255, 0.7)', border: '1px solid rgba(0, 0, 0, 0.08)', borderRadius: '12px', padding: '14px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#1d1d1f', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <History size={14} /> GPR Versioning History ({project.fileVersions.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {project.fileVersions.map((ver, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', padding: '6px 8px', background: 'rgba(255, 255, 255, 0.9)', borderRadius: '6px', border: '1px solid rgba(0, 0, 0, 0.05)' }}>
                    <span style={{ fontWeight: 600, color: '#1d1d1f' }}>Version {ver.version}: {ver.fileName}</span>
                    <span style={{ color: '#86868b' }}>{ver.uploadedAt} · {ver.processingStatus}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* SECTION D: Visibility */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#0071e3', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            D. Visibility & Access
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
            {[
              { id: 'private', label: 'Private', desc: 'Only me', icon: Lock },
              { id: 'specific_users', label: 'Specific Users', desc: 'Named collaborators', icon: Users },
              { id: 'team', label: 'Team', desc: 'Department', icon: Shield },
              { id: 'organization', label: 'Organization', desc: 'All members', icon: Building }
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
                    padding: '10px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: isSelected ? '#0071e3' : '#1d1d1f', fontWeight: 600, fontSize: '12px' }}>
                    <Icon size={13} />
                    <span>{vis.label}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#86868b' }}>{vis.desc}</div>
                </div>
              );
            })}
          </div>

          {visibilityType === 'specific_users' && (
            <div style={{ background: 'rgba(255, 255, 255, 0.8)', border: '1px solid rgba(0, 0, 0, 0.08)', borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#1d1d1f' }}>Authorized Collaborators</div>
              {AVAILABLE_TEAM_USERS.map(user => (
                <label key={user} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#1d1d1f', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(user)}
                    onChange={() => toggleUserSelection(user)}
                    style={{ accentColor: '#0071e3' }}
                  />
                  <span>{user}</span>
                </label>
              ))}
            </div>
          )}

          {visibilityType === 'team' && (
            <div style={{ background: 'rgba(255, 255, 255, 0.8)', border: '1px solid rgba(0, 0, 0, 0.08)', borderRadius: '12px', padding: '12px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#1d1d1f', marginBottom: '6px', display: 'block' }}>Assigned Department</label>
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

        {/* BOTTOM CONTROLS & SAFETY DIALOGS */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '16px' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setShowArchiveConfirm(true)}
              style={{ color: '#515154' }}
            >
              <Archive size={14} />
              <span>Archive</span>
            </button>
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 size={14} />
              <span>Delete</span>
            </button>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
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
              <Save size={16} />
              <span>Save Changes</span>
            </button>
          </div>
        </div>

        {/* Archive Confirmation */}
        {showArchiveConfirm && (
          <div style={{ background: 'rgba(255, 255, 255, 0.95)', border: '1px solid rgba(0, 0, 0, 0.15)', borderRadius: '12px', padding: '14px', marginTop: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#1d1d1f' }}>Archive this project?</div>
            <p style={{ fontSize: '12px', color: '#515154', marginTop: '4px' }}>
              The project and its attached GPR file will be moved to archived state. You can restore it later.
            </p>
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleArchive}>
                Confirm Archive
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowArchiveConfirm(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Delete Confirmation */}
        {showDeleteConfirm && (
          <div style={{ background: 'rgba(254, 242, 240, 0.95)', border: '1px solid rgba(194, 65, 27, 0.35)', borderRadius: '12px', padding: '14px', marginTop: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#c2411b' }}>Permanently Delete Project?</div>
            <p style={{ fontSize: '12px', color: '#515154', marginTop: '4px' }}>
              This will permanently remove <strong>{project.name}</strong> and its attached GPR survey file from the database.
            </p>
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button type="button" className="btn btn-danger btn-sm" onClick={handleDelete}>
                Permanently Delete
              </button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
};
