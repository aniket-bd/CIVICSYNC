import React from 'react';
import { Eye, EyeOff, Layers, Sliders } from 'lucide-react';

interface DepthSliderControlProps {
  depthMeters: number;
  onDepthChange: (depth: number) => void;
  opacity: number;
  onOpacityChange: (opacity: number) => void;
  showUnderground: boolean;
  onToggleUnderground: () => void;
  filterMode: 'all' | 'project-only' | 'existing-only';
  onFilterModeChange: (mode: 'all' | 'project-only' | 'existing-only') => void;
}

export const DepthSliderControl: React.FC<DepthSliderControlProps> = ({
  depthMeters,
  onDepthChange,
  opacity,
  onOpacityChange,
  showUnderground,
  onToggleUnderground,
  filterMode,
  onFilterModeChange
}) => {
  return (
    <div style={{
      background: 'rgba(15, 23, 42, 0.92)',
      backdropFilter: 'blur(16px)',
      border: '1px solid #334155',
      borderRadius: '12px',
      padding: '14px 18px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      boxShadow: '0 10px 25px rgba(0,0,0,0.6)',
      minWidth: '280px'
    }}>
      {/* Title & Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Layers size={15} color="#38bdf8" />
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>
            Underground Depth Layer
          </span>
        </div>

        <button
          onClick={onToggleUnderground}
          style={{
            background: showUnderground ? 'rgba(2, 132, 199, 0.2)' : 'rgba(100, 116, 139, 0.2)',
            border: showUnderground ? '1px solid #0284c7' : '1px solid #334155',
            color: showUnderground ? '#38bdf8' : '#94a3b8',
            borderRadius: '6px',
            padding: '3px 8px',
            fontSize: '11px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          {showUnderground ? <Eye size={12} /> : <EyeOff size={12} />}
          <span>{showUnderground ? 'Visible' : 'Hidden'}</span>
        </button>
      </div>

      {/* Depth Slider 0m - 10m */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>
          <span>Ground Plane (0 m)</span>
          <strong style={{ color: '#0071e3', fontFamily: 'JetBrains Mono', fontSize: '12px' }}>
            Target Invert: -{depthMeters.toFixed(1)} m
          </strong>
          <span>Bedrock (-10 m)</span>
        </div>
        <input
          type="range"
          min="0"
          max="10"
          step="0.2"
          value={depthMeters}
          onChange={e => onDepthChange(parseFloat(e.target.value))}
          style={{ width: '100%', accentColor: '#0071e3' }}
        />
      </div>

      {/* Opacity Slider */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>
          <span>Ground Cutaway Transparency</span>
          <span style={{ fontFamily: 'JetBrains Mono', color: '#38bdf8' }}>{Math.round(opacity * 100)}%</span>
        </div>
        <input
          type="range"
          min="0.1"
          max="1.0"
          step="0.05"
          value={opacity}
          onChange={e => onOpacityChange(parseFloat(e.target.value))}
          style={{ width: '100%', accentColor: '#0284c7' }}
        />
      </div>

      {/* Layer Filter Modes */}
      <div style={{ borderTop: '1px solid #1e293b', paddingTop: '8px', display: 'flex', gap: '4px' }}>
        {[
          { id: 'all', label: 'All Assets' },
          { id: 'project-only', label: 'Project Only' },
          { id: 'existing-only', label: 'Existing Only' }
        ].map(mode => (
          <button
            key={mode.id}
            onClick={() => onFilterModeChange(mode.id as any)}
            style={{
              flex: 1,
              padding: '4px 6px',
              borderRadius: '4px',
              border: filterMode === mode.id ? '1px solid #0284c7' : '1px solid transparent',
              background: filterMode === mode.id ? 'rgba(2, 132, 199, 0.2)' : 'transparent',
              color: filterMode === mode.id ? '#38bdf8' : '#94a3b8',
              fontSize: '10.5px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            {mode.label}
          </button>
        ))}
      </div>
    </div>
  );
};
