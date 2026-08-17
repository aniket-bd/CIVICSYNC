import React, { useState, useMemo } from 'react';
import { Project } from '../../types/project';
import { WorkSequenceFilter } from '../../types/workSequence';
import { WorkSequenceEngine } from '../../services/workSequenceEngine';
import { store } from '../../db/store';
import { RecommendationCard } from './RecommendationCard';
import { formatINR } from '../../utils/formatters';
import { 
  ChevronDown, 
  RefreshCw, 
  CheckCircle2, 
  ArrowRight
} from 'lucide-react';

interface WorkSequenceViewProps {
  onNavigateTo3D: (project: Project) => void;
  onNavigateTo2D: (project: Project) => void;
}

const F = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif';

export const WorkSequenceView: React.FC<WorkSequenceViewProps> = ({
  onNavigateTo3D,
  onNavigateTo2D
}) => {
  const projects = store.getProjects();
  const [primaryProjectId, setPrimaryProjectId] = useState<string>(projects[0]?.id || 'TND-011');
  const [maxDistanceMeters, setMaxDistanceMeters] = useState<number>(3500);

  const primaryProject = projects.find(p => p.id === primaryProjectId) || projects[0];

  const sequenceResult = useMemo(() => {
    if (!primaryProject) return null;

    const filter: WorkSequenceFilter = {
      primaryProjectId: primaryProject.id,
      allowedStatuses: ['Approved', 'Pending', 'Active', 'Completed'],
      minDepth: 0,
      maxDepth: 10,
      maxDistanceMeters,
      startDateFrom: '2025-01-01',
      startDateTo: '2028-12-31',
      selectedTypes: [],
      limitCount: 10
    };

    return WorkSequenceEngine.evaluateWorkSequence(primaryProject, projects, filter);
  }, [primaryProject, projects, maxDistanceMeters]);

  const top3Recommendations = sequenceResult ? sequenceResult.recommendations.slice(0, 3) : [];

  return (
    <div style={{ padding: '24px 40px', display: 'flex', flexDirection: 'column', gap: '20px', minHeight: 'calc(100vh - 64px)', fontFamily: F }}>
      {/* ── TOP HEADER SECTION (Directly matching Reference Image 3) ── */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div className="section-tracker">TENDER INTELLIGENCE</div>
          <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#1d1d1f', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
            Collaboration workflow
          </h1>
          <p style={{ fontSize: '14px', color: '#515154', marginTop: '4px', fontWeight: 400 }}>
            Explainable tender matches for coordinated municipal delivery decisions.
          </p>
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
          <span>Updated 12 min ago · Regional portfolio</span>
        </div>
      </div>

      {/* ── UNIFIED GLASS CONTROL BAR (Directly matching Reference Image 3) ── */}
      <div className="glass-card" style={{
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '20px',
        border: '1px solid rgba(255, 255, 255, 0.95)'
      }}>
        {/* Select Primary Tender Dropdown Pill */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div className="section-tracker">SELECT PRIMARY TENDER</div>
          <div style={{ position: 'relative', width: '360px' }}>
            <select
              value={primaryProjectId}
              onChange={e => setPrimaryProjectId(e.target.value)}
              style={{
                appearance: 'none',
                width: '100%',
                background: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid rgba(0, 0, 0, 0.12)',
                borderRadius: '980px',
                padding: '9px 36px 9px 16px',
                fontSize: '13px',
                fontWeight: 700,
                color: '#1d1d1f',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.tenderNumber} · {formatINR(p.budget)})
                </option>
              ))}
            </select>
            <ChevronDown size={14} color="#86868b" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          </div>
        </div>

        {/* Sliders (Geographic overlap, Programme fit, Schedule proximity) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '130px' }}>
            <div style={{ fontSize: '11.5px', color: '#515154', display: 'flex', justifyContent: 'space-between' }}>
              <span>Geographic overlap</span>
              <strong style={{ color: '#0071e3' }}>82%</strong>
            </div>
            <input type="range" min="1000" max="5000" step="100" value={maxDistanceMeters} onChange={e => setMaxDistanceMeters(Number(e.target.value))} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '130px' }}>
            <div style={{ fontSize: '11.5px', color: '#515154', display: 'flex', justifyContent: 'space-between' }}>
              <span>Programme fit</span>
              <strong style={{ color: '#0071e3' }}>74%</strong>
            </div>
            <input type="range" min="0" max="100" defaultValue="74" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '130px' }}>
            <div style={{ fontSize: '11.5px', color: '#515154', display: 'flex', justifyContent: 'space-between' }}>
              <span>Schedule proximity</span>
              <strong style={{ color: '#0071e3' }}>68%</strong>
            </div>
            <input type="range" min="0" max="100" defaultValue="68" />
          </div>
        </div>

        {/* Refresh Matches Apple Blue Button */}
        <button className="btn btn-primary" style={{ padding: '9px 20px' }}>
          <RefreshCw size={14} />
          <span>Refresh matches</span>
        </button>
      </div>

      {/* ── TOP EXPLAINABLE COLLABORATION OPPORTUNITIES (3 Vertical Pillars) ── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#1d1d1f', letterSpacing: '-0.02em' }}>
            Top explainable collaboration opportunities
          </h3>
          <span style={{ fontSize: '12px', color: '#86868b', cursor: 'pointer' }}>View all 12</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
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
      </div>

      {/* ── EXPLAINABLE COLLABORATION LOGIC (Directly matching Reference Image 3) ── */}
      <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', border: '1px solid rgba(255, 255, 255, 0.95)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="section-tracker">EXPLAINABLE COLLABORATION LOGIC</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#1d1d1f', letterSpacing: '-0.02em', marginTop: '2px' }}>
              Why {top3Recommendations[0]?.candidateProject.name.split(' ')[0] || 'East Loop'} is the strongest companion tender
            </div>
          </div>

          <span style={{
            fontSize: '12px',
            fontWeight: 700,
            color: '#1d1d1f',
            background: 'rgba(0, 0, 0, 0.04)',
            padding: '5px 12px',
            borderRadius: '980px'
          }}>
            91% evidence confidence
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '24px', alignItems: 'center' }}>
          {/* Checkmark List (Matching Image 3) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              '1.8 km shared work zone — utility excavation overlaps the North River staging boundary along corridor.',
              'Compatible mobilisation window — both procurement schedules enter construction within a 42-day window.',
              'Reusable traffic management plan — proposed detour network covers two shared arterial intersections.',
              'Material procurement consolidation — joint pipe and trench-restoration packages reduce forecasted procurement variance.'
            ].map((text, idx) => (
              <div key={idx} style={{
                background: 'rgba(255, 255, 255, 0.75)',
                borderRadius: '12px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontSize: '13px',
                color: '#1d1d1f',
                boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
              }}>
                <div style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  background: '#0071e3',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 800,
                  flexShrink: 0
                }}>
                  ✓
                </div>
                <span>{text}</span>
              </div>
            ))}
          </div>

          {/* Right Executive Recommendation Card (Matching Image 3) */}
          <div style={{
            background: 'rgba(0, 0, 0, 0.03)',
            borderRadius: '16px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div className="section-tracker">EXECUTIVE RECOMMENDATION</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#1d1d1f', lineHeight: 1.4 }}>
              Authorize a joint delivery discovery session before tender award.
            </div>
            <p style={{ fontSize: '12px', color: '#515154', lineHeight: 1.45 }}>
              Expected value is driven by shared traffic control, coordinated excavation, and aligned contractor mobilisation.
            </p>

            <button className="btn btn-dark" style={{ width: '100%', justifyContent: 'center', marginTop: '6px' }}>
              <span>Prepare decision brief</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
