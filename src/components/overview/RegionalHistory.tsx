import React from 'react';
import { Project } from '../../types/project';
import { store } from '../../db/store';
import { formatINR, formatDepth } from '../../utils/formatters';
import { 
  History, 
  AlertCircle, 
  HardHat, 
  Coins, 
  MessageSquare,
  FileQuestion,
  Sparkles
} from 'lucide-react';

interface RegionalHistoryProps {
  selectedProject: Project | null;
}

const F = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif';

export const RegionalHistory: React.FC<RegionalHistoryProps> = ({ selectedProject }) => {
  const historyRecords = store.getRegionalHistory();
  const complaints = store.getComplaints();

  // Filter records related to the selected project's ward/location or general region
  const matchingHistory = selectedProject
    ? historyRecords.filter(h => 
        h.wardOrRegion.toLowerCase().includes(selectedProject.wardOrRegion.toLowerCase()) ||
        selectedProject.wardOrRegion.toLowerCase().includes(h.wardOrRegion.toLowerCase()) ||
        h.locationName.toLowerCase().includes(selectedProject.locationName.toLowerCase())
      )
    : historyRecords;

  const matchingComplaints = selectedProject
    ? complaints.filter(c => 
        c.projectId === selectedProject.id ||
        (c.locationName && selectedProject.locationName && c.locationName.toLowerCase().includes(selectedProject.locationName.toLowerCase()))
      )
    : complaints.slice(0, 3);

  return (
    <div className="glass-card" style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      border: '1px solid rgba(0, 0, 0, 0.08)',
      boxShadow: '0 12px 36px -4px rgba(0, 113, 227, 0.08), 0 4px 16px -2px rgba(15, 23, 42, 0.06)',
      fontFamily: F
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 18px',
        borderBottom: '1px solid rgba(0, 0, 0, 0.07)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(245, 245, 247, 0.72)',
        backdropFilter: 'blur(16px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <History size={16} color="#0071e3" />
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.01em' }}>
            Regional History & Local Intelligence
          </h3>
        </div>

        {selectedProject && (
          <span style={{
            fontSize: '11px',
            color: '#0071e3',
            background: 'rgba(0, 113, 227, 0.10)',
            border: '1px solid rgba(0, 0, 0, 0.08)',
            padding: '2px 8px',
            borderRadius: '980px',
            fontFamily: 'SF Mono, ui-monospace, monospace',
            fontWeight: 600
          }}>
            {selectedProject.wardOrRegion}
          </span>
        )}
      </div>

      {/* Content Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Active Focus Banner */}
        {selectedProject ? (
          <div style={{
            background: 'rgba(255, 255, 255, 0.86)',
            border: '1px solid rgba(0, 0, 0, 0.08)',
            borderRadius: '12px',
            padding: '12px 14px',
            fontSize: '12.5px',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.08)'
          }}>
            <div style={{ color: '#0071e3', fontSize: '10.5px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Sparkles size={12} /> Inspecting Municipal Zone
            </div>
            <div style={{ fontWeight: 700, color: '#1d1d1f', marginTop: '3px', fontSize: '13.5px' }}>
              {selectedProject.locationName}
            </div>
          </div>
        ) : (
          <div style={{
            background: 'rgba(245, 245, 247, 0.72)',
            border: '1px dashed rgba(0, 0, 0, 0.08)',
            borderRadius: '12px',
            padding: '12px',
            fontSize: '12px',
            color: '#86868b',
            textAlign: 'center'
          }}>
            Click any project or location on the map to filter regional historical archives.
          </div>
        )}

        {/* Section 1: Historical Construction Work */}
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#0071e3', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>
            Verified Past Infrastructure Work ({matchingHistory.length})
          </div>

          {matchingHistory.length === 0 ? (
            <div style={{
              background: 'rgba(255, 255, 255, 0.65)',
              border: '1px dashed rgba(0, 0, 0, 0.08)',
              borderRadius: '12px',
              padding: '20px',
              textAlign: 'center',
              color: '#86868b'
            }}>
              <FileQuestion size={22} style={{ margin: '0 auto 6px', opacity: 0.5, color: '#6e6e73' }} />
              <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#1d1d1f' }}>No historical data available.</div>
              <div style={{ fontSize: '11px', marginTop: '2px', color: '#86868b' }}>No prior municipal contracts archived for this exact spatial corridor.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {matchingHistory.map(record => (
                <div
                  key={record.id}
                  style={{
                    background: 'rgba(255, 255, 255, 0.82)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(0, 0, 0, 0.07)',
                    borderRadius: '12px',
                    padding: '13px 15px',
                    fontSize: '12.5px',
                    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.05)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ fontWeight: 700, color: '#1d1d1f', fontSize: '13px' }}>
                      {record.projectName}
                    </div>
                    <span style={{
                      fontSize: '10.5px',
                      fontFamily: 'SF Mono, ui-monospace, monospace',
                      background: 'rgba(0, 113, 227, 0.08)',
                      color: '#0071e3',
                      border: '1px solid rgba(0, 0, 0, 0.07)',
                      padding: '2px 6px',
                      borderRadius: '6px',
                      fontWeight: 600
                    }}>
                      {record.year}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '6px', color: '#515154', fontSize: '11.5px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <HardHat size={13} color="#1a7f37" /> {record.contractor}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Coins size={13} color="#0071e3" /> {formatINR(record.budget)}
                    </div>
                    {record.depthMeters && (
                      <div>Depth: <strong style={{ color: '#0071e3' }}>{formatDepth(record.depthMeters)}</strong></div>
                    )}
                  </div>

                  <p style={{ fontSize: '11.5px', color: '#515154', marginTop: '6px', lineHeight: 1.45 }}>
                    {record.inspectionSummary}
                  </p>

                  {record.knownIssues.length > 0 && (
                    <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      {record.knownIssues.map((issue, i) => (
                        <div key={i} style={{ fontSize: '11px', color: '#c2411b', display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(254, 242, 240, 0.7)', padding: '3px 6px', borderRadius: '4px' }}>
                          <AlertCircle size={12} /> {issue}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 2: Local Citizen Complaints */}
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#0071e3', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <MessageSquare size={13} /> Active Complaints & Incident Reports ({matchingComplaints.length})
          </div>

          {matchingComplaints.length === 0 ? (
            <div style={{ fontSize: '11.5px', color: '#86868b', fontStyle: 'italic', padding: '6px 0' }}>
              No active citizen complaints reported for this zone.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {matchingComplaints.map(comp => (
                <div
                  key={comp.id}
                  style={{
                    background: 'rgba(255, 255, 255, 0.82)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(0, 0, 0, 0.07)',
                    borderRadius: '10px',
                    padding: '11px 13px',
                    fontSize: '12px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      color: comp.urgency === 'Critical' ? '#c2411b' : '#0071e3',
                      background: comp.urgency === 'Critical' ? 'rgba(254, 242, 240, 0.9)' : 'rgba(255, 255, 255, 0.86)',
                      border: comp.urgency === 'Critical' ? '1px solid rgba(194, 65, 27, 0.3)' : '1px solid rgba(0, 0, 0, 0.08)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      textTransform: 'uppercase'
                    }}>
                      {comp.urgency} · {comp.category}
                    </span>
                    <span style={{ fontSize: '10.5px', color: '#86868b' }}>{comp.date}</span>
                  </div>
                  <div style={{ fontWeight: 600, color: '#1d1d1f', marginTop: '4px', fontSize: '12.5px' }}>{comp.title}</div>
                  <div style={{ fontSize: '11px', color: '#515154', marginTop: '2px' }}>{comp.description}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
