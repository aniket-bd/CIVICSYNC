import React from 'react';
import { DataProvenance } from '../../types/project';
import { Sparkles, ShieldCheck, Calculator, HelpCircle, FileText, UserCheck } from 'lucide-react';

interface ConfidenceBadgeProps {
  confidence: DataProvenance;
}

export const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({ confidence }) => {
  const getStyleAndIcon = () => {
    switch (confidence) {
      case 'Verified Data':
        return {
          bg: 'rgba(16, 185, 129, 0.15)',
          color: '#34d399',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          icon: <ShieldCheck size={11} />
        };
      case 'AI Generated':
        return {
          bg: 'rgba(139, 92, 246, 0.15)',
          color: '#c084fc',
          border: '1px solid rgba(139, 92, 246, 0.3)',
          icon: <Sparkles size={11} />
        };
      case 'Calculated':
        return {
          bg: 'rgba(2, 132, 199, 0.15)',
          color: '#38bdf8',
          border: '1px solid rgba(2, 132, 199, 0.3)',
          icon: <Calculator size={11} />
        };
      case 'Estimated':
        return {
          bg: 'rgba(245, 158, 11, 0.15)',
          color: '#fbbf24',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          icon: <HelpCircle size={11} />
        };
      case 'User Entered':
        return {
          bg: 'rgba(56, 189, 248, 0.15)',
          color: '#7dd3fc',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          icon: <UserCheck size={11} />
        };
      case 'Source Document':
      default:
        return {
          bg: 'rgba(100, 116, 139, 0.15)',
          color: '#cbd5e1',
          border: '1px solid rgba(100, 116, 139, 0.3)',
          icon: <FileText size={11} />
        };
    }
  };

  const config = getStyleAndIcon();

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '10px',
        fontWeight: 600,
        fontFamily: 'JetBrains Mono',
        padding: '2px 6px',
        borderRadius: '4px',
        background: config.bg,
        color: config.color,
        border: config.border,
        whiteSpace: 'nowrap'
      }}
      title={`Data Provenance: ${confidence}`}
    >
      {config.icon}
      {confidence}
    </span>
  );
};
