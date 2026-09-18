import React from 'react';
import { GitCommit, ArrowRight, Sparkles } from 'lucide-react';
import { getLandmarkRegion } from '../services/facialBiomarkers';

/**
 * FacialSaliencyList Component.
 * 
 * Why: Renders the ranked list of GCN spatial attention edges connecting
 * landmark pairs, complete with anatomical feature mapping and saliency intensity.
 * 
 * @param {Object} props
 * @param {Array} props.edges - List of GCN attention edges [{ source, target, saliency, label }]
 */
export default function FacialSaliencyList({ edges = [] }) {
  if (!edges || edges.length === 0) return null;

  return (
    <div className="glass-panel" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', color: '#818cf8', letterSpacing: '0.05em' }}>
            Graph Attention Network Edges
          </span>
          <h3 style={{ margin: '3px 0 0 0', fontSize: '1.15rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <GitCommit size={18} className="text-indigo-400" />
            Top GCN Saliency Pathways
          </h3>
        </div>
        <div className="badge badge-primary">
          <Sparkles size={12} />
          <span>Ranked by Saliency</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {edges.map((edge, idx) => {
          const srcRegion = getLandmarkRegion(edge.source);
          const tgtRegion = getLandmarkRegion(edge.target);
          const saliencyVal = edge.saliency != null ? edge.saliency : 0.5;
          const isHigh = saliencyVal >= 0.8;
          const isMod = saliencyVal >= 0.5 && saliencyVal < 0.8;

          return (
            <div
              key={`${edge.source}-${edge.target}-${idx}`}
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.6)',
                border: `1px solid ${isHigh ? 'rgba(244, 63, 94, 0.3)' : 'rgba(255, 255, 255, 0.07)'}`,
                borderRadius: '10px',
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px',
              }}
            >
              {/* Landmark Pair Connection */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '220px' }}>
                <span
                  style={{
                    backgroundColor: srcRegion.color,
                    color: '#090d16',
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    padding: '2px 7px',
                    borderRadius: '5px',
                  }}
                >
                  Pt #{edge.source}
                </span>

                <ArrowRight size={13} className="text-slate-400" />

                <span
                  style={{
                    backgroundColor: tgtRegion.color,
                    color: '#090d16',
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    padding: '2px 7px',
                    borderRadius: '5px',
                  }}
                >
                  Pt #{edge.target}
                </span>

                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#f1f5f9', marginLeft: '6px' }}>
                  {edge.label || `${srcRegion.name} ➔ ${tgtRegion.name}`}
                </span>
              </div>

              {/* Saliency Metric */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '80px', height: '6px', backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${saliencyVal * 100}%`,
                      height: '100%',
                      backgroundColor: isHigh ? '#f43f5e' : (isMod ? '#f59e0b' : '#38bdf8'),
                      borderRadius: '3px',
                    }}
                  />
                </div>

                <span
                  className="font-mono"
                  style={{
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    color: isHigh ? '#fda4af' : (isMod ? '#fde68a' : '#7dd3fc'),
                    minWidth: '40px',
                    textAlign: 'right',
                  }}
                >
                  {saliencyVal.toFixed(3)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
