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
        return { label: 'Top 1 • Best Collaboration Opportunity', bg: 'linear-gradient(135deg, #0284c7, #0369a1)', color: '#ffffff' };
      case 2:
        return { label: 'Top 2 • High Sequence Synergy', bg: 'linear-gradient(135deg, #10b981, #059669)', color: '#ffffff' };
      case 3:
        return { label: 'Top 3 • Secondary Opportunity', bg: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', color: '#ffffff' };
      default:
        return { label: `Rank #${match.rank} Match`, bg: '#1e293b', color: '#94a3b8' };
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
        border: isTopMatch ? '1px solid #0284c7' : '1px solid #1e293b',
        boxShadow: isTopMatch ? '0 0 20px rgba(2, 132, 199, 0.2)' : 'none',
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
            color: match.compositeScore >= 70 ? '#34d399' : '#38bdf8'
          }}>
            Match: {match.compositeScore}%
          </span>
        </div>
      </div>

      {/* Candidate Project Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <TypeIcon type={p.type} size={18} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc' }}>
            {p.name}
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
            {p.tenderNumber} • {p.locationName} • {p.contractor}
          </div>
        </div>
      </div>

      {/* Circular Progress Dials with Soft Neon Glow Fills */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '8px',
        background: 'rgba(255, 255, 255, 0.65)',
        border: '1px solid rgba(0, 0, 0, 0.06)',
        borderRadius: '14px',
        padding: '12px 8px',
        backdropFilter: 'blur(20px)'
      }}>
        {/* Must Try Score Dial */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(0, 113, 227, 0.15) 0%, rgba(255, 255, 255, 0.9) 70%)',
            border: '2.5px solid #0071e3',
            boxShadow: '0 0 12px rgba(0, 113, 227, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12.5px',
            fontWeight: 800,
            color: '#0071e3',
            fontFamily: 'SF Mono, ui-monospace, monospace'
          }}>
            {match.mustTryScorePercent}%
          </div>
          <div style={{ fontSize: '10px', color: '#86868b', fontWeight: 600, textTransform: 'uppercase', textAlign: 'center' }}>Must Try</div>
        </div>

        {/* Skip Score Dial */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            background: 'rgba(245, 245, 247, 0.9)',
            border: '2.5px solid #86868b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12.5px',
            fontWeight: 800,
            color: '#515154',
            fontFamily: 'SF Mono, ui-monospace, monospace'
          }}>
            {match.skipScorePercent}%
          </div>
          <div style={{ fontSize: '10px', color: '#86868b', fontWeight: 600, textTransform: 'uppercase', textAlign: 'center' }}>Skip</div>
        </div>

        {/* Estimated Savings */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(26, 127, 55, 0.15) 0%, rgba(255, 255, 255, 0.9) 70%)',
            border: '2.5px solid #1a7f37',
            boxShadow: '0 0 12px rgba(26, 127, 55, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '10.5px',
            fontWeight: 800,
            color: '#1a7f37',
            fontFamily: 'SF Mono, ui-monospace, monospace'
          }}>
            {formatINR(match.estimatedSavingINR).replace('₹', '')}
          </div>
          <div style={{ fontSize: '10px', color: '#1a7f37', fontWeight: 600, textTransform: 'uppercase', textAlign: 'center' }}>Saving</div>
        </div>

        {/* Risk Score Dial */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            background: match.riskScorePercent > 60 ? 'radial-gradient(circle, rgba(194, 65, 27, 0.15) 0%, rgba(255, 255, 255, 0.9) 70%)' : 'radial-gradient(circle, rgba(255, 149, 0, 0.15) 0%, rgba(255, 255, 255, 0.9) 70%)',
            border: match.riskScorePercent > 60 ? '2.5px solid #c2411b' : '2.5px solid #ff6b00',
            boxShadow: match.riskScorePercent > 60 ? '0 0 12px rgba(194, 65, 27, 0.35)' : '0 0 12px rgba(255, 149, 0, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12.5px',
            fontWeight: 800,
            color: match.riskScorePercent > 60 ? '#c2411b' : '#ff6b00',
            fontFamily: 'SF Mono, ui-monospace, monospace'
          }}>
            {match.riskScorePercent}%
          </div>
          <div style={{ fontSize: '10px', color: '#86868b', fontWeight: 600, textTransform: 'uppercase', textAlign: 'center' }}>Risk</div>
        </div>
      </div>

      {/* Deterministic Explanation Reasons (WHY it was recommended) */}
      <div style={{ background: '#111827', border: '1px solid #1e293b', borderRadius: '8px', padding: '12px' }}>
        <div style={{
          fontSize: '11px',
          fontWeight: 700,
          color: '#38bdf8',
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
            <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12px', color: '#e2e8f0', lineHeight: 1.4 }}>
              <CheckCircle2 size={14} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
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
        color: '#94a3b8',
        paddingTop: '6px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span>Corridor Distance: <strong style={{ color: '#f8fafc' }}>{match.distanceMeters}m</strong></span>
          <span>Schedule Overlap: <strong style={{ color: '#f8fafc' }}>{match.dateOverlapDays} days</strong></span>
          <span>Depth Difference: <strong style={{ color: '#f59e0b' }}>{formatDepth(match.depthDifferenceMeters)}</strong></span>
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
