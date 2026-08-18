import React, { useState, useEffect } from 'react';
import { Project } from '../../types/project';
import { store } from '../../db/store';
import { MapLibre2D } from './MapLibre2D';
import { RegionalHistory } from './RegionalHistory';
import { FinancialAnalytics } from './FinancialAnalytics';
import { RiskIntelligence } from './RiskIntelligence';
import { ProjectDetailsModal } from '../projects/ProjectDetailsModal';

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
    <div style={{
      padding: '20px 24px',
      display: 'grid',
      gridTemplateColumns: '1.25fr 1fr',
      gridTemplateRows: 'minmax(450px, 1.15fr) minmax(380px, 1fr)',
      gap: '20px',
      height: 'calc(100vh - 56px)',
      boxSizing: 'border-box',
    }}>
      {/* WINDOW 1: Large Interactive 2D GIS Map */}
      <div className="glass-card" style={{
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <MapLibre2D
          projects={projects}
          selectedProjectId={selectedProjectId}
          onSelectProject={handleSelectProject}
          onOpenIn3D={onNavigateTo3D}
          onOpenDetails={(p) => setDetailsModalProject(p)}
        />
      </div>

      {/* WINDOW 2: Regional History & Local Intelligence */}
      <div style={{ overflow: 'hidden' }}>
        <RegionalHistory selectedProject={selectedProject} />
      </div>

      {/* WINDOW 3: Financial Analytics */}
      <div style={{ overflow: 'hidden' }}>
        <FinancialAnalytics projects={projects} />
      </div>

      {/* WINDOW 4: Project Risk & Conflict Intelligence */}
      <div style={{ overflow: 'hidden' }}>
        <RiskIntelligence
          projects={projects}
          onSelectProject={handleSelectProject}
        />
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
