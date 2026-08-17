import React, { useState, useEffect, useMemo } from 'react';
import { Project, ProjectType, ProjectStatus, ManagedBy } from '../../types/project';
import { store } from '../../db/store';
import { StatusBadge } from '../common/StatusBadge';
import { ConfidenceBadge } from '../common/ConfidenceBadge';
import { VisibilityBadge } from '../common/VisibilityBadge';
import { TypeIcon } from '../common/TypeIcon';
import { formatINR, formatDate, formatDepth, formatDistance } from '../../utils/formatters';
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
  Layers,
  RefreshCw,
  Edit3,
  Radar
} from 'lucide-react';

interface ProjectTableProps {
  onNavigateTo2DMap: (project: Project) => void;
  onNavigateTo3DMap: (project: Project) => void;
}

export const ProjectTable: React.FC<ProjectTableProps> = ({
  onNavigateTo2DMap,
  onNavigateTo3DMap
}) => {
  const [projects, setProjects] = useState<Project[]>(store.getProjects());
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<ProjectType | 'All'>('All');
  const [selectedStatus, setSelectedStatus] = useState<ProjectStatus | 'All'>('All');
  const [selectedManagedBy, setSelectedManagedBy] = useState<ManagedBy | 'All'>('All');
  const [selectedVisibility, setSelectedVisibility] = useState<string>('All');
  const [gprFilterOnly, setGprFilterOnly] = useState(false);
  
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
        p.contractor.toLowerCase().includes(search.toLowerCase()) ||
        (p.gpr && p.gpr.fileName.toLowerCase().includes(search.toLowerCase()));

      const matchType = selectedType === 'All' || p.type === selectedType;
      const matchStatus = selectedStatus === 'All' || p.status === selectedStatus;
      const matchManaged = selectedManagedBy === 'All' || p.managedBy === selectedManagedBy;
      const matchVisibility = selectedVisibility === 'All' || p.visibility?.type === selectedVisibility || (!p.visibility && selectedVisibility === 'organization');
      const matchGpr = !gprFilterOnly || Boolean(p.gpr);

      return matchSearch && matchType && matchStatus && matchManaged && matchVisibility && matchGpr;
    });
  }, [projects, search, selectedType, selectedStatus, selectedManagedBy, selectedVisibility, gprFilterOnly]);

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to permanently remove project: "${name}"?`)) {
      store.deleteProject(id);
    }
  };

  const allTypes: ProjectType[] = ['Water', 'Drainage', 'Road', 'Telecom', 'Electrical', 'Cable', 'Sewerage', 'Building', 'Bridge', 'Other'];
  const allStatuses: ProjectStatus[] = [
    'Ready',
    'Active',
    'Approved',
    'Pending',
    'In Review',
    'Uploaded',
    'Processing',
    'Completed',
    'Draft',
    'Delayed',
    'Archived',
    'Failed',
    'Cancelled'
  ];

  return (
    <div style={{ padding: '32px 40px', display: 'flex', flexDirection: 'column', gap: '24px', minHeight: 'calc(100vh - 56px)' }}>
      {/* Top Header & Action Controls */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.028em', lineHeight: 1.1 }}>
            Infrastructure Projects & Tenders
          </h1>
          <p style={{ fontSize: '14px', color: '#515154', marginTop: '6px', fontWeight: 400 }}>
            Unified municipal project dataset, GPR radar attachments, 2D/3D spatial coordinates, and access control
          </p>
        </div>

        {/* Action Controls (Outline-only Apple style) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            className="btn btn-outline"
            onClick={() => ExportService.exportToCSV(filteredProjects)}
            title="Export filtered records to CSV"
          >
            <Download size={14} />
            <span>CSV</span>
          </button>
          <button
            className="btn btn-outline"
            onClick={() => ExportService.exportToExcel(filteredProjects)}
            title="Export to Excel Spreadsheet"
          >
            <FileSpreadsheet size={14} color="#1a7f37" />
            <span>Excel</span>
          </button>
          <button
            className="btn btn-outline"
            onClick={() => ExportService.exportToPDF(filteredProjects)}
            title="Generate Municipal Report PDF"
          >
            <FileText size={14} color="#c2411b" />
            <span>PDF Report</span>
          </button>

          <button
            className="btn btn-primary"
            onClick={() => setIsAddModalOpen(true)}
          >
            <Plus size={16} />
            <span>+ Add Project</span>
          </button>
        </div>
      </div>

      {/* Filter Bar Submenu (Orange Liquid Glass) */}
      <div className="glass-card" style={{
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        border: '1.5px solid rgba(255, 149, 0, 0.35)',
        boxShadow: '0 8px 28px -4px rgba(255, 149, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.04)'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: '12px' }}>
          {/* Search Box */}
          <div style={{ position: 'relative' }}>
            <Search size={16} color="#86868b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              className="form-input"
              style={{ paddingLeft: '36px' }}
              placeholder="Search by project name, tender ID, corridor, GPR file..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Type Filter */}
          <div>
            <select
              className="form-select"
              value={selectedType}
              onChange={e => setSelectedType(e.target.value as any)}
            >
              <option value="All">All Types ({projects.length})</option>
              {allTypes.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              className="form-select"
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value as any)}
            >
              <option value="All">All Statuses</option>
              {allStatuses.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Visibility Filter */}
          <div>
            <select
              className="form-select"
              value={selectedVisibility}
              onChange={e => setSelectedVisibility(e.target.value)}
            >
              <option value="All">All Visibility</option>
              <option value="organization">Organization</option>
              <option value="private">Private</option>
              <option value="specific_users">Specific Users</option>
              <option value="team">Team / Group</option>
            </select>
          </div>

          {/* GPR Only Toggle */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => setGprFilterOnly(!gprFilterOnly)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '10px',
                border: gprFilterOnly ? '1px solid #0071e3' : '1px solid rgba(0, 0, 0, 0.08)',
                background: gprFilterOnly ? 'rgba(0, 113, 227, 0.12)' : 'rgba(255, 255, 255, 0.75)',
                color: gprFilterOnly ? '#0071e3' : '#515154',
                fontSize: '13px',
                fontWeight: gprFilterOnly ? 600 : 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.15s'
              }}
            >
              <Radar size={15} />
              <span>GPR Files Only</span>
            </button>
          </div>
        </div>

        {/* Quick count chips */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px', color: '#515154' }}>
          <div>
            Showing <strong style={{ color: '#0071e3', fontWeight: 600 }}>{filteredProjects.length}</strong> of {projects.length} municipal project records
          </div>

          {(search || selectedType !== 'All' || selectedStatus !== 'All' || selectedManagedBy !== 'All' || selectedVisibility !== 'All' || gprFilterOnly) && (
            <button
              onClick={() => {
                setSearch('');
                setSelectedType('All');
                setSelectedStatus('All');
                setSelectedManagedBy('All');
                setSelectedVisibility('All');
                setGprFilterOnly(false);
              }}
              style={{ background: 'transparent', border: 'none', color: '#c2411b', cursor: 'pointer', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 500 }}
            >
              <RefreshCw size={13} /> Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Main Table (Liquid Glass Container) */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(255, 255, 255, 0.65)', borderBottom: '1px solid rgba(0, 0, 0, 0.08)' }}>
                {['Tender ID', 'Project / Location', 'GPR Survey', 'Status', 'Visibility', 'Budget & Depth', 'Timeline', ''].map((h, i) => (
                  <th key={i} style={{ padding: '13px 18px', fontSize: '11px', fontWeight: 700, color: '#86868b', letterSpacing: '0.04em', textTransform: 'uppercase', textAlign: i === 7 ? 'right' : 'left', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '56px', textAlign: 'center', color: '#86868b' }}>
                    <Layers size={36} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                    <div style={{ fontSize: '15px', fontWeight: 600, color: '#1d1d1f' }}>No projects match your filter criteria</div>
                    <div style={{ fontSize: '13px', marginTop: '4px', color: '#86868b' }}>Click <strong>+ Add Project</strong> to create a new GPR project.</div>
                  </td>
                </tr>
              ) : (
                filteredProjects.map(project => (
                  <tr
                    key={project.id}
                    style={{
                      borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
                      transition: 'background 0.15s ease'
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.9)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    {/* Tender ID & Type */}
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <TypeIcon type={project.type} size={15} />
                        <div>
                          <div style={{ fontFamily: 'SF Mono, ui-monospace, monospace', fontWeight: 700, color: '#0071e3', fontSize: '11.5px' }}>
                            {project.tenderNumber}
                          </div>
                          <div style={{ fontSize: '11.5px', color: '#86868b', marginTop: '1px' }}>{project.type}</div>
                        </div>
                      </div>
                    </td>

                    {/* Project Name & Corridor */}
                    <td style={{ padding: '14px 18px', maxWidth: '280px' }}>
                      <div
                        onClick={() => setSelectedProjectForDetails(project)}
                        style={{
                          fontWeight: 600,
                          color: '#1d1d1f',
                          fontSize: '13.5px',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          letterSpacing: '-0.01em'
                        }}
                        title={project.name}
                      >
                        {project.name}
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#86868b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>
                        {project.locationName} · {project.wardOrRegion}
                      </div>
                    </td>

                    {/* GPR Status */}
                    <td style={{ padding: '14px 18px' }}>
                      {project.gpr ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Radar size={14} color="#0071e3" />
                          <div>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: '#1d1d1f', whiteSpace: 'nowrap', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {project.gpr.fileName}
                            </div>
                            <div style={{ fontSize: '10.5px', color: '#1a7f37', fontWeight: 600 }}>
                              ● {project.gpr.processingStatus}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span style={{ fontSize: '11px', color: '#86868b' }}>No GPR</span>
                      )}
                    </td>

                    {/* Status */}
                    <td style={{ padding: '14px 18px' }}>
                      <StatusBadge status={project.status} size="sm" />
                    </td>

                    {/* Visibility */}
                    <td style={{ padding: '14px 18px' }}>
                      <VisibilityBadge visibility={project.visibility} size="sm" />
                    </td>

                    {/* Budget & Depth */}
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ fontFamily: 'SF Mono, ui-monospace, monospace', fontWeight: 700, color: '#1d1d1f' }}>
                        {formatINR(project.budget)}
                      </div>
                      <div style={{ fontSize: '11px', color: '#9a6700', fontFamily: 'SF Mono, ui-monospace, monospace', marginTop: '2px', fontWeight: 600 }}>
                        {formatDepth(project.depthMeters)}
                      </div>
                    </td>

                    {/* Timeline */}
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ fontSize: '12px', color: '#1d1d1f' }}>
                        {formatDate(project.startDate)}
                      </div>
                      <div style={{ fontSize: '11px', color: '#86868b', marginTop: '2px' }}>
                        to {formatDate(project.expectedCompletionDate)}
                      </div>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                        <button
                          className="btn-ghost btn-sm"
                          onClick={() => setSelectedProjectForDetails(project)}
                          title="View Specifications"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          className="btn-ghost btn-sm"
                          onClick={() => setProjectToEdit(project)}
                          title="Edit Project & GPR"
                        >
                          <Edit3 size={15} color="#0071e3" />
                        </button>
                        <button
                          className="btn-ghost btn-sm"
                          onClick={() => onNavigateTo2DMap(project)}
                          title="Locate on 2D GIS"
                        >
                          <Compass size={15} color="#0071e3" />
                        </button>
                        <button
                          className="btn-ghost btn-sm"
                          onClick={() => onNavigateTo3DMap(project)}
                          title="View 3D Digital Twin"
                        >
                          <Box size={15} color="#5856d6" />
                        </button>
                        <button
                          className="btn-ghost btn-sm"
                          onClick={() => handleDelete(project.id, project.name)}
                          title="Delete Record"
                        >
                          <Trash2 size={15} color="#c2411b" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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
