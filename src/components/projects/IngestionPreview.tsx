import React, { useState } from 'react';
import { IngestionReport, IngestionPreviewItem } from '../../types/ingestion';
import { Project } from '../../types/project';
import { CheckCircle2, AlertTriangle, XCircle, Copy, ArrowRight, ShieldAlert } from 'lucide-react';
import { formatINR } from '../../utils/formatters';
import { TypeIcon } from '../common/TypeIcon';

interface IngestionPreviewProps {
  report: IngestionReport;
  onConfirmImport: (projectsToImport: Project[]) => void;
  onCancel: () => void;
}

export const IngestionPreview: React.FC<IngestionPreviewProps> = ({
  report,
  onConfirmImport,
  onCancel
}) => {
  const [items, setItems] = useState<IngestionPreviewItem[]>(report.previewItems);

  const toggleSelect = (index: number) => {
    setItems(prev => prev.map(item => 
      item.index === index ? { ...item, selectedForImport: !item.selectedForImport } : item
    ));
  };

  const selectAllValid = () => {
    setItems(prev => prev.map(item => ({
      ...item,
      selectedForImport: item.isValid && !item.isDuplicate
    })));
  };

  const selectedCount = items.filter(i => i.selectedForImport).length;

  const handleConfirm = () => {
    const validProjects = items
      .filter(i => i.selectedForImport && i.parsedProject)
      .map(i => i.parsedProject as Project);
    onConfirmImport(validProjects);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Validation Summary Bar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: '10px'
      }}>
        <div style={{ background: '#111827', border: '1px solid #1e293b', borderRadius: '8px', padding: '10px' }}>
          <div style={{ fontSize: '11px', color: '#94a3b8' }}>Total Ingested</div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc' }}>{report.totalRecords}</div>
        </div>

        <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', padding: '10px' }}>
          <div style={{ fontSize: '11px', color: '#34d399', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle2 size={12} /> Valid Records
          </div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#34d399' }}>{report.validRecordsCount}</div>
        </div>

        <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '8px', padding: '10px' }}>
          <div style={{ fontSize: '11px', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <AlertTriangle size={12} /> Missing Fields
          </div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#fbbf24' }}>{report.missingFieldsCount}</div>
        </div>

        <div style={{ background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.3)', borderRadius: '8px', padding: '10px' }}>
          <div style={{ fontSize: '11px', color: '#fb7185', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <XCircle size={12} /> Invalid Records
          </div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#fb7185' }}>{report.invalidRecordsCount}</div>
        </div>

        <div style={{ background: 'rgba(100, 116, 139, 0.1)', border: '1px solid rgba(100, 116, 139, 0.3)', borderRadius: '8px', padding: '10px' }}>
          <div style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Copy size={12} /> Duplicates
          </div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#94a3b8' }}>{report.duplicateRecordsCount}</div>
        </div>
      </div>

      {/* Safety Notice */}
      <div style={{
        background: 'rgba(2, 132, 199, 0.1)',
        border: '1px solid rgba(2, 132, 199, 0.3)',
        borderRadius: '8px',
        padding: '10px 14px',
        fontSize: '12px',
        color: '#7dd3fc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldAlert size={16} />
          <span>
            <strong>Pre-Import Verification Active:</strong> Review extracted field mappings below. Selected items will be stored in normalized spatial database.
          </span>
        </div>
        <button
          onClick={selectAllValid}
          style={{
            background: 'transparent',
            border: '1px solid #0284c7',
            color: '#38bdf8',
            borderRadius: '4px',
            padding: '3px 8px',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Select All Valid
        </button>
      </div>

      {/* Records Preview Table */}
      <div style={{
        maxHeight: '340px',
        overflowY: 'auto',
        border: '1px solid #1e293b',
        borderRadius: '8px',
        background: '#0b0f19'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#111827', color: '#94a3b8', borderBottom: '1px solid #1e293b' }}>
              <th style={{ padding: '10px', width: '40px' }}>Import</th>
              <th style={{ padding: '10px' }}>Tender ID</th>
              <th style={{ padding: '10px' }}>Project Name</th>
              <th style={{ padding: '10px' }}>Type</th>
              <th style={{ padding: '10px' }}>Budget</th>
              <th style={{ padding: '10px' }}>Depth</th>
              <th style={{ padding: '10px' }}>Status & Issues</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => {
              const p = item.parsedProject;
              return (
                <tr
                  key={item.index}
                  style={{
                    borderBottom: '1px solid #1e293b',
                    background: item.selectedForImport ? 'rgba(2, 132, 199, 0.05)' : 'transparent'
                  }}
                >
                  <td style={{ padding: '10px' }}>
                    <input
                      type="checkbox"
                      checked={item.selectedForImport}
                      onChange={() => toggleSelect(item.index)}
                      disabled={!item.isValid}
                    />
                  </td>
                  <td style={{ padding: '10px', fontFamily: 'JetBrains Mono', color: '#38bdf8' }}>
                    {p?.tenderNumber || 'N/A'}
                  </td>
                  <td style={{ padding: '10px', maxWidth: '240px', fontWeight: 600, color: '#f8fafc' }}>
                    <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p?.name || 'Unnamed Project'}
                    </div>
                    <div style={{ fontSize: '10px', color: '#64748b' }}>
                      {p?.locationName}
                    </div>
                  </td>
                  <td style={{ padding: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {p?.type && <TypeIcon type={p.type} size={13} />}
                      <span>{p?.type || 'Other'}</span>
                    </div>
                  </td>
                  <td style={{ padding: '10px', fontFamily: 'JetBrains Mono', color: '#34d399' }}>
                    {formatINR(p?.budget)}
                  </td>
                  <td style={{ padding: '10px', fontFamily: 'JetBrains Mono' }}>
                    {p?.depthMeters ? `${p.depthMeters} m` : 'N/A'}
                  </td>
                  <td style={{ padding: '10px' }}>
                    {item.isDuplicate ? (
                      <span style={{ color: '#fbbf24', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
                        <AlertTriangle size={12} /> Duplicate Tender
                      </span>
                    ) : item.issues.length > 0 ? (
                      <span style={{ color: '#fb7185', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
                        <XCircle size={12} /> {item.issues[0].message}
                      </span>
                    ) : (
                      <span style={{ color: '#34d399', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
                        <CheckCircle2 size={12} /> Ready
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Action Footer */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: '12px',
        borderTop: '1px solid #1e293b'
      }}>
        <div style={{ fontSize: '13px', color: '#94a3b8' }}>
          Selected <strong style={{ color: '#38bdf8' }}>{selectedCount}</strong> of {items.length} records for database commit
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={onCancel}>
            Back / Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleConfirm}
            disabled={selectedCount === 0}
          >
            <span>Confirm & Import ({selectedCount})</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
