import React, { useState, useEffect } from 'react';
import { store, UserRole } from '../../db/store';
import { formatINR } from '../../utils/formatters';

interface HeaderProps {
  activeTab: 'overview' | 'projects' | 'work-sequence' | 'local-checklist' | 'map3d';
  onTabChange: (tab: 'overview' | 'projects' | 'work-sequence' | 'local-checklist' | 'map3d') => void;
}

const navItems = [
  { id: 'overview',        label: 'Overview'        },
  { id: 'projects',        label: 'Projects'        },
  { id: 'work-sequence',   label: 'Work Sequence'   },
  { id: 'local-checklist', label: 'Local Checklist' },
  { id: 'map3d',           label: '3D Spatial Twin' },
] as const;

const F = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif';

export const Header: React.FC<HeaderProps> = ({ activeTab, onTabChange }) => {
  const [currentUser, setCurrentUser] = useState(store.getCurrentUser());
  const [projects, setProjects] = useState(store.getProjects());
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  useEffect(() => store.subscribe(() => {
    setCurrentUser(store.getCurrentUser());
    setProjects(store.getProjects());
  }), []);

  const activeCount  = projects.filter(p => p.status === 'Active').length;
  const totalSavings = projects.reduce((s, p) => s + p.potentialSaving, 0);

  return (
    <header style={{
      height: '64px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '12px 24px 0',
      position: 'relative',
      zIndex: 200,
      fontFamily: F,
      flexShrink: 0
    }}>
      {/* ── CENTER FLOATING ISLAND NAV BAR (Apple Dynamic Island Pill) ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        background: 'rgba(255, 255, 255, 0.88)',
        backdropFilter: 'blur(40px) saturate(210%)',
        WebkitBackdropFilter: 'blur(40px) saturate(210%)',
        padding: '5px 8px 5px 16px',
        borderRadius: '980px',
        border: '1px solid rgba(255, 255, 255, 0.95)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.06), 0 2px 8px rgba(0, 0, 0, 0.02)',
        gap: '16px',
        maxWidth: '1000px',
        width: '100%',
        justifyContent: 'space-between'
      }}>

        {/* LOGO & BRANDING */}
        <div
          onClick={() => onTabChange('overview')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            userSelect: 'none'
          }}
        >
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: '#1d1d1f',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff'
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round">
              <polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>
            </svg>
          </div>
          <span style={{ fontSize: '15px', fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.02em' }}>
            CivicSync
          </span>
        </div>

        {/* CENTER NAVIGATION TABS */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
          {navItems.map(item => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                style={{
                  padding: '6px 16px',
                  border: 'none',
                  cursor: 'pointer',
                  background: isActive ? '#e8e8ed' : 'transparent',
                  fontSize: '13px',
                  fontWeight: isActive ? 700 : 500,
                  fontFamily: F,
                  color: isActive ? '#1d1d1f' : '#515154',
                  letterSpacing: '-0.01em',
                  borderRadius: '980px',
                  transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(0, 0, 0, 0.04)';
                    e.currentTarget.style.color = '#1d1d1f';
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#515154';
                  }
                }}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* RIGHT ACTIONS & PROFILE */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            fontSize: '11.5px',
            color: '#86868b',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(0, 0, 0, 0.03)',
            padding: '4px 10px',
            borderRadius: '980px',
            fontWeight: 600
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#0071e3' }} />
            <span>Savings: <strong style={{ color: '#0071e3', fontFamily: 'SF Mono, monospace' }}>{formatINR(totalSavings)}</strong></span>
          </div>

          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowProfileMenu(v => !v)}
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                background: 'rgba(0, 0, 0, 0.05)',
                border: '1px solid rgba(0, 0, 0, 0.08)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 700,
                color: '#1d1d1f'
              }}
            >
              {currentUser.name.charAt(0)}
            </button>

            {showProfileMenu && (
              <div style={{
                position: 'absolute',
                right: 0,
                top: '38px',
                width: '240px',
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(36px) saturate(220%)',
                border: '1px solid rgba(0, 0, 0, 0.1)',
                borderRadius: '16px',
                boxShadow: '0 16px 40px rgba(0,0,0,0.12)',
                zIndex: 300,
                overflow: 'hidden',
                fontFamily: F,
              }}>
                <div style={{ padding: '14px', borderBottom: '1px solid rgba(0, 0, 0, 0.06)' }}>
                  <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#1d1d1f' }}>{currentUser.name}</div>
                  <div style={{ fontSize: '11px', color: '#86868b', marginTop: '2px' }}>{currentUser.email}</div>
                  <div style={{ fontSize: '11px', color: '#0071e3', fontWeight: 600, marginTop: '2px' }}>{currentUser.department}</div>
                </div>

                <div style={{ padding: '6px 0' }}>
                  {(['Admin', 'Project Manager', 'Engineer', 'Viewer'] as UserRole[]).map(role => (
                    <button
                      key={role}
                      onClick={() => { store.setCurrentUser({ ...currentUser, role }); setShowProfileMenu(false); }}
                      style={{
                        width: '100%',
                        padding: '7px 14px',
                        border: 'none',
                        background: currentUser.role === role ? 'rgba(0, 113, 227, 0.08)' : 'transparent',
                        color: currentUser.role === role ? '#0071e3' : '#1d1d1f',
                        fontSize: '12.5px',
                        fontWeight: currentUser.role === role ? 700 : 400,
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontFamily: F
                      }}
                    >
                      {role}
                    </button>
                  ))}
                </div>

                <div style={{ borderTop: '1px solid rgba(0, 0, 0, 0.06)', padding: '6px 0' }}>
                  <button
                    onClick={() => { store.resetToDefault(); setShowProfileMenu(false); }}
                    style={{
                      width: '100%',
                      padding: '7px 14px',
                      border: 'none',
                      background: 'transparent',
                      color: '#c2411b',
                      fontSize: '12.5px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontFamily: F
                    }}
                  >
                    Reset Demo Database
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
