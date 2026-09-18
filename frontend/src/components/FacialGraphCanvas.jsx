import React, { useRef, useEffect, useState } from 'react';
import {
  Layers,
  Eye,
  EyeOff,
  GitBranch,
  Tag,
  Info,
  Maximize2,
  ZoomIn,
  Sparkles,
  HelpCircle,
} from 'lucide-react';
import {
  CANONICAL_68_LANDMARKS,
  FACIAL_CONTOUR_EDGES,
  LANDMARK_GROUPS,
  getLandmarkRegion,
} from '../services/facialBiomarkers';

/**
 * FacialGraphCanvas Component.
 * 
 * Why: Renders the uploaded patient portrait with an interactive, high-DPI
 * 68-point Facial Landmark Graph and GCN Saliency Edges overlaid on top.
 * Allows clinicians to toggle landmarks, GCN graph edges, and numerical saliency
 * labels to inspect topological biomarkers with zero ambiguity.
 * 
 * @param {Object} props
 * @param {string|null} props.imageUrl - Active patient portrait Data URL or source.
 * @param {Array} props.landmarks - Array of 68 landmark coordinates [{ id, x, y }].
 * @param {Array} props.saliencyEdges - GCN attention edges [{ source, target, saliency, label }].
 * @param {string} props.patientLabel - Diagnostic label (ASD vs Typical Control).
 */
export default function FacialGraphCanvas({
  imageUrl,
  landmarks = CANONICAL_68_LANDMARKS,
  saliencyEdges = [],
  patientLabel = 'Screening in progress',
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // User interactive controls
  const [showLandmarkNodes, setShowLandmarkNodes] = useState(true);
  const [showSaliencyGraph, setShowSaliencyGraph] = useState(true);
  const [showEdgeLabels, setShowEdgeLabels] = useState(true);
  const [showContourMesh, setShowContourMesh] = useState(true);
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Use provided landmarks or fallback to canonical 68 landmarks
  const points = landmarks && landmarks.length === 68 ? landmarks : CANONICAL_68_LANDMARKS;

  /**
   * Main render loop for the high-DPI HTML5 Canvas.
   * Why: Drawing to a unified canvas ensures flawless synchronization between
   * the base photograph, landmark node glows, and GCN topological vectors.
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isSubscribed = true;

    // Load base portrait image
    const img = new Image();
    if (imageUrl) {
      img.src = imageUrl;
    }

    img.onload = () => {
      if (!isSubscribed) return;
      drawCanvas(ctx, canvas, img);
    };

    // If image fails or isn't loaded yet, draw empty placeholder with grid
    if (!imageUrl) {
      drawPlaceholder(ctx, canvas);
    }

    return () => {
      isSubscribed = false;
    };
  }, [imageUrl, points, saliencyEdges, showLandmarkNodes, showSaliencyGraph, showEdgeLabels, showContourMesh, hoveredPoint]);

  /**
   * Draws the complete composite scene: Portrait, Contour Wireframe, GCN Edges, and 68 Landmarks.
   */
  const drawCanvas = (ctx, canvas, img) => {
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth || 500;
    const height = canvas.clientHeight || 560;

    // Resize canvas buffer for crisp high-DPI rendering
    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    // 1. Draw Patient Portrait Background
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, 0, 0, width, height);
      // Dark vignette overlay to heighten graph contrast
      const gradient = ctx.createRadialGradient(width / 2, height / 2, width * 0.3, width / 2, height / 2, width * 0.7);
      gradient.addColorStop(0, 'rgba(0, 0, 0, 0.0)');
      gradient.addColorStop(1, 'rgba(8, 12, 20, 0.45)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    } else {
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, width, height);
    }

    // Coordinate conversion helper (normalized 0-1 to canvas pixels)
    const toPx = (pt) => ({
      x: pt.x * width,
      y: pt.y * height,
    });

    // 2. Draw Natural Anatomical Contour Wireframe (if enabled)
    if (showContourMesh) {
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.setLineDash([3, 3]);

      FACIAL_CONTOUR_EDGES.forEach(([srcIdx, tgtIdx]) => {
        const src = points[srcIdx];
        const tgt = points[tgtIdx];
        if (src && tgt) {
          const p1 = toPx(src);
          const p2 = toPx(tgt);
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      });
      ctx.setLineDash([]); // Reset dash
    }

    // 3. Draw GCN Saliency Edges (Attention Graph)
    if (showSaliencyGraph && saliencyEdges && saliencyEdges.length > 0) {
      saliencyEdges.forEach((edge) => {
        const src = points[edge.source];
        const tgt = points[edge.target];
        if (!src || !tgt) return;

        const p1 = toPx(src);
        const p2 = toPx(tgt);
        const saliency = edge.saliency != null ? edge.saliency : 0.5;

        // Color coding: High Saliency (>0.8) = Red/Coral, Moderate (0.5-0.8) = Amber, Baseline = Cyan
        let strokeColor = '#38bdf8';
        let glowColor = 'rgba(56, 189, 248, 0.6)';
        let lineWidth = 2;

        if (saliency >= 0.8) {
          strokeColor = '#f43f5e'; // Rose/Red
          glowColor = 'rgba(244, 63, 94, 0.85)';
          lineWidth = 3.8;
        } else if (saliency >= 0.5) {
          strokeColor = '#f59e0b'; // Amber
          glowColor = 'rgba(245, 158, 11, 0.75)';
          lineWidth = 2.8;
        }

        // Draw glowing edge line
        ctx.save();
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = saliency >= 0.8 ? 14 : 8;
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = lineWidth;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
        ctx.restore();

        // Draw Edge Label / Saliency Score Badge (if enabled)
        if (showEdgeLabels) {
          const midX = (p1.x + p2.x) / 2;
          const midY = (p1.y + p2.y) / 2;
          const scoreText = saliency.toFixed(2);

          ctx.save();
          ctx.font = 'bold 10px JetBrains Mono, monospace';
          const textMetrics = ctx.measureText(scoreText);
          const badgeWidth = textMetrics.width + 10;
          const badgeHeight = 16;

          // Badge Background
          ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(midX - badgeWidth / 2, midY - badgeHeight / 2, badgeWidth, badgeHeight, 4);
          ctx.fill();
          ctx.stroke();

          // Badge Text
          ctx.fillStyle = strokeColor;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(scoreText, midX, midY + 0.5);
          ctx.restore();
        }
      });
    }

    // 4. Draw 68 Landmark Nodes
    if (showLandmarkNodes) {
      points.forEach((pt) => {
        const p = toPx(pt);
        const region = getLandmarkRegion(pt.id);
        const isHovered = hoveredPoint && hoveredPoint.id === pt.id;

        ctx.save();
        // Glowing halo
        ctx.shadowColor = isHovered ? '#ffffff' : region.glow;
        ctx.shadowBlur = isHovered ? 18 : 8;

        // Outer circular node
        ctx.fillStyle = isHovered ? '#ffffff' : region.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, isHovered ? 6 : 3.5, 0, Math.PI * 2);
        ctx.fill();

        // White center core
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, isHovered ? 2.5 : 1.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      });
    }

    ctx.restore();
  };

  /**
   * Draws an empty placeholder when no image is loaded.
   */
  const drawPlaceholder = (ctx, canvas) => {
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth || 500;
    const height = canvas.clientHeight || 560;

    canvas.width = width * dpr;
    canvas.height = height * dpr;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#64748b';
    ctx.font = '14px Plus Jakarta Sans, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Select or upload a patient portrait to initialize GCN graph', width / 2, height / 2);
    ctx.restore();
  };

  /**
   * Handles mouse movement to detect hovered landmark point for clinical tooltips.
   */
  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    // Detection radius: 10px
    let found = null;
    for (const pt of points) {
      const px = pt.x * width;
      const py = pt.y * height;
      const dist = Math.hypot(mouseX - px, mouseY - py);
      if (dist <= 10) {
        found = pt;
        setTooltipPos({ x: mouseX, y: mouseY });
        break;
      }
    }
    setHoveredPoint(found);
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
  };

  return (
    <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header & Controls Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#818cf8', letterSpacing: '0.05em' }}>
            Topological Graph Explainability
          </span>
          <h2 style={{ margin: '4px 0 0 0', fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <GitBranch size={22} className="text-indigo-400" />
            68-Point Facial Landmark & GCN Graph
          </h2>
        </div>

        {/* Action Toggle Toggles */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {/* Landmark Nodes Toggle */}
          <button
            type="button"
            onClick={() => setShowLandmarkNodes(!showLandmarkNodes)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 10px',
              borderRadius: '8px',
              fontSize: '0.76rem',
              fontWeight: 600,
              backgroundColor: showLandmarkNodes ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.05)',
              color: showLandmarkNodes ? '#a5b4fc' : '#94a3b8',
              border: `1px solid ${showLandmarkNodes ? 'rgba(99, 102, 241, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {showLandmarkNodes ? <Eye size={14} /> : <EyeOff size={14} />}
            <span>68 Nodes</span>
          </button>

          {/* GCN Saliency Graph Toggle */}
          <button
            type="button"
            onClick={() => setShowSaliencyGraph(!showSaliencyGraph)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 10px',
              borderRadius: '8px',
              fontSize: '0.76rem',
              fontWeight: 600,
              backgroundColor: showSaliencyGraph ? 'rgba(244, 63, 94, 0.2)' : 'rgba(255, 255, 255, 0.05)',
              color: showSaliencyGraph ? '#fda4af' : '#94a3b8',
              border: `1px solid ${showSaliencyGraph ? 'rgba(244, 63, 94, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <GitBranch size={14} />
            <span>GCN Edges</span>
          </button>

          {/* Edge Saliency Labels Toggle */}
          <button
            type="button"
            onClick={() => setShowEdgeLabels(!showEdgeLabels)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 10px',
              borderRadius: '8px',
              fontSize: '0.76rem',
              fontWeight: 600,
              backgroundColor: showEdgeLabels ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.05)',
              color: showEdgeLabels ? '#fde68a' : '#94a3b8',
              border: `1px solid ${showEdgeLabels ? 'rgba(245, 158, 11, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Tag size={14} />
            <span>Saliency Scores</span>
          </button>
        </div>
      </div>

      {/* Main Visualizer Container with Relative Overlay */}
      <div
        ref={containerRef}
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '500 / 560',
          maxHeight: '560px',
          borderRadius: '16px',
          overflow: 'hidden',
          backgroundColor: '#090d16',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: 'inset 0 0 30px rgba(0, 0, 0, 0.6)',
        }}
      >
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            cursor: hoveredPoint ? 'pointer' : 'default',
          }}
        />

        {/* Live Hover Tooltip for Point Inspection */}
        {hoveredPoint && (
          <div
            style={{
              position: 'absolute',
              left: `${tooltipPos.x + 12}px`,
              top: `${tooltipPos.y - 12}px`,
              pointerEvents: 'none',
              backgroundColor: 'rgba(15, 23, 42, 0.92)',
              border: '1px solid rgba(99, 102, 241, 0.5)',
              borderRadius: '8px',
              padding: '6px 10px',
              color: '#ffffff',
              fontSize: '0.74rem',
              zIndex: 20,
              boxShadow: '0 6px 20px rgba(0, 0, 0, 0.5)',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
            }}
          >
            <span style={{ fontWeight: 700, color: getLandmarkRegion(hoveredPoint.id).color }}>
              Point #{hoveredPoint.id}: {getLandmarkRegion(hoveredPoint.id).name}
            </span>
            <span className="font-mono" style={{ color: '#94a3b8', fontSize: '0.68rem' }}>
              X: {(hoveredPoint.x * 100).toFixed(1)}% | Y: {(hoveredPoint.y * 100).toFixed(1)}%
            </span>
          </div>
        )}

        {/* Anatomical Regions Color Legend Bar */}
        <div
          style={{
            position: 'absolute',
            bottom: '12px',
            left: '12px',
            right: '12px',
            backgroundColor: 'rgba(11, 15, 25, 0.88)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '10px',
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
            zIndex: 10,
          }}
        >
          {/* Landmark Regions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
              68 Landmarks:
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#34d399' }} />
              <span style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>Eyes (36-47)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
              <span style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>Nose (27-35)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f43f5e' }} />
              <span style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>Mouth (48-67)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#38bdf8' }} />
              <span style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>Jaw (0-16)</span>
            </div>
          </div>

          {/* GCN Saliency Scale */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
              Saliency:
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '12px', height: '4px', borderRadius: '2px', backgroundColor: '#f43f5e' }} />
              <span style={{ fontSize: '0.7rem', color: '#fda4af', fontWeight: 600 }}>High (&gt;0.8)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '12px', height: '4px', borderRadius: '2px', backgroundColor: '#f59e0b' }} />
              <span style={{ fontSize: '0.7rem', color: '#fde68a', fontWeight: 600 }}>Mod (0.5-0.8)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
