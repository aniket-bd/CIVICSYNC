import React from 'react';
import { Project } from '../../types/project';
import { ArrowUpRight, CheckCircle2 } from 'lucide-react';

interface RegionalHistoryProps {
  selectedProject: Project | null;
}

const F = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif';

export const RegionalHistory: React.FC<RegionalHistoryProps> = () => {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr 1.2fr', gap: '16px', height: '100%' }}>
      {/* 1. REGIONAL HISTORY (Matching Image 1) */}
      <div className="glass-card" style={{ padding: '18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', fontFamily: F }}>
        <div>
          <div className="section-tracker">REGIONAL HISTORY</div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#1d1d1f' }}>18-month trajectory</div>
        </div>

        <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end', height: '36px', marginTop: '12px' }}>
          <div style={{ flex: 1, height: '40%', background: '#e0e0e5', borderRadius: '4px' }} />
          <div style={{ flex: 1, height: '55%', background: '#d0d0d5', borderRadius: '4px' }} />
          <div style={{ flex: 1, height: '70%', background: '#b0b0b8', borderRadius: '4px' }} />
          <div style={{ flex: 1, height: '85%', background: '#80808a', borderRadius: '4px' }} />
          <div style={{ flex: 1, height: '100%', background: '#1d1d1f', borderRadius: '4px' }} />
        </div>
      </div>

      {/* 2. PROGRAM HEALTH (Matching Image 1) */}
      <div className="glass-card" style={{ padding: '18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', fontFamily: F }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="section-tracker">PROGRAM HEALTH</div>
          <div style={{
            width: '26px',
            height: '26px',
            borderRadius: '50%',
            background: 'rgba(0, 0, 0, 0.04)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <CheckCircle2 size={15} color="#1d1d1f" />
          </div>
        </div>

        <div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#1d1d1f', letterSpacing: '-0.02em' }}>86%</div>
          <div style={{ fontSize: '12px', color: '#86868b', marginTop: '2px', fontWeight: 500 }}>capital plan on track</div>
        </div>
      </div>

      {/* 3. NEXT EXECUTIVE REVIEW (Matching Image 1) */}
      <div className="glass-card" style={{ padding: '18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', fontFamily: F }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="section-tracker">NEXT EXECUTIVE REVIEW</div>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: '#0071e3',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0, 113, 227, 0.35)'
          }}>
            <ArrowUpRight size={17} color="#ffffff" />
          </div>
        </div>

        <div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#1d1d1f', letterSpacing: '-0.01em' }}>Thursday, 09:30</div>
          <div style={{ fontSize: '12px', color: '#86868b', marginTop: '2px', fontWeight: 500 }}>Council chambers · Briefing room</div>
        </div>
      </div>
    </div>
  );
};
