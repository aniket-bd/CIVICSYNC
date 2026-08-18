import React, { useState } from 'react';
import { Modal } from '../layout/Modal';
import { Project } from '../../types/project';
import { StatusBadge } from '../common/StatusBadge';
import { ConfidenceBadge } from '../common/ConfidenceBadge';
import { VisibilityBadge } from '../common/VisibilityBadge';
import { TypeIcon } from '../common/TypeIcon';
import { formatINR, formatDate, formatDistance, formatDepth } from '../../utils/formatters';
import { EditProjectModal } from './EditProjectModal';
import { 
  Building2, 
  Calendar, 
  MapPin, 
  Ruler, 
  HardHat, 
  Coins, 
  FileText, 
  Compass, 
  Box, 
  Radar, 
  Lock, 
  Users, 
  Building, 
  Shield, 
  CheckCircle2, 
  Edit3, 
  History
} from 'lucide-react';

interface ProjectDetailsModalProps {
  project: Project | null;
  isOpen: boolean;
  onClose: () => void;
  onViewOn2DMap: (project: Project) => void;
  onViewIn3D: (project: Project) => void;
}

export const ProjectDetailsModal: React.FC<ProjectDetailsModalProps> = ({
  project,
  isOpen,
  onClose,
  onViewOn2DMap,
  onViewIn3D
}) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  if (!project) return null;

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <>
      <Modal
        isOpen={isOpen && !isEditModalOpen}
        onClose={onClose}
        title={project.name}
        subtitle={`Tender ID: ${project.tenderNumber} · Authority: ${project.authority}`}
        maxWidth="860px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Top Bar: Status, Visibility, Badges & Action Controls */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            paddingBottom: '16px',
            borderBottom: '1px solid rgba(0, 0, 0, 0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <TypeIcon type={project.type} size={16} />
              <span style={{ fontWeight: 700, fontSize: '13.5px', color: '#1d1d1f' }}>{project.type}</span>
              <StatusBadge status={project.status} />
              <VisibilityBadge visibility={project.visibility} />
              <ConfidenceBadge confidence={project.confidence} />
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setIsEditModalOpen(true)}
              >
                <Edit3 size={13} />
                <span>Edit Project</span>
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  onClose();
                  onViewOn2DMap(project);
                }}
              >
                <Compass size={13} color="#0071e3" />
                <span>Locate on 2D GIS</span>
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  onClose();
                  onViewIn3D(project);
                }}
              >
                <Box size={13} />
                <span>Launch 3D Twin</span>
              </button>
            </div>
          </div>

          {/* Description */}
          <div style={{ background: 'rgba(255, 255, 255, 0.7)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(0, 0, 0, 0.08)' }}>
            <div style={{ fontSize: '11px', color: '#86868b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em', marginBottom: '6px' }}>
              Project Scope & Technical Description
            </div>
            <p style={{ fontSize: '13.5px', color: '#1d1d1f', lineHeight: 1.6 }}>{project.description}</p>
          </div>

          {/* 4-Box Technical Matrix */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
            {/* Budget */}
            <div style={{ background: 'rgba(255, 255, 255, 0.7)', border: '1px solid rgba(0, 0, 0, 0.08)', borderRadius: '12px', padding: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#86868b', textTransform: 'uppercase', fontWeight: 600 }}>
                <Coins size={14} color="#0071e3" />
                <span>Budget & Cost</span>
              </div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#1d1d1f', marginTop: '6px', fontFamily: 'SF Mono, ui-monospace, monospace' }}>
                {formatINR(project.budget)}
              </div>
              <div style={{ fontSize: '11px', color: '#1a7f37', marginTop: '2px', fontWeight: 600, fontFamily: 'SF Mono, ui-monospace, monospace' }}>
                Save: {formatINR(project.potentialSaving)}
              </div>
            </div>

            {/* Subsurface Depth */}
            <div style={{ background: 'rgba(255, 255, 255, 0.7)', border: '1px solid rgba(0, 0, 0, 0.08)', borderRadius: '12px', padding: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#86868b', textTransform: 'uppercase', fontWeight: 600 }}>
                <Ruler size={14} color="#9a6700" />
                <span>Depth / Elevation</span>
              </div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#9a6700', marginTop: '6px', fontFamily: 'SF Mono, ui-monospace, monospace' }}>
                {formatDepth(project.depthMeters)}
              </div>
              <div style={{ fontSize: '11px', color: '#86868b', marginTop: '2px' }}>
                {project.heightMeters ? `+${project.heightMeters}m Height` : (project.diameterMm ? `Ø ${project.diameterMm}mm` : formatDistance(project.lengthMeters))}
              </div>
            </div>

            {/* Timeline */}
            <div style={{ background: 'rgba(255, 255, 255, 0.7)', border: '1px solid rgba(0, 0, 0, 0.08)', borderRadius: '12px', padding: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#86868b', textTransform: 'uppercase', fontWeight: 600 }}>
                <Calendar size={14} color="#0071e3" />
                <span>Timeline</span>
              </div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#1d1d1f', marginTop: '6px' }}>
                {formatDate(project.startDate)}
              </div>
              <div style={{ fontSize: '11px', color: '#86868b', marginTop: '2px' }}>
                to {formatDate(project.expectedCompletionDate)}
              </div>
            </div>

            {/* Contractor */}
            <div style={{ background: 'rgba(255, 255, 255, 0.7)', border: '1px solid rgba(0, 0, 0, 0.08)', borderRadius: '12px', padding: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#86868b', textTransform: 'uppercase', fontWeight: 600 }}>
                <HardHat size={14} color="#1d1d1f" />
                <span>Contractor</span>
              </div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#1d1d1f', marginTop: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {project.contractor || 'Unassigned'}
              </div>
              <div style={{ fontSize: '11px', color: '#86868b', marginTop: '2px' }}>{project.managedBy}</div>
            </div>
          </div>

          {/* GPR Data Section */}
          <div style={{ background: 'rgba(255, 255, 255, 0.75)', border: '1px solid rgba(0, 113, 227, 0.2)', borderRadius: '14px', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', fontWeight: 700, color: '#0071e3' }}>
                <Radar size={18} />
                <span>GPR Subsurface Survey Attachment</span>
              </div>
              {project.gpr && (
                <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '980px', background: 'rgba(48, 209, 88, 0.15)', color: '#1a7f37', fontWeight: 700 }}>
                  {project.gpr.processingStatus}
                </span>
              )}
            </div>

            {project.gpr ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', background: 'rgba(255, 255, 255, 0.9)', padding: '12px', borderRadius: '10px', fontSize: '12.5px' }}>
                  <div>
                    <span style={{ color: '#86868b' }}>File Name:</span>
                    <div style={{ fontWeight: 600, color: '#1d1d1f', marginTop: '2px' }}>{project.gpr.fileName}</div>
                  </div>
                  <div>
                    <span style={{ color: '#86868b' }}>File Size:</span>
                    <div style={{ fontWeight: 600, color: '#1d1d1f', marginTop: '2px' }}>{formatFileSize(project.gpr.fileSize)}</div>
                  </div>
                  <div>
                    <span style={{ color: '#86868b' }}>Upload Date:</span>
                    <div style={{ fontWeight: 600, color: '#1d1d1f', marginTop: '2px' }}>{project.gpr.uploadDate}</div>
                  </div>
                </div>

                <div style={{ background: 'rgba(0, 113, 227, 0.05)', border: '1px solid rgba(0, 113, 227, 0.15)', borderRadius: '10px', padding: '10px 14px', fontSize: '12px', color: '#515154', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <CheckCircle2 size={16} color="#0071e3" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    {project.gpr.notes || 'Raw GPR data is attached to this project. Visualization will be available when a compatible GPR processing/decoder is configured.'}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '12.5px', color: '#86868b', padding: '10px 0' }}>
                No standalone .gpr file is attached to this project record. You can attach one by clicking <strong>Edit Project</strong> above.
              </div>
            )}
          </div>

          {/* Location & Access Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '14px' }}>
            {/* Spatial Location */}
            <div style={{ background: 'rgba(255, 255, 255, 0.7)', border: '1px solid rgba(0, 0, 0, 0.08)', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12.5px' }}>
              <div style={{ fontSize: '11px', color: '#86868b', textTransform: 'uppercase', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MapPin size={13} color="#0071e3" />
                <span>Geographic Location & Coordinates</span>
              </div>
              <div style={{ color: '#1d1d1f', fontWeight: 600 }}>{project.locationName}</div>
              <div style={{ color: '#86868b' }}>Ward / Zone: {project.wardOrRegion}</div>
              <div style={{ fontFamily: 'SF Mono, ui-monospace, monospace', color: '#0071e3', fontWeight: 600, background: 'rgba(0, 113, 227, 0.08)', padding: '4px 8px', borderRadius: '6px', width: 'fit-content' }}>
                {project.latitude.toFixed(6)}°N, {project.longitude.toFixed(6)}°E
              </div>
            </div>

            {/* Access & Visibility */}
            <div style={{ background: 'rgba(255, 255, 255, 0.7)', border: '1px solid rgba(0, 0, 0, 0.08)', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12.5px' }}>
              <div style={{ fontSize: '11px', color: '#86868b', textTransform: 'uppercase', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Shield size={13} color="#0071e3" />
                <span>Project Access & Governance</span>
              </div>
              <div>
                <VisibilityBadge visibility={project.visibility} />
              </div>
              {project.visibility?.users && project.visibility.users.length > 0 && (
                <div style={{ fontSize: '11.5px', color: '#515154' }}>
                  Users: {project.visibility.users.join(', ')}
                </div>
              )}
              <div style={{ fontSize: '11px', color: '#86868b', marginTop: 'auto' }}>
                Last Updated: {project.lastUpdated} · Source: {project.source}
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Edit Project Modal */}
      {isEditModalOpen && (
        <EditProjectModal
          project={project}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={() => setIsEditModalOpen(false)}
        />
      )}
    </>
  );
};
