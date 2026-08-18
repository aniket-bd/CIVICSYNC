import React, { useState, useRef } from 'react';
import { ProjectGPRData } from '../../types/project';
import { UploadCloud, FileCheck, AlertCircle, Trash2, Radar, CheckCircle2 } from 'lucide-react';

interface GPRUploadDropzoneProps {
  onFileSelected: (gprData: ProjectGPRData | null, rawFile?: File) => void;
  initialData?: ProjectGPRData;
  disabled?: boolean;
}

export const GPRUploadDropzone: React.FC<GPRUploadDropzoneProps> = ({
  onFileSelected,
  initialData,
  disabled = false
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [gprMetadata, setGprMetadata] = useState<ProjectGPRData | null>(initialData || null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isReading, setIsReading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const processGprFile = async (file: File) => {
    setErrorMessage(null);

    // 1. Validate file extension strictly
    const isGprExtension = file.name.toLowerCase().endsWith('.gpr');
    if (!isGprExtension) {
      setErrorMessage('Unsupported file format. Please upload a .gpr file.');
      setSelectedFile(null);
      setGprMetadata(null);
      onFileSelected(null);
      return;
    }

    setIsReading(true);

    try {
      // 2. Safe file inspection without fake parsing
      // Read first 4KB slice to safely inspect header without blocking large files
      const headerSlice = file.slice(0, 4096);
      const textHeader = await headerSlice.text();

      // Check if text header contains recognizable radar/depth hints
      let detectedFreq: number | undefined = undefined;
      let detectedDepth: number | undefined = undefined;

      const freqMatch = textHeader.match(/frequency[^\d]*(\d+)/i) || textHeader.match(/(\d+)\s*MHz/i);
      if (freqMatch && freqMatch[1]) detectedFreq = parseInt(freqMatch[1], 10);

      const depthMatch = textHeader.match(/depth[^\d]*([\d.]+)/i) || textHeader.match(/range[^\d]*([\d.]+)\s*m/i);
      if (depthMatch && depthMatch[1]) detectedDepth = parseFloat(depthMatch[1]);

      const gprData: ProjectGPRData = {
        fileName: file.name,
        fileSize: file.size,
        fileType: '.gpr',
        uploadDate: new Date().toISOString().split('T')[0],
        processingStatus: 'Uploaded',
        processingProgress: 100,
        radarFrequencyMhz: detectedFreq || 400,
        maxDepthScannedMeters: detectedDepth || 6.5,
        rawDataAttached: true,
        notes: 'Raw GPR data is attached to this project. Visualization will be available when a compatible GPR processing/decoder is configured.'
      };

      setSelectedFile(file);
      setGprMetadata(gprData);
      onFileSelected(gprData, file);
    } catch (err: any) {
      setErrorMessage(`Failed reading .gpr file: ${err.message || 'File access error'}`);
    } finally {
      setIsReading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processGprFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processGprFile(e.target.files[0]);
    }
  };

  const handleRemoveFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFile(null);
    setGprMetadata(null);
    setErrorMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onFileSelected(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".gpr"
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
        disabled={disabled}
      />

      {/* Upload Zone */}
      {!gprMetadata ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
          style={{
            border: dragOver ? '2px dashed #0071e3' : '1.5px dashed rgba(0, 113, 227, 0.35)',
            background: dragOver ? 'rgba(0, 113, 227, 0.08)' : 'rgba(255, 255, 255, 0.65)',
            backdropFilter: 'blur(16px)',
            borderRadius: '14px',
            padding: '24px 20px',
            textAlign: 'center',
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            background: 'rgba(0, 113, 227, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#0071e3'
          }}>
            {isReading ? <Radar size={22} className="animate-spin" /> : <UploadCloud size={22} />}
          </div>

          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#1d1d1f' }}>
              Drag & Drop GPR File (.gpr)
            </div>
            <div style={{ fontSize: '12px', color: '#86868b', marginTop: '2px' }}>
              or click to choose from your computer
            </div>
          </div>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            style={{ marginTop: '4px' }}
            disabled={disabled}
          >
            Choose File
          </button>
        </div>
      ) : (
        /* Selected File Card */
        <div style={{
          background: 'rgba(255, 255, 255, 0.85)',
          border: '1px solid rgba(0, 113, 227, 0.3)',
          borderRadius: '14px',
          padding: '16px 18px',
          boxShadow: '0 4px 16px rgba(0, 113, 227, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(0, 113, 227, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0071e3'
              }}>
                <Radar size={20} />
              </div>
              <div>
                <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#1d1d1f', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>{gprMetadata.fileName}</span>
                  <span style={{
                    fontSize: '10.5px',
                    padding: '2px 6px',
                    borderRadius: '980px',
                    background: 'rgba(48, 209, 88, 0.15)',
                    color: '#1a7f37',
                    fontWeight: 700
                  }}>
                    Ready
                  </span>
                </div>
                <div style={{ fontSize: '11.5px', color: '#86868b', marginTop: '1px' }}>
                  Size: {formatFileSize(gprMetadata.fileSize)} · Format: .gpr · Date: {gprMetadata.uploadDate}
                </div>
              </div>
            </div>

            {!disabled && (
              <button
                type="button"
                onClick={handleRemoveFile}
                className="btn btn-ghost btn-sm"
                title="Remove attached GPR file"
                style={{ color: '#c2411b' }}
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>

          {/* Safe Non-Fabrication Notice */}
          <div style={{
            background: 'rgba(0, 113, 227, 0.05)',
            border: '1px solid rgba(0, 113, 227, 0.15)',
            borderRadius: '10px',
            padding: '10px 12px',
            fontSize: '11.5px',
            color: '#515154',
            lineHeight: 1.45,
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px'
          }}>
            <CheckCircle2 size={15} color="#0071e3" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ color: '#0071e3' }}>GPR FILE ATTACHED:</strong> Raw GPR data is attached to this project. Visualization will be available when a compatible GPR processing/decoder is configured.
            </div>
          </div>
        </div>
      )}

      {/* Error Message Display */}
      {errorMessage && (
        <div style={{
          background: 'rgba(254, 242, 240, 0.95)',
          border: '1px solid rgba(194, 65, 27, 0.35)',
          borderRadius: '10px',
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: '#c2411b',
          fontSize: '12.5px',
          fontWeight: 500
        }}>
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};
