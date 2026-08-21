import React from 'react';
import { GitCommit, Sparkles, ArrowRight } from 'lucide-react';

export default function SaliencyPathways({ pathways, biomarkerRois }) {
  if (!pathways || pathways.length === 0) return null;

  return (
    <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Sparkles size={20} color="#f87171" />
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc' }}>
            Top Saliency Neural Biomarkers
          </h3>
        </div>
        <span className="badge badge-primary">
          {pathways.length} Pathways Identified
        </span>
      </div>

      {/* Pathway Cards List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '320px', overflowY: 'auto' }}>
        {pathways.map((edge, idx) => {
          const source = edge.source_name || edge.sourceName || 'ROI_A';
          const target = edge.target_name || edge.targetName || 'ROI_B';
          const network = edge.functional_network || edge.functionalNetwork || 'DMN';
          const score = edge.saliency_score ?? edge.saliencyScore ?? 0.85;

          return (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                backgroundColor: 'rgba(30, 41, 59, 0.45)',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                fontSize: '0.82rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="font-mono" style={{ color: '#94a3b8', fontSize: '0.75rem' }}>#{idx + 1}</span>
                <span style={{ fontWeight: 600, color: '#ffffff' }}>{source}</span>
                <ArrowRight size={14} color="#818cf8" />
                <span style={{ fontWeight: 600, color: '#ffffff' }}>{target}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>
                  {network}
                </span>
                <span className="font-mono" style={{ color: '#f87171', fontWeight: 700 }}>
                  {typeof score === 'number' ? score.toFixed(3) : score}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Top Hotspot ROIs */}
      {biomarkerRois && biomarkerRois.length > 0 && (
        <div style={{ marginTop: '6px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '14px' }}>
          <span style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#94a3b8', marginBottom: '8px' }}>
            Critical ROI Hotspots:
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {biomarkerRois.map((roi, idx) => {
              const roiName = roi.name || `ROI_${roi.roi_index || roi.roiIndex || idx}`;
              const roiScore = roi.importance ?? 2.5;

              return (
                <span
                  key={idx}
                  style={{
                    padding: '4px 10px',
                    backgroundColor: 'rgba(99, 102, 241, 0.12)',
                    border: '1px solid rgba(99, 102, 241, 0.25)',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: '#c7d2fe'
                  }}
                >
                  {roiName} ({typeof roiScore === 'number' ? roiScore.toFixed(2) : roiScore})
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
