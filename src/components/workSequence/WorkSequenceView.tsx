import React, { useState, useMemo } from 'react';
import { Project, ProjectType, ProjectStatus } from '../../types/project';
import { WorkSequenceFilter } from '../../types/workSequence';
import { WorkSequenceEngine } from '../../services/workSequenceEngine';
import { store } from '../../db/store';
import { RecommendationCard } from './RecommendationCard';
import { TypeIcon } from '../common/TypeIcon';
import { formatINR, formatDepth, formatDate } from '../../utils/formatters';
import { 
  Sparkles, 
  Layers, 
  Sliders, 
  Coins, 
  Box
} from 'lucide-react';

interface WorkSequenceViewProps {
  onNavigateTo3D: (project: Project) => void;
  onNavigateTo2D: (project: Project) => void;
}

export const WorkSequenceView: React.FC<WorkSequenceViewProps> = ({
  onNavigateTo3D,
  onNavigateTo2D
}) => {
  const projects = store.getProjects();
  const [primaryProjectId, setPrimaryProjectId] = useState<string>(projects[0]?.id || 'proj-001');

  const [allowedStatuses] = useState<ProjectStatus[]>(['Approved', 'Pending', 'Active', 'Completed']);
  const [maxDistanceMeters, setMaxDistanceMeters] = useState<number>(800);
  const [minDepth] = useState<number>(0);
  const [maxDepth] = useState<number>(10);
  const [selectedTypes, setSelectedTypes] = useState<ProjectType[]>([]);

  const primaryProject = projects.find(p => p.id === primaryProjectId) || projects[0];

  const sequenceResult = useMemo(() => {
    if (!primaryProject) return null;

    const filter: WorkSequenceFilter = {
      primaryProjectId: primaryProject.id,
      allowedStatuses,
      minDepth,
      maxDepth,
      maxDistanceMeters,
      startDateFrom: '2025-01-01',
      startDateTo: '2028-12-31',
      selectedTypes,
      limitCount: 10
    };

    return WorkSequenceEngine.evaluateWorkSequence(primaryProject, projects, filter);
  }, [primaryProject, projects, allowedStatuses, maxDistanceMeters, minDepth, maxDepth, selectedTypes]);

  const top3Recommendations = sequenceResult ? sequenceResult.recommendations.slice(0, 3) : [];
  const otherCandidates = sequenceResult ? sequenceResult.recommendations.slice(3) : [];

  const allTypes: ProjectType[] = ['Water', 'Drainage', 'Road', 'Telecom', 'Electrical', 'Cable', 'Sewerage', 'Bridge'];

  const toggleTypeFilter = (t: ProjectType) => {
    if (selectedTypes.includes(t)) {
      setSelectedTypes(selectedTypes.filter(x => x !== t));
    } else {
      setSelectedTypes([...selectedTypes, t]);
    }
  };

  return (
    <div style={{ padding: '32px 40px', display: 'flex', flexDirection: 'column', gap: '24px', minHeight: 'calc(100vh - 56px)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.028em', lineHeight: 1.1 }}>
              Work Sequence & Collaboration Engine
            </h1>
            <span style={{
              fontSize: '11px',
              background: 'rgba(255, 255, 255, 0.86)',
              color: '#0071e3',
              padding: '3px 10px',
              borderRadius: '980px',
              fontFamily: 'SF Mono, ui-monospace, monospace',
              fontWeight: 700,
              border: '1.5px solid rgba(0, 0, 0, 0.08)'
            }}>
              Spatial-Temporal Matcher
            </span>
          </div>
          <p style={{ fontSize: '14px', color: '#515154', marginTop: '6px', fontWeight: 400 }}>
            Identify co-excavation opportunities, resolve depth conflicts, and eliminate repetitive municipal road cutting
          </p>
        </div>

        {sequenceResult && (
          <div className="glass-card" style={{
            background: 'rgba(240, 246, 255, 0.92)',
            border: '1.5px solid rgba(0, 0, 0, 0.10)',
            padding: '10px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 4px 16px -2px rgba(0, 113, 227, 0.10)'
          }}>
            <Coins size={20} color="#0071e3" />
            <div>
              <div style={{ fontSize: '10.5px', color: '#0071e3', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
                Total Coordinated Municipal Savings
              </div>
              <div style={{ fontSize: '19px', fontWeight: 800, color: '#0071e3', fontFamily: 'SF Mono, ui-monospace, monospace' }}>
                {formatINR(sequenceResult.totalPotentialSavingsINR)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Selection & Filter Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 1fr', gap: '20px' }}>
        {/* Box 1: Primary Project Selector Submenu */}
        <div className="glass-card" style={{
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          border: '1.5px solid rgba(0, 0, 0, 0.08)',
          boxShadow: '0 8px 28px -4px rgba(0, 113, 227, 0.08)'
        }}>
          <label style={{ fontSize: '12px', fontWeight: 700, color: '#0071e3', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px', letterSpacing: '0.04em' }}>
            <Layers size={15} color="#0071e3" /> 1. Select Primary Tender / Corridor
          </label>

          <select
            className="form-select"
            value={primaryProjectId}
            onChange={e => setPrimaryProjectId(e.target.value)}
            style={{ fontWeight: 600, fontSize: '13.5px', padding: '11px 14px' }}
          >
            {projects.map(p => (
              <option key={p.id} value={p.id}>
                [{p.type}] {p.name} ({p.tenderNumber}) - {formatINR(p.budget)}
              </option>
            ))}
          </select>

          {/* Primary Project Snapshot */}
          {primaryProject && (
            <div style={{
              background: 'rgba(245, 245, 247, 0.85)',
              border: '1px solid rgba(0, 0, 0, 0.07)',
              borderRadius: '12px',
              padding: '14px',
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
              fontSize: '12px'
            }}>
              <div>
                <span style={{ color: '#86868b' }}>Corridor:</span>
                <div style={{ fontWeight: 700, color: '#1d1d1f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>
                  {primaryProject.locationName}
                </div>
              </div>
              <div>
                <span style={{ color: '#86868b' }}>Depth & Dimensions:</span>
                <div style={{ fontWeight: 700, color: '#0071e3', marginTop: '2px', fontFamily: 'SF Mono, ui-monospace, monospace' }}>
                  {formatDepth(primaryProject.depthMeters)} ({primaryProject.material || 'Standard'})
                </div>
              </div>
              <div>
                <span style={{ color: '#86868b' }}>Schedule:</span>
                <div style={{ fontWeight: 600, color: '#1d1d1f', marginTop: '2px' }}>
                  {formatDate(primaryProject.startDate)} → {formatDate(primaryProject.expectedCompletionDate)}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Box 2: Matching Parameters Submenu */}
        <div className="glass-card" style={{
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          border: '1.5px solid rgba(0, 0, 0, 0.08)',
          boxShadow: '0 8px 28px -4px rgba(0, 113, 227, 0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#0071e3', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px', letterSpacing: '0.04em' }}>
              <Sliders size={15} color="#0071e3" /> 2. Matching Engine Spatial Parameters
            </label>
            <span style={{ fontSize: '12px', color: '#515154' }}>
              Radius: <strong style={{ color: '#0071e3', fontWeight: 700 }}>{maxDistanceMeters}m</strong>
            </span>
          </div>

          {/* Distance Slider */}
          <div>
            <input
              type="range"
              min="50"
              max="2500"
              step="50"
              value={maxDistanceMeters}
              onChange={e => setMaxDistanceMeters(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#0071e3' }}
            />
          </div>

          {/* Sector Filter Chips */}
          <div>
            <div style={{ fontSize: '12px', color: '#86868b', marginBottom: '8px' }}>Target Sectors to Co-ordinate:</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {allTypes.map(t => {
                const isSelected = selectedTypes.length === 0 || selectedTypes.includes(t);
                return (
                  <button
                    key={t}
                    onClick={() => toggleTypeFilter(t)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '8px',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: isSelected ? 'none' : '1px solid rgba(0, 0, 0, 0.08)',
                      background: isSelected ? '#1d1d1f' : 'rgba(255, 255, 255, 0.8)',
                      color: isSelected ? '#ffffff' : '#515154',
                      boxShadow: isSelected ? '0 1px 3px rgba(0, 0, 0, 0.18)' : 'none',
                      transition: 'all 0.15s'
                    }}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* TOP 3 RECOMMENDATIONS SECTION */}
      <div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '16px',
          fontSize: '17px',
          fontWeight: 700,
          color: '#1d1d1f'
        }}>
          <Sparkles size={19} color="#0071e3" />
          <span>Top 3 Explainable Municipal Collaboration Opportunities</span>
        </div>

        {top3Recommendations.length === 0 ? (
          <div className="glass-card" style={{ padding: '40px', textAlign: 'center', color: '#86868b' }}>
            <Layers size={36} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#1d1d1f' }}>No candidate projects match current spatial radius</div>
            <div style={{ fontSize: '13px', marginTop: '4px', color: '#86868b' }}>Increase the corridor distance radius or select another primary tender.</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '18px' }}>
            {top3Recommendations.map(rec => (
              <RecommendationCard
                key={rec.candidateProject.id}
                match={rec}
                primaryProject={primaryProject}
                onOpen3D={onNavigateTo3D}
                onView2D={onNavigateTo2D}
              />
            ))}
          </div>
        )}
      </div>

      {/* ADDITIONAL CANDIDATES LIST */}
      {otherCandidates.length > 0 && (
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '14px' }}>
            Additional Evaluated Projects in Spatial Vicinity ({otherCandidates.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {otherCandidates.map(c => (
              <div
                key={c.candidateProject.id}
                style={{
                  background: 'rgba(255, 255, 255, 0.70)',
                  border: '1px solid rgba(255, 255, 255, 0.95)',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '13px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <TypeIcon type={c.candidateProject.type} size={16} />
                  <div>
                    <strong style={{ color: '#1d1d1f' }}>{c.candidateProject.name}</strong>
                    <div style={{ fontSize: '11.5px', color: '#86868b', marginTop: '1px' }}>
                      {c.candidateProject.tenderNumber} · Dist: {c.distanceMeters}m · Overlap: {c.dateOverlapDays} days
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: '#1a7f37', fontWeight: 700, fontFamily: 'SF Mono, ui-monospace, monospace' }}>
                      {formatINR(c.estimatedSavingINR)}
                    </div>
                    <div style={{ fontSize: '11px', color: '#86868b' }}>Match: {c.compositeScore}%</div>
                  </div>

                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => onNavigateTo3D(c.candidateProject)}
                  >
                    <Box size={13} />
                    <span>3D Twin</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
