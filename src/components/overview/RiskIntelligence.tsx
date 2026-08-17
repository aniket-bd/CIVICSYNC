import React, { useMemo } from 'react';
import { Project } from '../../types/project';
import { calculateGeometryDistanceMeters, calculateDateOverlapDays } from '../../db/spatialUtils';
import { 
  AlertTriangle, 
  GitBranch, 
  Flame, 
  CalendarClock, 
  ShieldAlert, 
  CheckCircle,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { TypeIcon } from '../common/TypeIcon';
import { StatusBadge } from '../common/StatusBadge';

interface RiskIntelligenceProps {
  projects: Project[];
  onSelectProject: (projectId: string) => void;
}

export interface RiskCollisionItem {
  projectA: Project;
  projectB: Project;
  distanceMeters: number;
  dateOverlapDays: number;
  riskType: 'Corridor Collision' | 'Schedule Conflict' | 'Depth Hazard' | 'Repeat Digging Hazard';
  severity: 'Critical' | 'High' | 'Moderate';
  description: string;
}

const F = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif';

export const RiskIntelligence: React.FC<RiskIntelligenceProps> = ({
  projects,
  onSelectProject
}) => {
  const riskCollisions = useMemo(() => {
    const collisions: RiskCollisionItem[] = [];

    for (let i = 0; i < projects.length; i++) {
      for (let j = i + 1; j < projects.length; j++) {
        const p1 = projects[i];
        const p2 = projects[j];

        const dist = calculateGeometryDistanceMeters(
          p1.routeGeometry || { lat: p1.latitude, lng: p1.longitude },
          p2.routeGeometry || { lat: p2.latitude, lng: p2.longitude }
        );

        const overlapDays = calculateDateOverlapDays(
          p1.startDate,
          p1.expectedCompletionDate,
          p2.startDate,
          p2.expectedCompletionDate
        );

        const depthDiff = Math.abs((p1.depthMeters ?? 2.5) - (p2.depthMeters ?? 2.5));

        // Conflict Case 1: Road vs Pipeline on same corridor with overlapping dates
        if (dist <= 60 && ((p1.type === 'Water' && p2.type === 'Road') || (p1.type === 'Road' && p2.type === 'Water'))) {
          collisions.push({
            projectA: p1,
            projectB: p2,
            distanceMeters: dist,
            dateOverlapDays: overlapDays,
            riskType: 'Repeat Digging Hazard',
            severity: 'Critical',
            description: `Uncoordinated paving vs deep excavation on ${p1.locationName}. Paving will be cut if water pipe is delayed.`
          });
        }
        // Conflict Case 2: Deep Sewer vs Storm Drain at same depth (<1m separation)
        else if (dist <= 80 && depthDiff < 1.0 && ((p1.type === 'Drainage' && p2.type === 'Sewerage') || (p1.type === 'Sewerage' && p2.type === 'Drainage'))) {
          collisions.push({
            projectA: p1,
            projectB: p2,
            distanceMeters: dist,
            dateOverlapDays: overlapDays,
            riskType: 'Depth Hazard',
            severity: 'Critical',
            description: `Vertical elevation clearance conflict (<1.0m depth difference). Invert levels clash near corridor junction.`
          });
        }
        // Conflict Case 3: Concurrent construction corridor overlap
        else if (dist <= 150 && overlapDays > 20) {
          collisions.push({
            projectA: p1,
            projectB: p2,
            distanceMeters: dist,
            dateOverlapDays: overlapDays,
            riskType: 'Schedule Conflict',
            severity: 'High',
            description: `Concurrent construction in adjacent right-of-way (${overlapDays} days simultaneous activity). Causes traffic bottlenecks.`
          });
        }
      }
    }

    return collisions;
  }, [projects]);

  const activeCount = projects.filter(p => p.status === 'Active').length;
  const delayedProjects = projects.filter(p => p.status === 'Delayed');
  const highRiskProjects = projects.filter(p => p.riskScore >= 70);

  return (
    <div className="glass-card" style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      border: '1px solid rgba(255, 149, 0, 0.35)',
      boxShadow: '0 12px 36px -4px rgba(255, 149, 0, 0.12), 0 4px 16px -2px rgba(15, 23, 42, 0.06)',
      fontFamily: F
    }}>
      {/* Header with Frosted Orange Glass */}
      <div style={{
        padding: '14px 18px',
        borderBottom: '1px solid rgba(255, 149, 0, 0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'linear-gradient(135deg, rgba(255, 159, 10, 0.14) 0%, rgba(255, 107, 0, 0.06) 100%)',
        backdropFilter: 'blur(16px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Flame size={16} color="#ff6b00" />
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.01em' }}>
            Project Risk & Conflict Intelligence
          </h3>
        </div>

        <span style={{
          fontSize: '11px',
          color: riskCollisions.length > 0 ? '#ff6b00' : '#1a7f37',
          background: riskCollisions.length > 0 ? 'rgba(255, 149, 0, 0.15)' : 'rgba(48, 209, 88, 0.15)',
          border: riskCollisions.length > 0 ? '1px solid rgba(255, 149, 0, 0.3)' : '1px solid rgba(48, 209, 88, 0.3)',
          padding: '3px 9px',
          borderRadius: '980px',
          fontWeight: 700,
          fontFamily: 'SF Mono, ui-monospace, monospace'
        }}>
          {riskCollisions.length} Spatial Conflicts
        </span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Risk Indicators Quick Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.85)',
            border: '1px solid rgba(255, 149, 0, 0.25)',
            borderRadius: '12px',
            padding: '12px',
            boxShadow: '0 2px 8px rgba(255, 149, 0, 0.04)'
          }}>
            <div style={{ fontSize: '10.5px', color: '#86868b', textTransform: 'uppercase', fontWeight: 600 }}>Active In Execution</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#1a7f37', marginTop: '2px', fontFamily: 'SF Mono, ui-monospace, monospace' }}>
              {activeCount}
            </div>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, rgba(255, 242, 240, 0.9) 0%, rgba(255, 237, 213, 0.85) 100%)',
            border: '1px solid rgba(255, 107, 0, 0.35)',
            borderRadius: '12px',
            padding: '12px',
            boxShadow: '0 2px 8px rgba(255, 107, 0, 0.06)'
          }}>
            <div style={{ fontSize: '10.5px', color: '#c2411b', textTransform: 'uppercase', fontWeight: 600 }}>Delayed Works</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#c2411b', marginTop: '2px', fontFamily: 'SF Mono, ui-monospace, monospace' }}>
              {delayedProjects.length}
            </div>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, rgba(255, 247, 237, 0.9) 0%, rgba(254, 243, 199, 0.85) 100%)',
            border: '1px solid rgba(255, 149, 0, 0.4)',
            borderRadius: '12px',
            padding: '12px',
            boxShadow: '0 2px 8px rgba(255, 149, 0, 0.08)'
          }}>
            <div style={{ fontSize: '10.5px', color: '#ff6b00', textTransform: 'uppercase', fontWeight: 700 }}>High Risk Score</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#ff6b00', marginTop: '2px', fontFamily: 'SF Mono, ui-monospace, monospace' }}>
              {highRiskProjects.length}
            </div>
          </div>
        </div>

        {/* Conflict List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {riskCollisions.length === 0 ? (
            <div style={{
              background: 'rgba(255, 255, 255, 0.7)',
              border: '1px dashed rgba(255, 149, 0, 0.35)',
              borderRadius: '12px',
              padding: '24px',
              textAlign: 'center',
              color: '#86868b'
            }}>
              <CheckCircle size={24} color="#1a7f37" style={{ margin: '0 auto 8px' }} />
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#1d1d1f' }}>Zero Unmitigated Spatial Collisions</div>
              <div style={{ fontSize: '11px', marginTop: '3px', color: '#86868b' }}>
                All current excavation depths and road paving schedules are temporally decoupled.
              </div>
            </div>
          ) : (
            riskCollisions.map((conflict, idx) => (
              <div
                key={idx}
                style={{
                  background: 'rgba(255, 255, 255, 0.85)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid rgba(255, 149, 0, 0.3)',
                  borderRadius: '12px',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  boxShadow: '0 4px 14px rgba(255, 149, 0, 0.06)'
                }}
              >
                {/* Conflict Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertTriangle size={15} color={conflict.severity === 'Critical' ? '#ff453a' : '#ff9f0a'} />
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: conflict.severity === 'Critical' ? '#c2411b' : '#ff6b00',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em'
                    }}>
                      {conflict.riskType}
                    </span>
                  </div>

                  <span style={{
                    fontSize: '10px',
                    fontFamily: 'SF Mono, ui-monospace, monospace',
                    background: conflict.severity === 'Critical' ? 'rgba(254, 242, 240, 0.9)' : 'rgba(255, 247, 237, 0.9)',
                    color: conflict.severity === 'Critical' ? '#c2411b' : '#ff6b00',
                    border: conflict.severity === 'Critical' ? '1px solid rgba(194, 65, 27, 0.3)' : '1px solid rgba(255, 149, 0, 0.3)',
                    padding: '2px 7px',
                    borderRadius: '980px',
                    fontWeight: 700
                  }}>
                    {conflict.severity} Severity
                  </span>
                </div>

                {/* Conflict Projects Comparison */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto 1fr',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'linear-gradient(135deg, rgba(255, 247, 237, 0.75) 0%, rgba(255, 237, 213, 0.65) 100%)',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  border: '1px solid rgba(255, 149, 0, 0.2)'
                }}>
                  <div
                    onClick={() => onSelectProject(conflict.projectA.id)}
                    style={{ cursor: 'pointer', overflow: 'hidden' }}
                  >
                    <div style={{ fontWeight: 700, color: '#1d1d1f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {conflict.projectA.name}
                    </div>
                    <div style={{ fontSize: '10px', color: '#ff6b00', fontWeight: 600 }}>{conflict.projectA.type} ({conflict.projectA.tenderNumber})</div>
                  </div>

                  <ArrowRight size={14} color="#ff6b00" style={{ flexShrink: 0 }} />

                  <div
                    onClick={() => onSelectProject(conflict.projectB.id)}
                    style={{ cursor: 'pointer', overflow: 'hidden', textAlign: 'right' }}
                  >
                    <div style={{ fontWeight: 700, color: '#1d1d1f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {conflict.projectB.name}
                    </div>
                    <div style={{ fontSize: '10px', color: '#ff6b00', fontWeight: 600 }}>{conflict.projectB.type} ({conflict.projectB.tenderNumber})</div>
                  </div>
                </div>

                {/* Description & Metrics */}
                <p style={{ fontSize: '11.5px', color: '#515154', lineHeight: 1.45 }}>
                  {conflict.description}
                </p>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: '#86868b', borderTop: '1px solid rgba(0, 0, 0, 0.05)', paddingTop: '6px' }}>
                  <span>Spatial Proximity: <strong style={{ color: '#ff6b00' }}>{conflict.distanceMeters}m</strong></span>
                  <span>Temporal Overlap: <strong style={{ color: '#c2411b' }}>{conflict.dateOverlapDays} Days</strong></span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
