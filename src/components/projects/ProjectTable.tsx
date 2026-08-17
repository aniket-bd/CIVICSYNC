import React, { useState, useEffect, useMemo } from 'react';
import { Project, ProjectType, ProjectStatus, ManagedBy } from '../../types/project';
import { store } from '../../db/store';
import { StatusBadge } from '../common/StatusBadge';
import { formatINR, formatDate, formatDepth } from '../../utils/formatters';
import { ExportService } from '../../services/exportService';
import { AddTenderModal } from './AddTenderModal';
import { EditProjectModal } from './EditProjectModal';
import { ProjectDetailsModal } from './ProjectDetailsModal';
import { 
  Search, 
  Download, 
  Plus, 
  Compass, 
  Box, 
  Eye, 
  Trash2, 
  FileSpreadsheet, 
  FileText,
  Filter,
  ChevronDown
} from 'lucide-react';

interface ProjectTableProps {
  onNavigateTo2DMap: (project: Project) => void;
  onNavigateTo3DMap: (project: Project) => void;
}

const F = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif';

export const ProjectTable: React.FC<ProjectTableProps> = ({
  onNavigateTo2DMap,
  onNavigateTo3DMap
}) => {
  const [projects, setProjects] = useState<Project[]>(store.getProjects());
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<ProjectType | 'All'>('All');
  const [selectedStatus, setSelectedStatus] = useState<ProjectStatus | 'All'>('All');
  const [selectedYear, setSelectedYear] = useState<string>('All');
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedProjectForDetails, setSelectedProjectForDetails] = useState<Project | null>(null);
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);

  useEffect(() => {
    return store.subscribe(() => {
      setProjects(store.getProjects());
    });
  }, []);

  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const matchSearch = 
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.tenderNumber.toLowerCase().includes(search.toLowerCase()) ||
        p.locationName.toLowerCase().includes(search.toLowerCase()) ||
        p.contractor.toLowerCase().includes(search.toLowerCase());

      const matchType = selectedType === 'All' || p.type === selectedType;
      const matchStatus = selectedStatus === 'All' || p.status === selectedStatus;
      const matchYear = selectedYear === 'All' || p.startDate.startsWith(selectedYear);

      return matchSearch && matchType && matchStatus && matchYear;
    });
  }, [projects, search, selectedType, selectedStatus, selectedYear]);

  const totalPortfolioValue = projects.reduce((acc, p) => acc + p.budget, 0);

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to permanently remove project: "${name}"?`)) {
      store.deleteProject(id);
    }
  };

  const getRiskBadge = (p: Project) => {
    if (p.riskScore && p.riskScore > 70) {
      return <span style={{ padding: '3px 10px', borderRadius: '980px', fontSize: '11px', fontWeight: 600, background: 'rgba(217, 119, 6, 0.12)', color: '#b45309', border: '1px solid rgba(217, 119, 6, 0.3)' }}>Review</span>;
    } else if (p.status === 'Active' || p.status === 'Approved') {
      return <span style={{ padding: '3px 10px', borderRadius: '980px', fontSize: '11px', fontWeight: 600, background: 'rgba(0, 0, 0, 0.04)', color: '#515154' }}>Moderate</span>;
    }
    return <span style={{ padding: '3px 10px', borderRadius: '980px', fontSize: '11px', fontWeight: 600, background: 'rgba(0, 0, 0, 0.04)', color: '#86868b' }}>Low</span>;
  };

  return (
    <div style={{ padding: '24px 40px', display: 'flex', flexDirection: 'column', gap: '20px', minHeight: 'calc(100vh - 64px)', fontFamily: F }}>
      {/* ── TOP HEADER SECTION (Directly matching Reference Image 2) ── */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div className="section-tracker">CAPITAL DELIVERY INTELLIGENCE</div>
          <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#1d1d1f', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
            Municipal infrastructure projects
          </h1>
          <p style={{ fontSize: '14px', color: '#515154', marginTop: '4px', fontWeight: 400 }}>
            A precise view of active capital work, approvals, and portfolio exposure across the region.
          </p>
        </div>

        {/* Top Right Action & Search Controls (Matching Image 2) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Rounded Translucent Search Bar */}
          <div style={{ position: 'relative', width: '280px' }}>
            <Search size={15} color="#86868b" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              className="form-input"
              style={{ paddingLeft: '38px', borderRadius: '980px', background: 'rgba(255, 255, 255, 0.85)', fontSize: '13px' }}
              placeholder="Find a project, corridor, or owner"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <button
            className="btn btn-outline"
            onClick={() => ExportService.exportToCSV(filteredProjects)}
          >
            <Download size={14} />
            <span>Exports</span>
          </button>

          <button
            className="btn btn-dark"
            onClick={() => setIsAddModalOpen(true)}
          >
            <Plus size={15} />
            <span>Add project</span>
          </button>
        </div>
      </div>

      {/* ── MONOLITHIC FROSTED GLASS DATA TABLE CONTAINER (Matching Image 2) ── */}
      <div className="glass-card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: 1, border: '1px solid rgba(255, 255, 255, 0.95)' }}>
        
        {/* Filter Submenu Bar Inside Table Container (Matching Image 2) */}
        <div style={{
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
          background: 'rgba(255, 255, 255, 0.5)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Filter Pill 1 */}
            <div style={{ position: 'relative' }}>
              <select
                value={selectedType}
                onChange={e => setSelectedType(e.target.value as any)}
                style={{
                  appearance: 'none',
                  background: 'rgba(255, 255, 255, 0.9)',
                  border: '1px solid rgba(0, 0, 0, 0.1)',
                  borderRadius: '980px',
                  padding: '6px 32px 6px 14px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  color: '#1d1d1f',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value="All">All programs</option>
                <option value="Water">Water systems</option>
                <option value="Road">Mobility / Roads</option>
                <option value="Drainage">Drainage</option>
                <option value="Sewerage">Sewerage</option>
                <option value="Telecom">Utilities / Telecom</option>
                <option value="Building">Facilities</option>
              </select>
              <ChevronDown size={13} color="#86868b" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            </div>

            {/* Filter Pill 2 */}
            <div style={{ position: 'relative' }}>
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(e.target.value)}
                style={{
                  appearance: 'none',
                  background: 'rgba(255, 255, 255, 0.9)',
                  border: '1px solid rgba(0, 0, 0, 0.1)',
                  borderRadius: '980px',
                  padding: '6px 32px 6px 14px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  color: '#1d1d1f',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value="All">FY 2025–27</option>
                <option value="2026">FY 2026</option>
                <option value="2025">FY 2025</option>
                <option value="2027">FY 2027</option>
              </select>
              <ChevronDown size={13} color="#86868b" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            </div>

            {/* Filter Pill 3 */}
            <div style={{ position: 'relative' }}>
              <select
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value as any)}
                style={{
                  appearance: 'none',
                  background: 'rgba(255, 255, 255, 0.9)',
                  border: '1px solid rgba(0, 0, 0, 0.1)',
                  borderRadius: '980px',
                  padding: '6px 32px 6px 14px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  color: '#1d1d1f',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value="All">All statuses</option>
                <option value="Approved">Approved</option>
                <option value="Active">Active</option>
                <option value="Pending">Pending</option>
                <option value="Completed">Completed</option>
                <option value="Delayed">Delayed</option>
              </select>
              <ChevronDown size={13} color="#86868b" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            </div>
          </div>

          <div style={{ fontSize: '12.5px', color: '#86868b', fontWeight: 500 }}>
            {filteredProjects.length} projects · {formatINR(totalPortfolioValue)} portfolio
          </div>
        </div>

        {/* High-Density Data Grid (Matching Image 2) */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(0, 0, 0, 0.08)', background: 'rgba(255, 255, 255, 0.4)' }}>
                {['PROJECT', 'PROGRAM', 'STATUS', 'DELIVERY WINDOW', 'APPROVED BUDGET', 'RISK', ''].map((h, i) => (
                  <th key={i} style={{ padding: '14px 24px', fontSize: '10.5px', fontWeight: 700, color: '#86868b', letterSpacing: '0.06em', textTransform: 'uppercase', textAlign: i === 6 ? 'right' : 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredProjects.map(project => (
                <tr
                  key={project.id}
                  style={{
                    borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
                    transition: 'background 0.15s ease'
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.95)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {/* Project Name & Corridor */}
                  <td style={{ padding: '16px 24px' }}>
                    <div
                      onClick={() => setSelectedProjectForDetails(project)}
                      style={{ fontWeight: 700, color: '#1d1d1f', fontSize: '14px', cursor: 'pointer', letterSpacing: '-0.01em' }}
                    >
                      {project.name}
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#86868b', marginTop: '2px' }}>
                      {project.tenderNumber} · {project.locationName}
                    </div>
                  </td>

                  {/* Program Sector */}
                  <td style={{ padding: '16px 24px', color: '#515154', fontWeight: 500 }}>
                    {project.type === 'Water' ? 'Water systems' : project.type === 'Road' ? 'Mobility' : project.type === 'Telecom' ? 'Utilities' : project.type === 'Building' ? 'Facilities' : project.type}
                  </td>

                  {/* Status Badge (Matching Image 2) */}
                  <td style={{ padding: '16px 24px' }}>
                    <StatusBadge status={project.status} size="sm" />
                  </td>

                  {/* Delivery Window */}
                  <td style={{ padding: '16px 24px', color: '#515154', fontFamily: 'SF Mono, monospace', fontSize: '12px' }}>
                    {formatDate(project.startDate)} — {formatDate(project.expectedCompletionDate)}
                  </td>

                  {/* Approved Budget */}
                  <td style={{ padding: '16px 24px', fontWeight: 700, color: '#1d1d1f', fontFamily: 'SF Mono, monospace', fontSize: '13.5px' }}>
                    {formatINR(project.budget)}
                  </td>

                  {/* Risk Badge */}
                  <td style={{ padding: '16px 24px' }}>
                    {getRiskBadge(project)}
                  </td>

                  {/* Actions */}
                  <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                      <button className="btn-ghost btn-sm" onClick={() => setSelectedProjectForDetails(project)} title="View Specs">
                        <Eye size={15} />
                      </button>
                      <button className="btn-ghost btn-sm" onClick={() => onNavigateTo2DMap(project)} title="2D Map">
                        <Compass size={15} color="#0071e3" />
                      </button>
                      <button className="btn-ghost btn-sm" onClick={() => onNavigateTo3DMap(project)} title="3D Twin">
                        <Box size={15} color="#0071e3" />
                      </button>
                      <button className="btn-ghost btn-sm" onClick={() => handleDelete(project.id, project.name)} title="Delete">
                        <Trash2 size={15} color="#c2411b" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Bottom Pagination Bar (Matching Image 2) */}
        <div style={{
          padding: '12px 24px',
          borderTop: '1px solid rgba(0, 0, 0, 0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          fontSize: '13px',
          color: '#515154',
          background: 'rgba(255, 255, 255, 0.4)'
        }}>
          <button style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#86868b' }}>‹</button>
          <span style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#1d1d1f', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '12px' }}>1</span>
          <span style={{ cursor: 'pointer' }}>2</span>
          <span style={{ cursor: 'pointer' }}>3</span>
          <span style={{ color: '#86868b' }}>...</span>
          <span style={{ cursor: 'pointer' }}>8</span>
          <button style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#1d1d1f' }}>›</button>
        </div>
      </div>

      {/* Modals */}
      <AddTenderModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => setIsAddModalOpen(false)}
      />

      <EditProjectModal
        project={projectToEdit}
        isOpen={projectToEdit !== null}
        onClose={() => setProjectToEdit(null)}
        onSuccess={() => setProjectToEdit(null)}
      />

      <ProjectDetailsModal
        project={selectedProjectForDetails}
        isOpen={selectedProjectForDetails !== null}
        onClose={() => setSelectedProjectForDetails(null)}
        onViewOn2DMap={onNavigateTo2DMap}
        onViewIn3D={onNavigateTo3DMap}
      />
    </div>
  );
};
