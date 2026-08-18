import React from 'react';
import { WorkSequenceMatch } from '../../types/workSequence';
import { Project } from '../../types/project';
import { formatINR, formatDate, formatDepth, formatDistance } from '../../utils/formatters';
import { TypeIcon } from '../common/TypeIcon';
import { StatusBadge } from '../common/StatusBadge';
import { 
  Trophy, 
  Sparkles, 
  TrendingUp, 
  AlertTriangle, 
  Calendar, 
  Ruler, 
  ArrowRight, 
  HardHat,
  Box,
  Compass,
  CheckCircle2
} from 'lucide-react';

interface RecommendationCardProps {
  match: WorkSequenceMatch;
  primaryProject: Project;
  onOpen3D: (candidate: Project) => void;
  onView2D: (candidate: Project) => void;
}

export const RecommendationCard: React.FC<RecommendationCardProps> = ({
  match,
  primaryProject,
  onOpen3D,
  onView2D
}) => {
  const p = match.candidateProject;
  const isTopMatch = match.rank === 1;

  const getRankBadge = () => {
    switch (match.rank) {
      case 1:
        return { label: 'Top 1 • Best Collaboration Opportunity', bg: '#1d1d1f', color: '#ffffff' };
      case 2:
        return { label: 'Top 2 • High Sequence Synergy', bg: '#0071e3', color: '#ffffff' };
      case 3:
        return { label: 'Top 3 • Secondary Opportunity', bg: '#5856d6', color: '#ffffff' };
      default:
        return { label: `Rank #${match.rank} Match`, bg: '#f5f5f7', color: '#6e6e73' };
    }
  };

  const rankBadge = getRankBadge();

  return (
    <div
      className="glass-card"
      style={{
        padding: '18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        border: isTopMatch ? '1px solid rgba(0, 113, 227, 0.28)' : '1px solid rgba(0, 0, 0, 0.08)',
        boxShadow: isTopMatch ? '0 8px 24px rgba(0, 113, 227, 0.12)' : 'none',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Top Rank Badge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{
          fontSize: '11px',
          fontWeight: 700,
          background: rankBadge.bg,
          color: rankBadge.color,
          padding: '3px 10px',
          borderRadius: '999px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          {match.rank && match.rank <= 3 && <Trophy size={12} />}
          <span>{rankBadge.label}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <StatusBadge status={p.status} size="sm" />
          <span style={{
            fontSize: '12px',
            fontFamily: 'JetBrains Mono',
            fontWeight: 700,
            color: match.compositeScore >= 70 ? '#1a7f37' : '#0071e3'
          }}>
            Match: {match.compositeScore}%
          </span>
        </div>
      </div>

      {/* Candidate Project Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <TypeIcon type={p.type} size={18} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#1d1d1f' }}>
            {p.name}
          </div>
          <div style={{ fontSize: '11px', color: '#86868b', marginTop: '2px' }}>
            {p.tenderNumber} • {p.locationName} • {p.contractor}
          </div>
        </div>
      </div>

      {/* 4 Score Gauges (Must Try%, Skip%, Saving INR, Risk%) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '8px',
        background: '#f5f5f7',
        border: '1px solid rgba(0, 0, 0, 0.06)',
        borderRadius: '12px',
        padding: '10px'
      }}>
        {/* Must Try % */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '10px', color: '#86868b', textTransform: 'uppercase' }}>Must Try Score</div>
          <div style={{ fontSize: '15px', fontWeight: 800, color: '#0071e3', fontFamily: 'SF Mono, ui-monospace, monospace' }}>
            {match.mustTryScorePercent}%
          </div>
        </div>

        {/* Skip % */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '10px', color: '#86868b', textTransform: 'uppercase' }}>Skip Score</div>
          <div style={{ fontSize: '15px', fontWeight: 800, color: '#6e6e73', fontFamily: 'SF Mono, ui-monospace, monospace' }}>
            {match.skipScorePercent}%
          </div>
        </div>

        {/* Estimated Savings */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '10px', color: '#1a7f37', textTransform: 'uppercase' }}>Est. Potential Saving</div>
          <div style={{ fontSize: '15px', fontWeight: 800, color: '#1a7f37', fontFamily: 'SF Mono, ui-monospace, monospace' }}>
            {formatINR(match.estimatedSavingINR)}
          </div>
        </div>

        {/* Risk Score % */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '10px', color: '#ff3b30', textTransform: 'uppercase' }}>Risk Score</div>
          <div style={{ fontSize: '15px', fontWeight: 800, color: match.riskScorePercent > 70 ? '#ff3b30' : '#6e6e73', fontFamily: 'SF Mono, ui-monospace, monospace' }}>
            {match.riskScorePercent}%
          </div>
        </div>
      </div>

      {/* Deterministic Explanation Reasons (WHY it was recommended) */}
      <div style={{ background: '#fbfbfd', border: '1px solid rgba(0, 0, 0, 0.06)', borderRadius: '12px', padding: '12px' }}>
        <div style={{
          fontSize: '11px',
          fontWeight: 700,
          color: '#0071e3',
          textTransform: 'uppercase',
          marginBottom: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <Sparkles size={13} /> Why This Collaboration Was Recommended:
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {match.explanationReasons.map((reason, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12px', color: '#1d1d1f', lineHeight: 1.4 }}>
              <CheckCircle2 size={14} color="#1a7f37" style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>{reason}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Spatial & Physical Metrics Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px',
        fontSize: '11px',
        color: '#86868b',
        paddingTop: '6px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span>Corridor Distance: <strong style={{ color: '#1d1d1f' }}>{match.distanceMeters}m</strong></span>
          <span>Schedule Overlap: <strong style={{ color: '#1d1d1f' }}>{match.dateOverlapDays} days</strong></span>
          <span>Depth Difference: <strong style={{ color: '#0071e3' }}>{formatDepth(match.depthDifferenceMeters)}</strong></span>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => onView2D(p)}
          >
            <Compass size={12} />
            <span>Map</span>
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => onOpen3D(p)}
          >
            <Box size={12} />
            <span>Inspect 3D Co-location</span>
          </button>
        </div>
      </div>
    </div>
  );
};
