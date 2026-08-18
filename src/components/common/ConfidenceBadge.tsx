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
          bg: 'rgba(26, 127, 55, 0.10)',
          color: '#1a7f37',
          border: '1px solid rgba(26, 127, 55, 0.22)',
          icon: <ShieldCheck size={11} />
        };
      case 'AI Generated':
        return {
          bg: 'rgba(88, 86, 214, 0.10)',
          color: '#5856d6',
          border: '1px solid rgba(88, 86, 214, 0.22)',
          icon: <Sparkles size={11} />
        };
      case 'Calculated':
        return {
          bg: 'rgba(0, 113, 227, 0.08)',
          color: '#0071e3',
          border: '1px solid rgba(0, 113, 227, 0.22)',
          icon: <Calculator size={11} />
        };
      case 'Estimated':
        return {
          bg: 'rgba(0, 0, 0, 0.04)',
          color: '#6e6e73',
          border: '1px solid rgba(0, 0, 0, 0.10)',
          icon: <HelpCircle size={11} />
        };
      case 'User Entered':
        return {
          bg: 'rgba(0, 113, 227, 0.08)',
          color: '#0071e3',
          border: '1px solid rgba(0, 113, 227, 0.18)',
          icon: <UserCheck size={11} />
        };
      case 'Source Document':
      default:
        return {
          bg: 'rgba(0, 0, 0, 0.04)',
          color: '#86868b',
          border: '1px solid rgba(0, 0, 0, 0.10)',
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
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
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
