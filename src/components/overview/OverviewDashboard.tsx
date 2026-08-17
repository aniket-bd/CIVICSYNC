import React, { useState, useEffect } from 'react';
import { Project } from '../../types/project';
import { store } from '../../db/store';
import { MapLibre2D } from './MapLibre2D';
import { RegionalHistory } from './RegionalHistory';
import { FinancialAnalytics } from './FinancialAnalytics';
import { RiskIntelligence } from './RiskIntelligence';
import { ProjectDetailsModal } from '../projects/ProjectDetailsModal';
import { RefreshCw } from 'lucide-react';

interface OverviewDashboardProps {
  onNavigateTo3D: (project: Project) => void;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({ onNavigateTo3D }) => {
  const [projects, setProjects] = useState<Project[]>(store.getProjects());
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(store.getSelectedProjectId());
  const [detailsModalProject, setDetailsModalProject] = useState<Project | null>(null);

  useEffect(() => {
    return store.subscribe(() => {
      setProjects(store.getProjects());
      setSelectedProjectId(store.getSelectedProjectId());
    });
  }, []);

  const handleSelectProject = (projectId: string) => {
    setSelectedProjectId(projectId);
    store.setSelectedProjectId(projectId);
  };

  const selectedProject = projects.find(p => p.id === selectedProjectId) || null;

  return (
    <div style={{ padding: '24px 40px', display: 'flex', flexDirection: 'column', gap: '20px', minHeight: 'calc(100vh - 64px)' }}>
      {/* ── TOP HEADER SECTION (Directly matching Reference Image 1) ── */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div className="section-tracker">REGIONAL INFRASTRUCTURE INTELLIGENCE</div>
          <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#1d1d1f', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
            The corridor view, simplified.
          </h1>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(0, 0, 0, 0.08)',
          borderRadius: '980px',
          padding: '6px 14px',
          fontSize: '12px',
          color: '#515154',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)'
        }}>
          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#0071e3' }} />
          <span>Portfolio updated 12 min ago</span>
          <RefreshCw size={13} color="#86868b" style={{ cursor: 'pointer', marginLeft: '4px' }} />
        </div>
      </div>

      {/* ── MAIN DASHBOARD GRID ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.55fr 1fr',
        gridTemplateRows: 'minmax(440px, 1.2fr) minmax(360px, 1fr)',
        gap: '20px',
        flex: 1,
        boxSizing: 'border-box',
      }}>
        {/* WINDOW 1: Large Interactive 2D GIS Map (60% width) */}
        <div className="glass-card" style={{
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid rgba(255, 255, 255, 0.95)',
          boxShadow: '0 12px 32px -4px rgba(0, 0, 0, 0.05)'
        }}>
          <MapLibre2D
            projects={projects}
            selectedProjectId={selectedProjectId}
            onSelectProject={handleSelectProject}
            onOpenIn3D={onNavigateTo3D}
            onOpenDetails={(p) => setDetailsModalProject(p)}
          />
        </div>

        {/* WINDOW 2: Financial Savings Analytics (Apple Blue bar chart & $18.4M metric) */}
        <div style={{ overflow: 'hidden' }}>
          <FinancialAnalytics projects={projects} />
        </div>

        {/* WINDOW 3: Regional History & Program Health */}
        <div style={{ overflow: 'hidden' }}>
          <RegionalHistory selectedProject={selectedProject} />
        </div>

        {/* WINDOW 4: Project Risk & Conflict Intelligence */}
        <div style={{ overflow: 'hidden' }}>
          <RiskIntelligence
            projects={projects}
            onSelectProject={handleSelectProject}
          />
        </div>
      </div>

      {/* Project Details Modal */}
      <ProjectDetailsModal
        project={detailsModalProject}
        isOpen={detailsModalProject !== null}
        onClose={() => setDetailsModalProject(null)}
        onViewOn2DMap={(p) => handleSelectProject(p.id)}
        onViewIn3D={onNavigateTo3D}
      />
    </div>
  );
};
