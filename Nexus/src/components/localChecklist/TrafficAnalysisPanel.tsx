import React from 'react';
import { TrafficImpactSuggestion } from '../../types/localChecklist';
import { 
  Car, 
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
          <Car size={16} color="#0071e3" />
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#1d1d1f' }}>
            Traffic Impact & Route Management Plans
          </h3>
        </div>

        <span style={{ fontSize: '10px', color: '#0071e3', background: 'rgba(0, 113, 227, 0.08)', padding: '2px 8px', borderRadius: '980px', fontWeight: 600, border: '1px solid rgba(0, 113, 227, 0.16)' }}>
          Planning Suggestions (Non-Statutory)
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {suggestions.map(item => (
          <div
            key={item.id}
            style={{
              background: '#f5f5f7',
              border: '1px solid rgba(0, 0, 0, 0.06)',
              borderRadius: '12px',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            {/* Road & Congestion Status */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#1d1d1f' }}>
                  {item.affectedRoad}
                </div>
                <div style={{ fontSize: '11px', color: '#86868b' }}>
                  Ward: {item.ward}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: item.currentCongestionLevel === 'Severe' ? '#ff3b30' : '#6e6e73',
                  background: item.currentCongestionLevel === 'Severe' ? 'rgba(255, 59, 48, 0.10)' : 'rgba(0, 0, 0, 0.05)',
                  padding: '2px 8px',
                  borderRadius: '980px'
                }}>
                  {item.currentCongestionLevel} Congestion
                </span>
                <div style={{ fontSize: '10px', color: '#86868b', marginTop: '2px' }}>
                  + ~{item.potentialDelayMinutes} min travel delay
                </div>
              </div>
            </div>

            {/* Suggested Traffic Management Concept */}
            <div style={{
              background: '#ffffff',
              border: '1px solid rgba(0, 0, 0, 0.06)',
              borderRadius: '10px',
              padding: '10px 12px'
            }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#0071e3', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <Lightbulb size={13} /> Suggested Engineering Concept: {item.suggestedConcept}
              </div>
              <p style={{ fontSize: '12px', color: '#515154', lineHeight: 1.4 }}>
                {item.conceptDetails}
              </p>
            </div>

            {/* Alternative Routes Grid */}
            {item.alternativeRoutes.length > 0 && (
              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#86868b', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Route size={12} /> Recommended Alternative Diversion Corridors:
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                  {item.alternativeRoutes.map((alt, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: '#ffffff',
                        border: '1px solid rgba(0, 0, 0, 0.06)',
                        borderRadius: '10px',
                        padding: '8px 10px',
                        fontSize: '11px'
                      }}
                    >
                      <div style={{ fontWeight: 600, color: '#1d1d1f' }}>{alt.routeName}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#86868b', marginTop: '4px' }}>
                        <span>Offset: +{alt.distanceDeltaKm} km</span>
                        <span style={{ color: '#1a7f37' }}>~{alt.estimatedTimeMin} mins</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
