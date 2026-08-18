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

const F = 'Inter, -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif';

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
      height: '52px',
      background: 'rgba(255, 255, 255, 0.36)',
      backdropFilter: 'blur(42px) saturate(220%)',
      WebkitBackdropFilter: 'blur(42px) saturate(220%)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.52)',
      boxShadow: '0 10px 36px -20px rgba(15, 23, 42, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.72)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 28px',
      position: 'relative',
      zIndex: 200,
      fontFamily: F,
    }}>

      {/* ── LOGO & BRANDING ── */}
      <div
        onClick={() => onTabChange('overview')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          cursor: 'pointer',
          flexShrink: 0,
          userSelect: 'none',
          padding: '4px 2px',
        }}
      >
        <div style={{
          width: '28px',
          height: '28px',
          borderRadius: '8px',
          background: '#1d1d1f',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </div>
        <div>
          <span style={{ fontSize: '17px', fontWeight: 600, color: '#1d1d1f', letterSpacing: '-0.022em' }}>
            CivicSync
          </span>
          <div style={{ fontSize: '10px', color: '#86868b', fontWeight: 500, letterSpacing: '0.01em', marginTop: '-1px' }}>
            Spatial Twin OS
          </div>
        </div>
      </div>

      {/* ── CENTER NAVIGATION ── */}
      <nav style={{
        position: 'absolute',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        background: 'rgba(255, 255, 255, 0.32)',
        padding: '3px',
        borderRadius: '980px',
        border: '1px solid rgba(255, 255, 255, 0.55)',
        gap: '2px',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.65)',
      }}>
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
                background: isActive ? '#1d1d1f' : 'transparent',
                fontSize: '12.5px',
                fontWeight: isActive ? 500 : 400,
                fontFamily: F,
                color: isActive ? '#f5f5f7' : '#1d1d1f',
                letterSpacing: '-0.01em',
                borderRadius: '980px',
                boxShadow: isActive ? '0 1px 3px rgba(0, 0, 0, 0.18)' : 'none',
                transition: 'all 0.22s cubic-bezier(0.25, 0.1, 0.25, 1)',
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  e.currentTarget.style.background = 'rgba(0, 0, 0, 0.06)';
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* ── RIGHT TELEMETRY & PROFILE ── */}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '12px',
          color: '#6e6e73',
          background: 'rgba(255, 255, 255, 0.38)',
          padding: '5px 14px',
          borderRadius: '980px',
          border: '1px solid rgba(255, 255, 255, 0.55)',
          backdropFilter: 'blur(18px)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#30d158' }} />
            <span style={{ fontWeight: 600, color: '#1d1d1f' }}>{activeCount}</span>
            <span>Active</span>
          </div>
          <span style={{ color: 'rgba(0, 0, 0, 0.12)' }}>|</span>
          <div>
            <span>Savings </span>
            <strong style={{ color: '#1d1d1f', fontWeight: 600 }}>{formatINR(totalSavings)}</strong>
          </div>
        </div>

        {/* Profile Pill */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowProfileMenu(v => !v)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(255, 255, 255, 0.38)',
              border: '1px solid rgba(255, 255, 255, 0.55)',
              borderRadius: '980px',
              padding: '3px 12px 3px 4px',
              cursor: 'pointer',
              fontFamily: F,
              transition: 'all 0.18s',
              backdropFilter: 'blur(18px)',
            }}
          >
            <div style={{
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              background: '#1d1d1f',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              fontWeight: 600,
              flexShrink: 0,
            }}>
              {currentUser.name.charAt(0)}
            </div>
            <span style={{ fontSize: '13px', color: '#1d1d1f', fontWeight: 500 }}>
              {currentUser.name.split(' ')[0]}
            </span>
            <svg width="9" height="5" viewBox="0 0 9 5" fill="none">
              <path d="M1 1l3.5 3L8 1" stroke="#86868b" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </button>

          {showProfileMenu && (
            <div style={{
              position: 'absolute',
              right: 0,
              top: '42px',
              width: '248px',
              background: 'rgba(255, 255, 255, 0.58)',
              backdropFilter: 'blur(44px) saturate(200%)',
              WebkitBackdropFilter: 'blur(44px) saturate(200%)',
              border: '1px solid rgba(255, 255, 255, 0.7)',
              borderRadius: '18px',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.14), 0 4px 16px rgba(0,0,0,0.06)',
              zIndex: 300,
              overflow: 'hidden',
              fontFamily: F,
            }}>
              <div style={{ padding: '16px', borderBottom: '1px solid rgba(0, 0, 0, 0.06)' }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#1d1d1f' }}>{currentUser.name}</div>
                <div style={{ fontSize: '12px', color: '#86868b', marginTop: '2px' }}>{currentUser.email}</div>
                <div style={{ fontSize: '12px', color: '#6e6e73', fontWeight: 500, marginTop: '3px' }}>{currentUser.department}</div>
              </div>

              <div style={{ padding: '8px 0 4px' }}>
                <div style={{ padding: '4px 16px 6px', fontSize: '11px', color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>
                  Switch Role
                </div>
                {(['Admin', 'Project Manager', 'Engineer', 'Viewer'] as UserRole[]).map(role => (
                  <button
                    key={role}
                    onClick={() => { store.setCurrentUser({ ...currentUser, role }); setShowProfileMenu(false); }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 16px',
                      border: 'none',
                      fontFamily: F,
                      background: currentUser.role === role ? 'rgba(0, 113, 227, 0.08)' : 'transparent',
                      color: currentUser.role === role ? '#0071e3' : '#1d1d1f',
                      fontSize: '13px',
                      fontWeight: currentUser.role === role ? 500 : 400,
                      cursor: 'pointer',
                      transition: 'background 0.12s',
                    }}
                  >
                    <span>{role}</span>
                    {currentUser.role === role && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0071e3" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </button>
                ))}
              </div>

              <div style={{ borderTop: '1px solid rgba(0, 0, 0, 0.06)', padding: '4px 0 6px' }}>
                <button
                  onClick={() => { store.resetToDefault(); setShowProfileMenu(false); }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '9px 16px',
                    border: 'none',
                    background: 'transparent',
                    color: '#ff3b30',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    fontFamily: F,
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                    <path d="M3 3v5h5"/>
                  </svg>
                  Reset Demo Database
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
