import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = '800px'
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '24px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.90)',
          backdropFilter: 'blur(36px) saturate(220%)',
          WebkitBackdropFilter: 'blur(36px) saturate(220%)',
          border: '1px solid rgba(255, 255, 255, 0.95)',
          borderRadius: '20px',
          width: '100%',
          maxWidth,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 64px -12px rgba(15, 23, 42, 0.25), 0 8px 24px -4px rgba(15, 23, 42, 0.12)',
          overflow: 'hidden',
          animation: 'fadeInScale 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(255, 255, 255, 0.65)'
        }}>
          <div>
            <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.02em' }}>{title}</h3>
            {subtitle && <p style={{ fontSize: '12.5px', color: '#515154', marginTop: '2px' }}>{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(0, 0, 0, 0.05)',
              border: 'none',
              color: '#515154',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.15s'
            }}
          >
            <X size={17} />
          </button>
        </div>

        {/* Content */}
        <div style={{
          padding: '24px',
          overflowY: 'auto',
          flex: 1
        }}>
          {children}
        </div>
      </div>
    </div>
  );
};
