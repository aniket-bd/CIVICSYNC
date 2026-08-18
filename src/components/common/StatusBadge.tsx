import React from 'react';
import { ProjectStatus } from '../../types/project';

interface StatusBadgeProps {
  status: ProjectStatus;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const getBadgeClass = () => {
    switch (status) {
      case 'Active':
      case 'Ready':
        return 'badge-active';
      case 'Approved':
      case 'Uploaded':
        return 'badge-approved';
      case 'Pending':
      case 'In Review':
      case 'Draft':
        return 'badge-pending';
      case 'Processing':
      case 'Completed':
        return 'badge-completed';
      case 'Delayed':
      case 'Failed':
        return 'badge-delayed';
      case 'Cancelled':
      case 'Closed':
      case 'Archived':
      default:
        return 'badge-cancelled';
    }
  };

  const dotColor = () => {
    switch (status) {
      case 'Active':
      case 'Ready':
        return '#30d158'; // Apple Green
      case 'Approved':
      case 'Uploaded':
        return '#0071e3'; // Apple Blue
      case 'Pending':
      case 'In Review':
        return '#6e6e73'; // Apple Gray
      case 'Draft':
        return '#86868b'; // Apple Gray
      case 'Processing':
        return '#5e5ce6'; // Apple Purple / Indigo
      case 'Completed':
        return '#30d158';
      case 'Delayed':
      case 'Failed':
        return '#ff453a'; // Apple Red
      case 'Archived':
      case 'Cancelled':
      case 'Closed':
      default:
        return '#86868b';
    }
  };

  return (
    <span 
      className={`badge ${getBadgeClass()}`}
      style={{
        fontSize: size === 'sm' ? '10.5px' : '11.5px',
        padding: size === 'sm' ? '2px 7px' : '3px 9px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px'
      }}
    >
      <span style={{
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        backgroundColor: dotColor(),
        display: 'inline-block',
        boxShadow: status === 'Active' || status === 'Ready' ? `0 0 6px ${dotColor()}` : 'none'
      }} />
      {status}
    </span>
  );
};
