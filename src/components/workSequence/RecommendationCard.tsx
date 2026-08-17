import React from 'react';
import { WorkSequenceMatch } from '../../types/workSequence';
import { Project } from '../../types/project';
import { formatINR } from '../../utils/formatters';
import { Bookmark, ArrowRight } from 'lucide-react';

interface RecommendationCardProps {
  match: WorkSequenceMatch;
  primaryProject: Project;
  onOpen3D: (candidate: Project) => void;
  onView2D: (candidate: Project) => void;
}

const F = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif';

export const RecommendationCard: React.FC<RecommendationCardProps> = ({
  match,
  onOpen3D
}) => {
  const p = match.candidateProject;

  const getPillarCategory = () => {
    switch (match.rank) {
      case 1:  return 'HIGHEST VALUE';
      case 2:  return 'SHARED CORRIDOR';
      case 3:  return 'SEQUENCING GAIN';
      default: return `RANK #${match.rank} Synergy`;
    }
  };

  return (
    <div
      className="glass-card"
      style={{
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        fontFamily: F,
        justifyContent: 'space-between',
        height: '100%',
        border: '1px solid rgba(255, 255, 255, 0.95)',
        boxShadow: '0 12px 32px -4px rgba(0, 0, 0, 0.05)'
      }}
    >
      {/* Category Tracker & Bookmark */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="section-tracker">{getPillarCategory()}</div>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            border: '1px solid rgba(0, 0, 0, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            background: 'rgba(255, 255, 255, 0.8)'
          }}>
            <Bookmark size={15} color="#515154" />
          </div>
        </div>

        <div style={{ fontSize: '18px', fontWeight: 800, color: '#1d1d1f', marginTop: '4px', letterSpacing: '-0.02em' }}>
          {p.name}
        </div>
        <div style={{ fontSize: '12px', color: '#86868b', marginTop: '2px' }}>
          {p.tenderNumber} · {p.type}
        </div>
      </div>

      {/* 2 Large Circular Score Rings (Directly matching Reference Image 3) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', margin: '10px 0' }}>
        {/* Blue Savings Circle Ring */}
        <div style={{
          width: '110px',
          height: '110px',
          borderRadius: '50%',
          border: '3.5px solid #0071e3',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0, 113, 227, 0.03)',
          boxShadow: '0 4px 16px rgba(0, 113, 227, 0.12)'
        }}>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#0071e3', fontFamily: F }}>
            {formatINR(match.estimatedSavingINR).replace('₹', '')}
          </div>
          <div style={{ fontSize: '9.5px', color: '#86868b', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: '1px' }}>
            SAVINGS
          </div>
        </div>

        {/* Gold/Amber Risk Index Circle Ring */}
        <div style={{
          width: '110px',
          height: '110px',
          borderRadius: '50%',
          border: '3.5px solid #d97706',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(217, 119, 6, 0.03)',
          boxShadow: '0 4px 16px rgba(217, 119, 6, 0.12)'
        }}>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#1d1d1f', fontFamily: F }}>
            {match.riskScorePercent}
          </div>
          <div style={{ fontSize: '9.5px', color: '#86868b', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: '1px' }}>
            RISK INDEX
          </div>
        </div>
      </div>

      {/* Match Confidence Progress Bar */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#515154', fontWeight: 500, marginBottom: '6px' }}>
          <span>Match confidence</span>
          <span style={{ fontWeight: 700, color: '#1d1d1f' }}>{match.compositeScore}%</span>
        </div>
        <div style={{ width: '100%', height: '5px', background: 'rgba(0, 0, 0, 0.06)', borderRadius: '980px', overflow: 'hidden' }}>
          <div style={{ width: `${match.compositeScore}%`, height: '100%', background: '#0071e3', borderRadius: '980px' }} />
        </div>
      </div>

      {/* Action Button (Review Evidence →) */}
      <button
        className="btn btn-outline"
        onClick={() => onOpen3D(p)}
        style={{ width: '100%', justifyContent: 'center', gap: '8px', padding: '10px' }}
      >
        <span>Review evidence</span>
        <ArrowRight size={14} />
      </button>
    </div>
  );
};
