import React from 'react';
import { HardHat, CheckCircle2, Shield } from 'lucide-react';

export type ViewStateMode = 'Existing' | 'Construction' | 'Completed';

interface StateModeSelectorProps {
  mode: ViewStateMode;
  onModeChange: (mode: ViewStateMode) => void;
}

export const StateModeSelector: React.FC<StateModeSelectorProps> = ({ mode, onModeChange }) => {
  const modes: { id: ViewStateMode; label: string; icon: any; desc: string; color: string }[] = [
    {
      id: 'Existing',
      label: '1. Existing Infrastructure',
      icon: Shield,
      desc: 'Current ground status & pre-existing utility assets',
      color: '#94a3b8'
    },
    {
      id: 'Construction',
      label: '2. Construction Phase',
      icon: HardHat,
      desc: 'Open trench cutaway, machinery corridor, and safety barricades',
      color: '#f59e0b'
    },
    {
      id: 'Completed',
      label: '3. Completed / Proposed',
      icon: CheckCircle2,
      desc: 'Restored road surface & active commissioning state',
      color: '#10b981'
    }
  ];

  return (
    <div style={{
      background: 'rgba(15, 23, 42, 0.92)',
      backdropFilter: 'blur(16px)',
      border: '1px solid #334155',
      borderRadius: '12px',
      padding: '8px',
      display: 'flex',
      gap: '8px',
      boxShadow: '0 10px 25px rgba(0,0,0,0.6)'
    }}>
      {modes.map(m => {
        const Icon = m.icon;
        const isSelected = mode === m.id;
        return (
          <button
            key={m.id}
            onClick={() => onModeChange(m.id)}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: isSelected ? `1px solid ${m.color}` : '1px solid transparent',
              background: isSelected ? `${m.color}18` : 'transparent',
              color: isSelected ? '#f8fafc' : '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '12px',
              fontWeight: 600,
              transition: 'all 0.15s ease'
            }}
            title={m.desc}
          >
            <Icon size={14} color={isSelected ? m.color : '#94a3b8'} />
            <span>{m.label}</span>
          </button>
        );
      })}
    </div>
  );
};
