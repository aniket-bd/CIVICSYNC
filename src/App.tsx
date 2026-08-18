import React, { useState, useEffect } from 'react';
import { Header } from './components/layout/Header';
import { OverviewDashboard } from './components/overview/OverviewDashboard';
import { ProjectTable } from './components/projects/ProjectTable';
import { WorkSequenceView } from './components/workSequence/WorkSequenceView';
import { LocalChecklistView } from './components/localChecklist/LocalChecklistView';
import { Procedural3DViewer } from './components/map3d/Procedural3DViewer';
import { Project } from './types/project';
import { store } from './db/store';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'projects' | 'work-sequence' | 'local-checklist' | 'map3d'>('overview');
  const [target3DProjectId, setTarget3DProjectId] = useState<string | undefined>(undefined);

  useEffect(() => {
    return store.subscribe(() => {
      // Synchronize tab if store changes it
    });
  }, []);

  const handleNavigateTo3D = (project: Project) => {
    store.setSelectedProjectId(project.id);
    setTarget3DProjectId(project.id);
    setActiveTab('map3d');
  };

  const handleNavigateTo2D = (project: Project) => {
    store.setSelectedProjectId(project.id);
    setActiveTab('overview');
  };

  return (
    <div className="app-container">
      <Header activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="main-content">
        {activeTab === 'overview' && (
          <OverviewDashboard onNavigateTo3D={handleNavigateTo3D} />
        )}
        {activeTab === 'projects' && (
          <ProjectTable
            onNavigateTo2DMap={handleNavigateTo2D}
            onNavigateTo3DMap={handleNavigateTo3D}
          />
        )}
        {activeTab === 'work-sequence' && (
          <WorkSequenceView
            onNavigateTo3D={handleNavigateTo3D}
            onNavigateTo2D={handleNavigateTo2D}
          />
        )}
        {activeTab === 'local-checklist' && (
          <LocalChecklistView onNavigateTo3D={handleNavigateTo3D} />
        )}
        {activeTab === 'map3d' && (
          <Procedural3DViewer
            initialProjectId={target3DProjectId}
            onNavigateTo2D={handleNavigateTo2D}
          />
        )}
      </main>
    </div>
  );
};

export default App;
