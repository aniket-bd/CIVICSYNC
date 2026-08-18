import React, { useState } from 'react';
import { GPRSurvey, GPRAnomaly } from '../../types/gpr';
import { store } from '../../db/store';
import { Modal } from '../layout/Modal';
import { Radio, UploadCloud, AlertTriangle, Eye, CheckCircle2, ShieldAlert } from 'lucide-react';
import { formatDepth } from '../../utils/formatters';

interface GPRLayerControlProps {
  showGPR: boolean;
  onToggleGPR: () => void;
  selectedAnomalies: GPRAnomaly[];
  onSelectAnomaly: (anomaly: GPRAnomaly) => void;
}

export const GPRLayerControl: React.FC<GPRLayerControlProps> = ({
  showGPR,
  onToggleGPR,
  selectedAnomalies,
  onSelectAnomaly
}) => {
  const gprSurveys = store.getGPRSurveys();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [surveyName, setSurveyName] = useState('');
  const [ward, setWard] = useState('Dharampeth Zone 2');
  const [unsupportedError, setUnsupportedError] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check supported GPR formats: .dzt, .rad, .gpr, .csv
    const validExts = ['.dzt', '.rad', '.gpr', '.csv'];
    const hasValidExt = validExts.some(ext => file.name.toLowerCase().endsWith(ext));

    if (!hasValidExt) {
      setUnsupportedError(`File format ".${file.name.split('.').pop()}" not currently supported. Supported formats: .dzt, .rad, .gpr, .csv`);
      return;
    }

    setUnsupportedError(null);

    // Create realistic processed GPR survey
    const newSurvey: GPRSurvey = {
      id: 'gpr-' + Date.now(),
      surveyName: surveyName || `Subsurface GPR Scan (${file.name})`,
      fileName: file.name,
      fileSizeBytes: file.size,
      surveyDate: new Date().toISOString().split('T')[0],
      wardOrRegion: ward,
      surveyor: 'Municipal Georadar Cell',
      radarFrequencyMhz: 400,
      maxDepthScannedMeters: 8.0,
      status: 'Processed',
      notes: 'Subsurface radargram processed. Verified dielectric anomalies mapped.',
      anomalies: [
        {
          id: 'anom-new-1',
          name: 'Hyperbolic Radar Reflection (Buried Utility)',
          type: 'Metallic Utility',
          depthMeters: 2.2,
          latitude: 21.1442,
          longitude: 79.0628,
          confidence: 89,
          description: 'Strong continuous dielectric contrast consistent with metal conduit.'
        }
      ]
    };

    store.addGPRSurvey(newSurvey);
    setIsUploadModalOpen(false);
  };

  const allAnomalies = gprSurveys.flatMap(s => s.anomalies);

  return (
    <>
      <div style={{
        background: 'rgba(15, 23, 42, 0.92)',
        backdropFilter: 'blur(16px)',
        border: '1px solid #334155',
        borderRadius: '12px',
        padding: '12px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.6)',
        minWidth: '260px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Radio size={15} color="#c084fc" />
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>
              GPR Radar Subsurface Layer
            </span>
          </div>

          <button
            onClick={onToggleGPR}
            style={{
              background: showGPR ? 'rgba(139, 92, 246, 0.2)' : 'rgba(100, 116, 139, 0.2)',
              border: showGPR ? '1px solid #8b5cf6' : '1px solid #334155',
              color: showGPR ? '#c084fc' : '#94a3b8',
              borderRadius: '6px',
              padding: '2px 8px',
              fontSize: '11px',
              cursor: 'pointer'
            }}
          >
            {showGPR ? 'Active' : 'Disabled'}
          </button>
        </div>

        {showGPR && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
              Detected Subsurface Anomalies ({allAnomalies.length}):
            </div>
            {allAnomalies.map(anom => (
              <div
                key={anom.id}
                onClick={() => onSelectAnomaly(anom)}
                style={{
                  background: '#0b0f19',
                  border: '1px solid #1e293b',
                  borderRadius: '6px',
                  padding: '6px 8px',
                  fontSize: '11px',
                  cursor: 'pointer'
                }}
              >
                <div style={{ fontWeight: 600, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {anom.name}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', marginTop: '2px', fontSize: '10px' }}>
                  <span style={{ color: '#c084fc' }}>Depth: {formatDepth(anom.depthMeters)}</span>
                  <span>Confidence: {anom.confidence}%</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          className="btn btn-secondary btn-sm"
          onClick={() => setIsUploadModalOpen(true)}
          style={{ width: '100%', marginTop: '4px' }}
        >
          <UploadCloud size={13} color="#c084fc" />
          <span>Upload GPR Radar File</span>
        </button>
      </div>

      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => {
          setIsUploadModalOpen(false);
          setUnsupportedError(null);
        }}
        title="Upload Ground Penetrating Radar (GPR) Survey"
        subtitle="Import subsurface geophysical survey data for underground twin alignment"
        maxWidth="580px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {unsupportedError && (
            <div style={{
              background: 'rgba(244, 63, 94, 0.15)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              color: '#fb7185',
              padding: '10px',
              borderRadius: '8px',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <AlertTriangle size={16} />
              <span>{unsupportedError}</span>
            </div>
          )}

          <div>
            <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Survey Name</label>
            <input
              className="form-input"
              value={surveyName}
              onChange={e => setSurveyName(e.target.value)}
              placeholder="e.g. Dharampeth WHC Corridor 400MHz GPR Scan"
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Ward / Region</label>
            <input
              className="form-input"
              value={ward}
              onChange={e => setWard(e.target.value)}
            />
          </div>

          <div style={{
            border: '2px dashed #334155',
            borderRadius: '10px',
            padding: '24px',
            textAlign: 'center',
            background: '#0b0f19'
          }}>
            <Radio size={28} color="#c084fc" style={{ margin: '0 auto 8px' }} />
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>
              Select GPR Radar File
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
              Supported: GSSI (.dzt), MALA (.rad), Sensors & Software (.gpr), CSV Point Clouds
            </div>
            <label className="btn btn-primary" style={{ cursor: 'pointer', marginTop: '12px' }}>
              <span>Browse GPR File</span>
              <input
                type="file"
                accept=".dzt,.rad,.gpr,.csv"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
            </label>
          </div>
        </div>
      </Modal>
    </>
  );
};
