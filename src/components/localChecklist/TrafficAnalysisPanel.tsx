import React from 'react';
import { TrafficImpactSuggestion } from '../../types/localChecklist';
import { 
  Car, 
  AlertTriangle, 
  CornerUpRight, 
  Clock, 
  ShieldCheck, 
  Lightbulb,
  Route
} from 'lucide-react';

interface TrafficAnalysisPanelProps {
  suggestions: TrafficImpactSuggestion[];
}

export const TrafficAnalysisPanel: React.FC<TrafficAnalysisPanelProps> = ({ suggestions }) => {
  return (
    <div className="glass-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Car size={16} color="#f59e0b" />
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>
            Traffic Impact & Route Management Plans
          </h3>
        </div>

        <span style={{ fontSize: '10px', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.15)', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
          Planning Suggestions (Non-Statutory)
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', maxHeight: '350px' }}>
        {suggestions.map(item => {
          const isSevere = item.currentCongestionLevel === 'Severe';
          return (
            <div
              key={item.id}
              style={{
                position: 'relative',
                background: isSevere ? 'linear-gradient(135deg, rgba(254, 242, 240, 0.85) 0%, rgba(255, 237, 213, 0.70) 100%)' : 'linear-gradient(135deg, rgba(254, 248, 231, 0.85) 0%, rgba(255, 247, 237, 0.70) 100%)',
                border: isSevere ? '1px solid rgba(194, 65, 27, 0.3)' : '1px solid rgba(154, 103, 0, 0.3)',
                borderRadius: '14px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                backdropFilter: 'blur(20px)',
                boxShadow: isSevere ? '0 4px 16px rgba(194, 65, 27, 0.08)' : '0 4px 16px rgba(154, 103, 0, 0.08)'
              }}
            >
              {/* Road & Congestion Status */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#1d1d1f' }}>
                    {item.affectedRoad}
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#86868b', marginTop: '2px' }}>
                    Ward: {item.ward}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: isSevere ? '#c2411b' : '#9a6700',
                    background: isSevere ? 'rgba(254, 242, 240, 0.9)' : 'rgba(254, 248, 231, 0.9)',
                    padding: '3px 10px',
                    borderRadius: '980px',
                    border: isSevere ? '1px solid rgba(194, 65, 27, 0.3)' : '1px solid rgba(154, 103, 0, 0.3)'
                  }}>
                    {item.currentCongestionLevel} Congestion
                  </span>
                  <div style={{ fontSize: '11px', color: '#86868b', marginTop: '4px', fontFamily: 'SF Mono, ui-monospace, monospace', fontWeight: 600 }}>
                    +~{item.potentialDelayMinutes} min travel delay
                  </div>
                </div>
              </div>

              {/* Suggested Traffic Management Concept */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.85)',
                border: '1px solid rgba(0, 0, 0, 0.06)',
                borderRadius: '10px',
                padding: '10px 14px'
              }}>
                <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#0071e3', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <Lightbulb size={13} /> Concept: {item.suggestedConcept}
                </div>
                <p style={{ fontSize: '12px', color: '#515154', lineHeight: 1.45 }}>
                  {item.conceptDetails}
                </p>
              </div>

              {/* Alternative Diversion Routes */}
              {item.alternativeRoutes.length > 0 && (
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Route size={12} color="#0071e3" /> Alternative Diversion Corridors:
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                    {item.alternativeRoutes.map((alt, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: 'rgba(255, 255, 255, 0.85)',
                          border: '1px solid rgba(0, 0, 0, 0.06)',
                          borderRadius: '8px',
                          padding: '8px 10px',
                          fontSize: '11.5px'
                        }}
                      >
                        <div style={{ fontWeight: 600, color: '#1d1d1f' }}>{alt.routeName}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#86868b', marginTop: '3px' }}>
                          <span>+{alt.distanceDeltaKm} km</span>
                          <span style={{ color: '#1a7f37', fontWeight: 700 }}>~{alt.estimatedTimeMin} mins</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
