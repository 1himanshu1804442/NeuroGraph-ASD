import React from 'react';
import { Activity, Brain, ShieldCheck, Sparkles, Database, History } from 'lucide-react';

export default function Header({ isOnline, onOpenHistory, historyCount = 0 }) {
  return (
    <header style={{
      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      backgroundColor: 'rgba(11, 15, 25, 0.85)',
      backdropFilter: 'blur(12px)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      padding: '16px 28px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '12px',
    }}>
      {/* Brand Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{
          background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)',
          width: '42px',
          height: '42px',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)'
        }}>
          <Brain size={24} color="#ffffff" />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.025em', color: '#ffffff' }}>
              NeuroGraph<span style={{ color: '#818cf8' }}>-ASD</span>
            </h1>
            <span className="badge badge-primary">v1.0 XAI</span>
          </div>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>
            Explainable Graph Attention Network for rs-fMRI Connectome Screening
          </p>
        </div>
      </div>

      {/* Action Controls & System Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
        {/* Patient History / Records Modal Trigger Button */}
        <button
          type="button"
          onClick={onOpenHistory}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '7px 14px',
            borderRadius: '10px',
            backgroundColor: 'rgba(99, 102, 241, 0.12)',
            border: '1px solid rgba(99, 102, 241, 0.35)',
            color: '#a5b4fc',
            fontSize: '0.82rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          className="glass-panel-hover"
        >
          <History size={15} color="#818cf8" />
          <span>Patient History / Records</span>
          {historyCount > 0 && (
            <span
              style={{
                backgroundColor: 'rgba(99, 102, 241, 0.35)',
                color: '#ffffff',
                fontSize: '0.7rem',
                fontWeight: 700,
                padding: '1px 6px',
                borderRadius: '9999px',
                marginLeft: '2px',
              }}
            >
              {historyCount}
            </span>
          )}
        </button>

        {/* Backend & GAT Status Pill */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 14px',
          borderRadius: '9999px',
          backgroundColor: isOnline ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          border: `1px solid ${isOnline ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: isOnline ? '#10b981' : '#ef4444'
          }} />
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: isOnline ? '#34d399' : '#f87171' }}>
            {isOnline ? 'GAT Engine Ready' : 'Connecting to API...'}
          </span>
        </div>

        <div className="badge badge-primary" style={{ display: 'flex', gap: '6px' }}>
          <Sparkles size={14} />
          <span>AAL-116 Atlas</span>
        </div>
      </div>
    </header>
  );
}

