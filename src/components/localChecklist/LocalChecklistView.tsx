import React, { useState, useEffect } from 'react';
import { Project } from '../../types/project';
import { Complaint, ComplaintStatus } from '../../types/localChecklist';
import { store } from '../../db/store';
import { TrafficAnalysisPanel } from './TrafficAnalysisPanel';
import { RaiseComplaintModal } from './RaiseComplaintModal';
import { MapLibre2D } from '../overview/MapLibre2D';
import { formatINR, formatDate, formatDepth } from '../../utils/formatters';
import { 
  CheckSquare, 
  Plus, 
  MessageSquare
} from 'lucide-react';

interface LocalChecklistViewProps {
  onNavigateTo3D: (project: Project) => void;
}

export const LocalChecklistView: React.FC<LocalChecklistViewProps> = ({ onNavigateTo3D }) => {
  const [projects, setProjects] = useState<Project[]>(store.getProjects());
  const [complaints, setComplaints] = useState<Complaint[]>(store.getComplaints());
  const [trafficSuggestions] = useState(store.getTrafficSuggestions());
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(store.getSelectedProjectId());
  const [isComplaintModalOpen, setIsComplaintModalOpen] = useState(false);

  useEffect(() => {
    return store.subscribe(() => {
      setProjects(store.getProjects());
      setComplaints(store.getComplaints());
      setSelectedProjectId(store.getSelectedProjectId());
    });
  }, []);

  const selectedProject = projects.find(p => p.id === selectedProjectId) || projects[0];

  const handleUpdateStatus = (id: string, status: ComplaintStatus) => {
    store.updateComplaintStatus(id, status);
  };

  return (
    <div style={{ padding: '32px 40px', display: 'flex', flexDirection: 'column', gap: '24px', minHeight: 'calc(100vh - 56px)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.028em', lineHeight: 1.1 }}>
            Local Municipal Checklist & Citizen Registry
          </h1>
          <p style={{ fontSize: '14px', color: '#515154', marginTop: '6px', fontWeight: 400 }}>
            Location-centric audit: Traffic management, historical works, and live complaint mitigation
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => setIsComplaintModalOpen(true)}
        >
          <Plus size={16} />
          <span>Raise Incident / Complaint</span>
        </button>
      </div>

      {/* 2x2 Equal Floating Glass Blocks Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: '20px', flex: 1 }}>
        {/* Block 1 (Top-Left): GIS Map framed by minimalist glass border */}
        <div className="glass-card" style={{ overflow: 'hidden', height: '100%', minHeight: '380px' }}>
          <MapLibre2D
            projects={projects}
            selectedProjectId={selectedProjectId}
            onSelectProject={(id) => {
              setSelectedProjectId(id);
              store.setSelectedProjectId(id);
            }}
            onOpenIn3D={onNavigateTo3D}
            onOpenDetails={() => {}}
          />
        </div>

        {/* Block 2 (Top-Right): Site Checklist using clean expandable accordions */}
        <div className="glass-card" style={{
          padding: '22px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          overflowY: 'auto'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckSquare size={18} color="#ff6b00" />
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1d1d1f' }}>
                Site Checklist: {selectedProject?.locationName || 'Municipal Zone'}
              </h3>
            </div>
            <span style={{ fontSize: '11.5px', color: '#ff6b00', fontFamily: 'SF Mono, ui-monospace, monospace', fontWeight: 700, background: 'rgba(255, 149, 0, 0.12)', border: '1px solid rgba(255, 149, 0, 0.3)', padding: '3px 10px', borderRadius: '980px' }}>
              {selectedProject?.wardOrRegion}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.85)', border: '1px solid rgba(0, 0, 0, 0.06)', borderRadius: '12px', padding: '14px', backdropFilter: 'blur(16px)' }}>
              <div style={{ color: '#86868b', fontSize: '10.5px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>1. Primary Active Project</div>
              <div style={{ fontWeight: 700, color: '#1d1d1f', marginTop: '3px', fontSize: '14px' }}>{selectedProject?.name}</div>
              <div style={{ fontSize: '12px', color: '#1a7f37', marginTop: '4px', fontWeight: 600 }}>
                Contractor: {selectedProject?.contractor} · Depth: {formatDepth(selectedProject?.depthMeters)}
              </div>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.85)', border: '1px solid rgba(0, 0, 0, 0.06)', borderRadius: '12px', padding: '14px', backdropFilter: 'blur(16px)' }}>
              <div style={{ color: '#86868b', fontSize: '10.5px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>2. Road & Subsurface Condition</div>
              <div style={{ fontWeight: 600, color: '#ff6b00', marginTop: '3px', fontSize: '13px' }}>
                Active open excavation trench along right-hand service lane.
              </div>
              <div style={{ fontSize: '12px', color: '#515154', marginTop: '3px' }}>
                Hard barricades and blinkers installed. Soil compaction testing scheduled post-pipe laying.
              </div>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.85)', border: '1px solid rgba(0, 0, 0, 0.06)', borderRadius: '12px', padding: '14px', backdropFilter: 'blur(16px)' }}>
              <div style={{ color: '#86868b', fontSize: '10.5px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>3. Existing Subsurface Utilities</div>
              <div style={{ fontWeight: 600, color: '#0071e3', marginTop: '3px', fontSize: '13px' }}>
                150mm Gas Pipeline at 1.8m, 33kV Power Cable Duct at 1.2m
              </div>
              <div style={{ fontSize: '12px', color: '#86868b', marginTop: '3px' }}>
                Verified via GPR Subsurface Radar Scan 2026-08-04.
              </div>
            </div>
          </div>
        </div>

        {/* Block 3 (Bottom-Left): Traffic Management with soft color overlays */}
        <div style={{ overflow: 'hidden' }}>
          <TrafficAnalysisPanel suggestions={trafficSuggestions} />
        </div>

        {/* Block 4 (Bottom-Right): Complaints & Incident Log with left-edge neon border */}
        <div className="glass-card" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageSquare size={18} color="#c2411b" />
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1d1d1f' }}>
                Complaints & Incident Log ({complaints.length})
              </h3>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {complaints.map(comp => (
              <div
                key={comp.id}
                style={{
                  background: 'rgba(255, 255, 255, 0.85)',
                  border: '1px solid rgba(0, 0, 0, 0.06)',
                  borderLeft: comp.urgency === 'Critical' ? '4px solid #c2411b' : '4px solid #ff6b00',
                  borderRadius: '12px',
                  padding: '14px 16px',
                  fontSize: '12.5px',
                  boxShadow: comp.urgency === 'Critical' ? '0 0 12px rgba(194, 65, 27, 0.15)' : 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{
                    fontSize: '10.5px',
                    fontWeight: 700,
                    color: comp.urgency === 'Critical' ? '#c2411b' : '#ff6b00',
                    background: comp.urgency === 'Critical' ? 'rgba(254, 242, 240, 0.9)' : 'rgba(255, 247, 237, 0.9)',
                    padding: '3px 9px',
                    borderRadius: '980px',
                    textTransform: 'uppercase',
                    border: comp.urgency === 'Critical' ? '1px solid rgba(194, 65, 27, 0.3)' : '1px solid rgba(255, 149, 0, 0.3)'
                  }}>
                    {comp.urgency} · {comp.category}
                  </span>

                  <select
                    value={comp.status}
                    onChange={e => handleUpdateStatus(comp.id, e.target.value as ComplaintStatus)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.9)',
                      border: '1px solid rgba(0, 0, 0, 0.1)',
                      color: comp.status === 'Resolved' ? '#1a7f37' : '#1d1d1f',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      borderRadius: '6px',
                      padding: '3px 8px',
                      outline: 'none'
                    }}
                  >
                    <option value="Submitted">Submitted</option>
                    <option value="Under Review">Under Review</option>
                    <option value="Assigned">Assigned</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>

                <div style={{ fontWeight: 700, color: '#1d1d1f', marginTop: '8px', fontSize: '13.5px' }}>
                  {comp.title}
                </div>
                <div style={{ fontSize: '11.5px', color: '#86868b', marginTop: '2px' }}>
                  {comp.locationName} · Reported by {comp.reporterName} ({comp.reporterRole}) on {comp.date}
                </div>
                <p style={{ fontSize: '12px', color: '#515154', marginTop: '6px', lineHeight: 1.45 }}>
                  {comp.description}
                </p>

                {comp.resolutionNotes && (
                  <div style={{ marginTop: '8px', background: 'rgba(240, 250, 243, 0.9)', border: '1px solid rgba(26, 127, 55, 0.3)', padding: '8px 10px', borderRadius: '8px', color: '#1a7f37', fontSize: '11.5px', fontWeight: 500 }}>
                    <strong>Action Note:</strong> {comp.resolutionNotes}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <RaiseComplaintModal
        isOpen={isComplaintModalOpen}
        onClose={() => setIsComplaintModalOpen(false)}
        defaultLocationName={selectedProject?.locationName}
        defaultLat={selectedProject?.latitude}
        defaultLng={selectedProject?.longitude}
        defaultProjectId={selectedProject?.id}
      />
    </div>
  );
};
