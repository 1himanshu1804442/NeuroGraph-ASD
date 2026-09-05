import React from 'react';
import { User, Activity, Play, Zap, FileText } from 'lucide-react';

export default function DemographicsForm({
  demographics,
  onChange,
  onLoadPreset,
  selectedPreset,
  sampleCases = [],
  onSubmit,
  isLoading
}) {
  const handleChange = (e) => {
    const { name, value } = e.target;
    onChange({
      ...demographics,
      [name]: name === 'sex' ? parseInt(value, 10) : (name === 'age' || name === 'full_scale_iq' ? parseFloat(value) : value)
    });
  };

  const isASDPresetActive = selectedPreset === 'asd_sample';
  const isControlPresetActive = selectedPreset === 'control_sample';

  return (
    <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header & Quick Preset Presets */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <User size={20} color="#818cf8" />
          <div>
            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
              Patient Phenotypic Profile
            </h2>
            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
              ABIDE I & II Multimodal Connectome Screening
            </span>
          </div>
        </div>

        {/* Quick Presets */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => onLoadPreset('asd_sample')}
            style={{
              padding: '6px 12px',
              backgroundColor: isASDPresetActive ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.12)',
              border: `1px solid ${isASDPresetActive ? 'rgba(239, 68, 68, 0.7)' : 'rgba(239, 68, 68, 0.3)'}`,
              borderRadius: '8px',
              color: '#fca5a5',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
              boxShadow: isASDPresetActive ? '0 0 10px rgba(239, 68, 68, 0.25)' : 'none'
            }}
          >
            <Zap size={13} />
            Preset: ASD Case
          </button>

          <button
            type="button"
            onClick={() => onLoadPreset('control_sample')}
            style={{
              padding: '6px 12px',
              backgroundColor: isControlPresetActive ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.12)',
              border: `1px solid ${isControlPresetActive ? 'rgba(16, 185, 129, 0.7)' : 'rgba(16, 185, 129, 0.3)'}`,
              borderRadius: '8px',
              color: '#6ee7b7',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
              boxShadow: isControlPresetActive ? '0 0 10px rgba(16, 185, 129, 0.25)' : 'none'
            }}
          >
            <Zap size={13} />
            Preset: Typical Control
          </button>
        </div>
      </div>

      {/* Cohort Selector Dropdown for Real ABIDE I Subjects */}
      {Array.isArray(sampleCases) && sampleCases.length > 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#818cf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FileText size={13} /> Real ABIDE I Clinical Cohort Samples:
          </label>
          <select
            value={selectedPreset || ''}
            onChange={(e) => {
              if (e.target.value) onLoadPreset(e.target.value);
            }}
            style={{
              width: '100%',
              padding: '8px 12px',
              backgroundColor: '#1e293b',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              borderRadius: '8px',
              color: '#e2e8f0',
              fontSize: '0.82rem',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="" disabled>Select a genuine ABIDE I subject...</option>
            {sampleCases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Form Fields Grid */}
      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
          {/* Subject ID */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
              Subject ID
            </label>
            <input
              type="text"
              name="subject_id"
              value={demographics.subject_id}
              onChange={handleChange}
              required
              className="font-mono"
              style={{
                width: '100%',
                padding: '10px 12px',
                backgroundColor: 'rgba(30, 41, 59, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                color: '#ffffff',
                fontSize: '0.85rem'
              }}
            />
          </div>

          {/* Age at Scan */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
              Age at Scan (Years)
            </label>
            <input
              type="number"
              step="0.1"
              min="1"
              max="90"
              name="age"
              value={demographics.age}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                backgroundColor: 'rgba(30, 41, 59, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                color: '#ffffff',
                fontSize: '0.85rem'
              }}
            />
          </div>

          {/* Biological Sex */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
              Biological Sex
            </label>
            <select
              name="sex"
              value={demographics.sex}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '10px 12px',
                backgroundColor: '#1e293b',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                color: '#ffffff',
                fontSize: '0.85rem'
              }}
            >
              <option value={1}>Male (XY)</option>
              <option value={0}>Female (XX)</option>
            </select>
          </div>

          {/* Full Scale IQ */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
              Full-Scale IQ (FIQ)
            </label>
            <input
              type="number"
              step="1"
              min="40"
              max="160"
              name="full_scale_iq"
              value={demographics.full_scale_iq}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                backgroundColor: 'rgba(30, 41, 59, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                color: '#ffffff',
                fontSize: '0.85rem'
              }}
            />
          </div>

          {/* Acquisition Site */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
              Imaging Center / Site
            </label>
            <input
              type="text"
              name="site_id"
              value={demographics.site_id}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                backgroundColor: 'rgba(30, 41, 59, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                color: '#ffffff',
                fontSize: '0.85rem'
              }}
            />
          </div>
        </div>

        {/* Submit Action Button */}
        <button
          type="submit"
          disabled={isLoading}
          style={{
            marginTop: '8px',
            padding: '12px 24px',
            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
            border: 'none',
            borderRadius: '10px',
            color: '#ffffff',
            fontSize: '0.95rem',
            fontWeight: 700,
            cursor: isLoading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            boxShadow: '0 4px 18px rgba(99, 102, 241, 0.35)',
            opacity: isLoading ? 0.7 : 1,
            transition: 'all 0.2s ease'
          }}
        >
          {isLoading ? (
            <>
              <Activity className="spin" size={18} />
              <span>Analyzing Connectome & Extracting Saliency Subgraphs...</span>
            </>
          ) : (
            <>
              <Play size={18} fill="#ffffff" />
              <span>Run Multimodal GAT Screening</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
