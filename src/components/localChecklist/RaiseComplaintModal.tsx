import React, { useState } from 'react';
import { Modal } from '../layout/Modal';
import { Complaint, ComplaintCategory } from '../../types/localChecklist';
import { store } from '../../db/store';
import { AlertCircle, Camera, MapPin, Check } from 'lucide-react';

interface RaiseComplaintModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultLocationName?: string;
  defaultLat?: number;
  defaultLng?: number;
  defaultProjectId?: string;
}

export const RaiseComplaintModal: React.FC<RaiseComplaintModalProps> = ({
  isOpen,
  onClose,
  defaultLocationName = 'Dharampeth West High Court Road',
  defaultLat = 21.1442,
  defaultLng = 79.0628,
  defaultProjectId
}) => {
  const currentUser = store.getCurrentUser();
  const projects = store.getProjects();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ComplaintCategory>('Uncovered Trench / Safety Hazard');
  const [locationName, setLocationName] = useState(defaultLocationName);
  const [projectId, setProjectId] = useState<string>(defaultProjectId || projects[0]?.id || '');
  const [urgency, setUrgency] = useState<'Low' | 'Medium' | 'High' | 'Critical'>('High');
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  const categories: ComplaintCategory[] = [
    'Pothole / Road Damage',
    'Water Leakage / Pipe Burst',
    'Sewer Overflow',
    'Traffic Congestion / Blockade',
    'Uncovered Trench / Safety Hazard',
    'Unauthorized Digging',
    'Noise / Pollution',
    'Other'
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) return;

    const matchedProject = projects.find(p => p.id === projectId);

    const newComplaint: Complaint = {
      id: 'comp-' + Date.now(),
      title,
      description,
      category,
      locationName,
      latitude: defaultLat,
      longitude: defaultLng,
      projectId: projectId || undefined,
      projectName: matchedProject?.name,
      date: new Date().toISOString().split('T')[0],
      reporterName: currentUser.name,
      reporterRole: currentUser.role === 'Admin' || currentUser.role === 'Engineer' ? 'Municipal Engineer' : 'Citizen',
      status: 'Submitted',
      urgency,
      assignedDepartment: matchedProject?.department || 'Municipal Grievance Cell'
    };

    store.addComplaint(newComplaint);
    setSubmittedSuccess(true);
    setTimeout(() => {
      setSubmittedSuccess(false);
      setTitle('');
      setDescription('');
      onClose();
    }, 1200);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Raise Civic / Infrastructure Complaint"
      subtitle="Spatial Incident & Hazard Reporting System"
      maxWidth="680px"
    >
      {submittedSuccess ? (
        <div style={{
          padding: '36px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: 'rgba(16, 185, 129, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Check size={24} color="#34d399" />
          </div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>
            Complaint Successfully Registered
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>
            Grievance geo-tagged and forwarded to Municipal Engineering Action Cell.
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Issue Title *</label>
            <input
              className="form-input"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Uncovered water pipeline trench causing safety hazard at night"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Category</label>
              <select
                className="form-select"
                value={category}
                onChange={e => setCategory(e.target.value as ComplaintCategory)}
              >
                {categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Urgency Level</label>
              <select
                className="form-select"
                value={urgency}
                onChange={e => setUrgency(e.target.value as any)}
              >
                <option value="Critical">Critical (Immediate Hazard)</option>
                <option value="High">High Priority</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Location / Landmark</label>
              <input
                className="form-input"
                value={locationName}
                onChange={e => setLocationName(e.target.value)}
                placeholder="e.g. Shankar Nagar Square"
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Related Tender Project (Optional)</label>
              <select
                className="form-select"
                value={projectId}
                onChange={e => setProjectId(e.target.value)}
              >
                <option value="">None / Unassigned Project</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Detailed Description *</label>
            <textarea
              className="form-textarea"
              rows={4}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe the physical condition, depth of hole, traffic impact, and immediate safety concerns..."
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Submit Spatial Complaint
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};
