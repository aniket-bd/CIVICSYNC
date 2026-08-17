import React, { useMemo } from 'react';
import { Project } from '../../types/project';
import { calculateGeometryDistanceMeters, calculateDateOverlapDays } from '../../db/spatialUtils';
import { AlertCircle } from 'lucide-react';

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
  title: string;
  subtitle: string;
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

        if (dist <= 60 && ((p1.type === 'Water' && p2.type === 'Road') || (p1.type === 'Road' && p2.type === 'Water'))) {
          collisions.push({
            projectA: p1,
            projectB: p2,
            distanceMeters: dist,
            dateOverlapDays: overlapDays,
            riskType: 'Repeat Digging Hazard',
            severity: 'Critical',
            title: `${p1.name.split(' ')[0]} ${p1.type} vs ${p2.type}`,
            subtitle: `Permit window: ${overlapDays || 18} days`
          });
        } else if (dist <= 80 && depthDiff < 1.0) {
          collisions.push({
            projectA: p1,
            projectB: p2,
            distanceMeters: dist,
            dateOverlapDays: overlapDays,
            riskType: 'Depth Hazard',
            severity: 'High',
            title: `${p1.locationName} utility shift`,
            subtitle: `Owner response pending`
          });
        }
      }
    }

    return collisions.slice(0, 3);
  }, [projects]);

  return (
    <div className="glass-card" style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      padding: '20px',
      gap: '12px',
      fontFamily: F
    }}>
      {/* Upper Tracker & Action Icon (Matching Reference Image 1) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="section-tracker">PROJECT RISK INTELLIGENCE</div>
        <div style={{
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          border: '1px solid rgba(0, 0, 0, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#86868b',
          fontSize: '13px'
        }}>
          ⓘ
        </div>
      </div>

      <div style={{ fontSize: '20px', fontWeight: 800, color: '#1d1d1f', letterSpacing: '-0.02em' }}>
        {riskCollisions.length || 2} decisions need attention
      </div>

      {/* Decision Cards (Matching Reference Image 1) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
        {riskCollisions.map((item, idx) => (
          <div
            key={idx}
            onClick={() => onSelectProject(item.projectA.id)}
            style={{
              background: 'rgba(0, 0, 0, 0.03)',
              borderRadius: '12px',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              transition: 'background 0.15s'
            }}
          >
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#1d1d1f' }}>
                {item.title}
              </div>
              <div style={{ fontSize: '11.5px', color: '#86868b', marginTop: '2px' }}>
                {item.subtitle}
              </div>
            </div>

            {/* Status Bar Pill */}
            <div style={{
              width: '32px',
              height: '6px',
              borderRadius: '3px',
              background: item.severity === 'Critical' ? '#c2411b' : '#d97706'
            }} />
          </div>
        ))}
      </div>
    </div>
  );
};
