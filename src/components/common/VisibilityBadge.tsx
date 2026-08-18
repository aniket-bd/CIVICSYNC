import React from 'react';
import { ProjectVisibility } from '../../types/project';
import { Lock, Users, Building, Shield } from 'lucide-react';

interface VisibilityBadgeProps {
  visibility?: ProjectVisibility;
  size?: 'sm' | 'md';
}

export const VisibilityBadge: React.FC<VisibilityBadgeProps> = ({ visibility, size = 'md' }) => {
  if (!visibility || visibility.type === 'organization') {
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: size === 'sm' ? '10.5px' : '11.5px',
        padding: size === 'sm' ? '2px 7px' : '3px 8px',
        borderRadius: '980px',
        background: 'rgba(0, 113, 227, 0.08)',
        color: '#0071e3',
        border: '1px solid rgba(0, 113, 227, 0.22)',
        fontWeight: 500
      }}>
        <Building size={size === 'sm' ? 11 : 12} />
        <span>Organization</span>
      </span>
    );
  }

  if (visibility.type === 'private') {
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: size === 'sm' ? '10.5px' : '11.5px',
        padding: size === 'sm' ? '2px 7px' : '3px 8px',
        borderRadius: '980px',
        background: 'rgba(134, 134, 139, 0.12)',
        color: '#515154',
        border: '1px solid rgba(134, 134, 139, 0.25)',
        fontWeight: 500
      }}>
        <Lock size={size === 'sm' ? 11 : 12} />
        <span>Private</span>
      </span>
    );
  }

  if (visibility.type === 'specific_users') {
    const count = visibility.users?.length || 1;
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: size === 'sm' ? '10.5px' : '11.5px',
        padding: size === 'sm' ? '2px 7px' : '3px 8px',
        borderRadius: '980px',
        background: 'rgba(88, 86, 214, 0.10)',
        color: '#5856d6',
        border: '1px solid rgba(88, 86, 214, 0.25)',
        fontWeight: 500
      }}>
        <Users size={size === 'sm' ? 11 : 12} />
        <span>Shared ({count})</span>
      </span>
    );
  }

  if (visibility.type === 'team') {
    const groupName = visibility.groups?.[0] || 'Team';
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: size === 'sm' ? '10.5px' : '11.5px',
        padding: size === 'sm' ? '2px 7px' : '3px 8px',
        borderRadius: '980px',
        background: 'rgba(48, 209, 88, 0.10)',
        color: '#1a7f37',
        border: '1px solid rgba(48, 209, 88, 0.25)',
        fontWeight: 500
      }}>
        <Shield size={size === 'sm' ? 11 : 12} />
        <span>{groupName}</span>
      </span>
    );
  }

  return null;
};
