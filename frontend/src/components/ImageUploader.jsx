import React, { useRef, useState } from 'react';
import {
  UploadCloud,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  X,
  FileText,
  Scan,
  UserCheck
} from 'lucide-react';
import { PRESET_SAMPLE_PORTRAITS } from '../services/facialBiomarkers';

/**
 * ImageUploader Component.
 * 
 * Why: Provides a multi-format drag-and-drop zone, file picker, and preconfigured
 * benchmark clinical sample portraits. Allows clinicians to upload custom portraits
 * (JPG, PNG, WEBP) or evaluate preset clinical cohorts with 1-click.
 * 
 * @param {Object} props
 * @param {File|null} props.uploadedImageFile - The currently selected File object.
 * @param {string|null} props.imagePreviewUrl - The Data URL or image source for display.
 * @param {Function} props.onImageUpload - Callback when a new file is uploaded/dragged.
 * @param {Function} props.onSampleSelect - Callback when a preset sample portrait is clicked.
 * @param {string} props.selectedPresetId - Active preset ID or 'custom'.
 * @param {Function} props.onRunInference - Callback to trigger GCN facial inference.
 * @param {boolean} props.isLoading - Whether inference is currently executing.
 * @param {Function} props.onClearImage - Callback to remove active image.
 */
export default function ImageUploader({
  uploadedImageFile,
  imagePreviewUrl,
  onImageUpload,
  onSampleSelect,
  selectedPresetId,
  onRunInference,
  isLoading = false,
  onClearImage,
}) {
  const fileInputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  // Accepted file types for facial screening
  const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];

  /**
   * Validates and passes file to parent hook.
   * Why: Ensures corrupted or non-image files are rejected before sending to backend.
   */
  const processSelectedFile = (file) => {
    setUploadError(null);
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type) && !file.name.match(/\.(jpe?g|png|webp|svg)$/i)) {
      setUploadError('Invalid format. Please provide a JPG, PNG, WEBP, or SVG portrait.');
      return;
    }

    // 15MB file size limit
    if (file.size > 15 * 1024 * 1024) {
      setUploadError('File exceeds 15 MB limit. Please select an optimized clinical photograph.');
      return;
    }

    onImageUpload(file);
  };

  // Drag & drop handlers
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Panel Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#818cf8', letterSpacing: '0.05em' }}>
            Facial Phenotyping Pipeline
          </span>
          <h2 style={{ margin: '4px 0 0 0', fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Scan size={22} className="text-indigo-400" />
            Patient Portrait Screening
          </h2>
        </div>
        <div className="badge badge-primary">
          <Sparkles size={12} />
          <span>GCN + Grad-CAM</span>
        </div>
      </div>

      {/* Preset Sample Portraits Selector */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8' }}>
            Preset Sample Portraits (1-Click Evaluation):
          </span>
          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
            Clinically Calibrated
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
          {PRESET_SAMPLE_PORTRAITS.map((sample) => {
            const isSelected = selectedPresetId === sample.id;
            const isASD = sample.predicted_class === 1;

            return (
              <button
                key={sample.id}
                type="button"
                onClick={() => onSampleSelect(sample.id)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '10px 8px',
                  borderRadius: '12px',
                  backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.22)' : 'rgba(15, 23, 42, 0.65)',
                  border: `1.5px solid ${isSelected ? '#818cf8' : 'rgba(255, 255, 255, 0.08)'}`,
                  boxShadow: isSelected ? '0 0 16px rgba(99, 102, 241, 0.35)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  textAlign: 'center',
                }}
                className="glass-panel-hover"
              >
                {/* Thumbnail Avatar */}
                <div style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  border: `2px solid ${isSelected ? '#818cf8' : 'rgba(255,255,255,0.15)'}`,
                  marginBottom: '8px',
                  backgroundColor: '#0f172a',
                }}>
                  <img
                    src={sample.imageUrl}
                    alt={sample.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>

                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: isSelected ? '#ffffff' : '#cbd5e1' }}>
                  {sample.title}
                </span>

                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  color: isASD ? '#f87171' : '#34d399',
                  marginTop: '3px',
                }}>
                  {isASD ? 'ASD Phenotype' : 'Typical Control'}
                </span>

                <span style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '2px' }}>
                  {sample.demographics.age} yrs • {sample.demographics.sex === 1 ? 'Male' : 'Female'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Drag & Drop Dropzone / Active Preview */}
      {imagePreviewUrl ? (
        <div style={{
          position: 'relative',
          borderRadius: '14px',
          border: '1.5px solid rgba(99, 102, 241, 0.35)',
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          padding: '16px',
          display: 'flex',
          gap: '16px',
          alignItems: 'center',
        }}>
          {/* Image Thumbnail */}
          <div style={{
            width: '92px',
            height: '104px',
            borderRadius: '10px',
            overflow: 'hidden',
            flexShrink: 0,
            border: '1px solid rgba(255, 255, 255, 0.1)',
            backgroundColor: '#090d16',
          }}>
            <img
              src={imagePreviewUrl}
              alt="Active screening subject"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>

          {/* Details & Controls */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#34d399', textTransform: 'uppercase' }}>
                Portrait Loaded & Calibrated
              </span>
            </div>

            <p style={{
              margin: 0,
              fontSize: '0.9rem',
              fontWeight: 600,
              color: '#ffffff',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {uploadedImageFile?.name || (selectedPresetId ? `${selectedPresetId.toUpperCase()}_CASE.svg` : 'Patient_Portrait.png')}
            </p>

            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              Size: {uploadedImageFile ? formatFileSize(uploadedImageFile.size) : '48.2 KB'} • 68 Landmarks Ready
            </span>

            <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  backgroundColor: 'rgba(99, 102, 241, 0.15)',
                  color: '#a5b4fc',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  cursor: 'pointer',
                }}
              >
                Change Photo
              </button>

              <button
                type="button"
                onClick={onClearImage}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  backgroundColor: 'rgba(239, 68, 68, 0.12)',
                  color: '#fca5a5',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <X size={12} />
                Clear
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Empty State Dropzone */
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${isDragOver ? '#818cf8' : 'rgba(255, 255, 255, 0.15)'}`,
            borderRadius: '14px',
            padding: '32px 20px',
            textAlign: 'center',
            cursor: 'pointer',
            backgroundColor: isDragOver ? 'rgba(99, 102, 241, 0.12)' : 'rgba(15, 23, 42, 0.4)',
            transition: 'all 0.2s ease',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '14px',
            backgroundColor: 'rgba(99, 102, 241, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#818cf8',
          }}>
            <UploadCloud size={28} />
          </div>

          <div>
            <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#ffffff' }}>
              Drag and drop patient portrait photo here
            </p>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
              Supports JPG, PNG, WEBP (frontal view recommended, max 15MB)
            </p>
          </div>

          <span style={{
            fontSize: '0.72rem',
            padding: '4px 12px',
            borderRadius: '9999px',
            backgroundColor: 'rgba(255, 255, 255, 0.06)',
            color: '#cbd5e1',
          }}>
            Or click to browse files
          </span>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/svg+xml"
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
      />

      {/* Upload Error Alert */}
      {uploadError && (
        <div style={{
          backgroundColor: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.35)',
          borderRadius: '10px',
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: '#fca5a5',
          fontSize: '0.8rem',
        }}>
          <AlertCircle size={16} className="shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Primary Action Button */}
      <button
        type="button"
        disabled={!imagePreviewUrl || isLoading}
        onClick={onRunInference}
        style={{
          width: '100%',
          padding: '14px 20px',
          borderRadius: '12px',
          fontWeight: 700,
          fontSize: '0.95rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          cursor: !imagePreviewUrl || isLoading ? 'not-allowed' : 'pointer',
          opacity: !imagePreviewUrl || isLoading ? 0.6 : 1,
          backgroundColor: '#6366f1',
          backgroundImage: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
          color: '#ffffff',
          border: 'none',
          boxShadow: '0 8px 24px -4px rgba(99, 102, 241, 0.5)',
          transition: 'all 0.2s ease',
        }}
        className="glass-panel-hover"
      >
        {isLoading ? (
          <>
            <div style={{
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              borderTopColor: '#ffffff',
            }} className="spin" />
            <span>Analyzing Facial Topology (GCN + Grad-CAM)...</span>
          </>
        ) : (
          <>
            <Scan size={18} />
            <span>Run Facial GCN Screening</span>
          </>
        )}
      </button>

      {/* Clinical Guidance Footnote */}
      <div style={{ fontSize: '0.73rem', color: '#64748b', lineHeight: 1.4, textAlign: 'center' }}>
        Extracts 68-point spatial facial landmarks, constructs GCN adjacency matrix, and computes Grad-CAM activation backpropagation.
      </div>
    </div>
  );
}
