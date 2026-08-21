import React from 'react';
import { Layers } from 'lucide-react';

export default function NetworkAttribution({ networkAttribution }) {
  if (!networkAttribution) return null;

  const networks = Object.entries(networkAttribution).sort((a, b) => b[1] - a[1]);

  const networkColors = {
    "Default Mode Network (DMN)": "#f87171",
    "Salience Network": "#fbbf24",
    "Frontoparietal / Executive": "#818cf8",
    "Visual / Sensorimotor": "#34d399",
    "Subcortical / General Connectivity": "#94a3b8"
  };

  return (
    <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Layers size={20} color="#818cf8" />
        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc' }}>
          Functional Sub-Network Attribution
        </h3>
      </div>
      <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>
        GNNExplainer relative contribution of canonical neurological circuits to the diagnostic decision:
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {networks.map(([name, score]) => {
          const color = networkColors[name] || "#818cf8";
          return (
            <div key={name}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                <span style={{ fontWeight: 600, color: '#e2e8f0' }}>{name}</span>
                <span className="font-mono" style={{ fontWeight: 700, color: color }}>{score}%</span>
              </div>
              <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(255, 255, 255, 0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{
                  width: `${score}%`,
                  height: '100%',
                  backgroundColor: color,
                  borderRadius: '4px',
                  transition: 'width 0.6s ease'
                }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
