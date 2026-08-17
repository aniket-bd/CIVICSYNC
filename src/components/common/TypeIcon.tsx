import React from 'react';
import { ProjectType } from '../../types/project';
import { 
  Droplet, 
  Waves, 
  Milestone, 
  Radio, 
  Zap, 
  Filter, 
  Building2, 
  Anchor, 
  Layers
} from 'lucide-react';

interface TypeIconProps {
  type: ProjectType;
  size?: number;
}

export const getProjectTypeColor = (type: ProjectType): string => {
  switch (type) {
    case 'Water': return '#06b6d4'; // Cyan
    case 'Drainage': return '#10b981'; // Emerald
    case 'Road': return '#f59e0b'; // Amber
    case 'Telecom':
    case 'Cable': return '#8b5cf6'; // Violet
    case 'Electrical': return '#eab308'; // Yellow
    case 'Sewerage': return '#f43f5e'; // Rose
    case 'Building': return '#6366f1'; // Indigo
    case 'Bridge': return '#ec4899'; // Pink
    default: return '#94a3b8'; // Slate
  }
};

export const TypeIcon: React.FC<TypeIconProps> = ({ type, size = 16 }) => {
  const color = getProjectTypeColor(type);

  const getIcon = () => {
    switch (type) {
      case 'Water': return <Droplet size={size} color={color} />;
      case 'Drainage': return <Waves size={size} color={color} />;
      case 'Road': return <Milestone size={size} color={color} />;
      case 'Telecom':
      case 'Cable': return <Radio size={size} color={color} />;
      case 'Electrical': return <Zap size={size} color={color} />;
      case 'Sewerage': return <Filter size={size} color={color} />;
      case 'Building': return <Building2 size={size} color={color} />;
      case 'Bridge': return <Anchor size={size} color={color} />;
      default: return <Layers size={size} color={color} />;
    }
  };

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '4px',
      borderRadius: '6px',
      background: `${color}18`,
      border: `1px solid ${color}33`
    }}>
      {getIcon()}
    </div>
  );
};
