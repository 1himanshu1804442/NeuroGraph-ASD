import React, { useState, useEffect, useRef } from 'react';
import { Eye, Box, Layers, RefreshCw, ZoomIn, ZoomOut, Compass } from 'lucide-react';
import * as THREE from 'three';

export default function ConnectomeCanvas({ graphData }) {
  const [hoveredNode, setHoveredNode] = useState(null);
  const [viewMode, setViewMode] = useState('3d'); // '3d', 'axial', 'sagittal', 'coronal'
  const mountRef = useRef(null);
  const sceneRef = useRef(null);

  // -------------------------------------------------------------
  // 3D WebGL Three.js Brain Visualizer
  // -------------------------------------------------------------
  useEffect(() => {
    if (viewMode !== '3d' || !mountRef.current || !graphData || !graphData.nodes) {
      return;
    }

    const container = mountRef.current;
    const width = container.clientWidth || 600;
    const height = container.clientHeight || 460;

    // 1. Three.js Scene, Camera, & Renderer
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 30, 220);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x090d16, 1);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 2. Anatomical Glass Brain Outline (Translucent Hull Wireframe)
    const brainGroup = new THREE.Group();
    scene.add(brainGroup);

    const brainGeometry = new THREE.SphereGeometry(72, 32, 24);
    brainGeometry.scale(1.0, 1.15, 0.9); // Elongate to anatomical ellipsoid shape

    const brainMaterial = new THREE.MeshBasicMaterial({
      color: 0x6366f1,
      wireframe: true,
      transparent: true,
      opacity: 0.12,
    });
    const brainMesh = new THREE.Mesh(brainGeometry, brainMaterial);
    brainGroup.add(brainMesh);

    // Internal Glow Ring
    const ringGeo = new THREE.RingGeometry(65, 68, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x818cf8,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    brainGroup.add(ring);

    // 3. Connectome ROI Nodes
    const nodeSpheres = [];
    const nodeGeometry = new THREE.SphereGeometry(2.2, 16, 16);
    const hotspotGeometry = new THREE.SphereGeometry(3.5, 16, 16);

    const defaultNodeMaterial = new THREE.MeshBasicMaterial({ color: 0x818cf8 });
    const hotspotMaterial = new THREE.MeshBasicMaterial({ color: 0xef4444 });

    const nodePositionMap = new Map();

    graphData.nodes.forEach((node) => {
      const isHotspot = node.importance && node.importance > 1.5;
      const mat = isHotspot ? hotspotMaterial : defaultNodeMaterial;
      const geo = isHotspot ? hotspotGeometry : nodeGeometry;

      const sphere = new THREE.Mesh(geo, mat);
      // Map MNI coordinates directly to 3D space
      sphere.position.set(node.x, node.z, -node.y);
      sphere.userData = node;

      brainGroup.add(sphere);
      nodeSpheres.push(sphere);
      nodePositionMap.set(node.id, sphere.position);
    });

    // 4. Saliency Connectome Edges (Glow Curves)
    if (graphData.links) {
      graphData.links.forEach((link) => {
        const p1 = nodePositionMap.get(link.source);
        const p2 = nodePositionMap.get(link.target);
        if (!p1 || !p2) return;

        const isHighSaliency = link.saliency && link.saliency > 0.4;
        const color = isHighSaliency ? 0xef4444 : 0x6366f1;
        const opacity = isHighSaliency ? 0.85 : 0.25;

        // Quadratic Bezier Arc for neurological aesthetics
        const midPoint = new THREE.Vector3()
          .addVectors(p1, p2)
          .multiplyScalar(0.5)
          .multiplyScalar(1.1); // Curve slightly outward

        const curve = new THREE.QuadraticBezierCurve3(p1, midPoint, p2);
        const points = curve.getPoints(20);
        const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
        const lineMat = new THREE.LineBasicMaterial({
          color: color,
          transparent: true,
          opacity: opacity,
          linewidth: isHighSaliency ? 2 : 1,
        });

        const line = new THREE.Line(lineGeo, lineMat);
        brainGroup.add(line);
      });
    }

    // 5. Interactive Mouse Orbit & Raycasting
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    let rotationVelocity = { x: 0.002, y: 0.003 };

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onMouseDown = (e) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / height) * 2 + 1;

      // Raycasting for node hover detection
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(nodeSpheres);

      if (intersects.length > 0) {
        setHoveredNode(intersects[0].object.userData);
        container.style.cursor = 'pointer';
      } else {
        setHoveredNode(null);
        container.style.cursor = isDragging ? 'grabbing' : 'grab';
      }

      if (isDragging) {
        const deltaX = e.clientX - previousMousePosition.x;
        const deltaY = e.clientY - previousMousePosition.y;

        brainGroup.rotation.y += deltaX * 0.008;
        brainGroup.rotation.x += deltaY * 0.008;

        rotationVelocity = { x: deltaY * 0.0005, y: deltaX * 0.0005 };
        previousMousePosition = { x: e.clientX, y: e.clientY };
      }
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onWheel = (e) => {
      e.preventDefault();
      camera.position.z = Math.max(120, Math.min(350, camera.position.z + e.deltaY * 0.15));
    };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    container.addEventListener('wheel', onWheel, { passive: false });

    // 6. Animation Loop
    let animationFrameId;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Subtle ambient inertia rotation
      if (!isDragging) {
        brainGroup.rotation.y += rotationVelocity.y;
        brainGroup.rotation.x += rotationVelocity.x;
        rotationVelocity.x *= 0.98;
        rotationVelocity.y *= 0.98;
        if (Math.abs(rotationVelocity.y) < 0.0015) rotationVelocity.y = 0.002;
      }

      renderer.render(scene, camera);
    };

    animate();

    // Cleanup on unmount or mode switch
    return () => {
      cancelAnimationFrame(animationFrameId);
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      container.removeEventListener('wheel', onWheel);
      renderer.dispose();
    };
  }, [viewMode, graphData]);

  if (!graphData || !graphData.nodes) {
    return (
      <div className="glass-panel p-10 text-center text-slate-400">
        <p>No connectome data available. Submit patient profile to render 3D Glass Brain.</p>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 2D Orthographic Projections (Axial, Sagittal, Coronal)
  // -------------------------------------------------------------
  const projectCoords2D = (node) => {
    const scale = 2.4;
    const cx = 300;
    const cy = 230;

    let x = cx;
    let y = cy;

    if (viewMode === 'axial') {
      x = cx + node.x * scale;
      y = cy - node.y * scale * 0.9;
    } else if (viewMode === 'sagittal') {
      x = cx + node.y * scale * 0.9;
      y = cy - node.z * scale;
    } else {
      x = cx + node.x * scale;
      y = cy - node.z * scale;
    }

    return { x, y };
  };

  const nodeMap2D = new Map();
  if (viewMode !== '3d') {
    graphData.nodes.forEach((node) => {
      nodeMap2D.set(node.id, projectCoords2D(node));
    });
  }

  return (
    <div className="glass-panel p-6 flex flex-col gap-4">
      {/* Top Header & View Mode Switcher */}
      <div className="flex justify-between items-center flex-wrap gap-2.5">
        <div className="flex items-center gap-2.5">
          <Eye size={20} className="text-indigo-400" />
          <h3 className="m-0 text-[1.05rem] font-bold text-slate-100">
            3D Glass Brain Connectome Projection
          </h3>
        </div>

        {/* View Mode Buttons */}
        <div className="flex bg-slate-800/60 p-1 rounded-lg border border-white/5">
          <button
            type="button"
            onClick={() => setViewMode('3d')}
            className={`px-3 py-1 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-colors ${
              viewMode === '3d' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Box size={13} />
            3D WebGL Space
          </button>
          <button
            type="button"
            onClick={() => setViewMode('axial')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
              viewMode === 'axial' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Axial (Top)
          </button>
          <button
            type="button"
            onClick={() => setViewMode('sagittal')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
              viewMode === 'sagittal' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Sagittal (Side)
          </button>
          <button
            type="button"
            onClick={() => setViewMode('coronal')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
              viewMode === 'coronal' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Coronal (Front)
          </button>
        </div>
      </div>

      {/* Main Canvas Container */}
      <div className="relative w-full h-[460px] bg-[#090d16] rounded-xl border border-white/10 overflow-hidden flex items-center justify-center">
        {/* 3D WebGL Three.js Container */}
        {viewMode === '3d' ? (
          <div
            ref={mountRef}
            className="w-full h-full cursor-grab active:cursor-grabbing select-none"
          />
        ) : (
          /* 2D Multi-Planar SVG View */
          <svg viewBox="0 0 600 460" className="w-full h-full cursor-crosshair">
            <defs>
              <radialGradient id="brainGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.12" />
                <stop offset="100%" stopColor="#080c14" stopOpacity="0" />
              </radialGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Anatomical Outline Contour */}
            <ellipse
              cx="300"
              cy="230"
              rx="190"
              ry="180"
              fill="url(#brainGlow)"
              stroke="rgba(99, 102, 241, 0.25)"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
            <line
              x1="300"
              y1="50"
              x2="300"
              y2="410"
              stroke="rgba(255, 255, 255, 0.05)"
              strokeWidth="1"
              strokeDasharray="2 2"
            />

            {/* Directional Labels */}
            <text x="300" y="30" fill="#64748b" fontSize="11" fontWeight="700" textAnchor="middle">
              ANTERIOR (Front)
            </text>
            <text x="300" y="440" fill="#64748b" fontSize="11" fontWeight="700" textAnchor="middle">
              POSTERIOR (Back)
            </text>
            <text x="80" y="235" fill="#64748b" fontSize="11" fontWeight="700" textAnchor="middle">
              LEFT
            </text>
            <text x="520" y="235" fill="#64748b" fontSize="11" fontWeight="700" textAnchor="middle">
              RIGHT
            </text>

            {/* Links */}
            {graphData.links &&
              graphData.links.map((link, idx) => {
                const p1 = nodeMap2D.get(link.source);
                const p2 = nodeMap2D.get(link.target);
                if (!p1 || !p2) return null;

                const isHighSaliency = link.saliency && link.saliency > 0.4;
                const strokeColor = isHighSaliency ? '#ef4444' : 'rgba(99, 102, 241, 0.45)';
                const strokeWidth = isHighSaliency ? 2.5 : 1.2;

                return (
                  <line
                    key={`link-2d-${idx}`}
                    x1={p1.x}
                    y1={p1.y}
                    x2={p2.x}
                    y2={p2.y}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    filter={isHighSaliency ? 'url(#glow)' : undefined}
                    opacity={isHighSaliency ? 0.95 : 0.4}
                  />
                );
              })}

            {/* Nodes */}
            {graphData.nodes.map((node) => {
              const p = nodeMap2D.get(node.id);
              if (!p) return null;

              const isHovered = hoveredNode && hoveredNode.id === node.id;
              const radius = isHovered ? 6 : 3.5;
              const nodeColor = node.importance && node.importance > 1.5 ? '#f87171' : '#818cf8';

              return (
                <g
                  key={`node-2d-${node.id}`}
                  onMouseEnter={() => setHoveredNode(node)}
                  onMouseLeave={() => setHoveredNode(null)}
                >
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={radius}
                    fill={nodeColor}
                    stroke="#ffffff"
                    strokeWidth={isHovered ? 2 : 0.8}
                    style={{ transition: 'all 0.15s ease' }}
                  />
                </g>
              );
            })}
          </svg>
        )}

        {/* 3D Interaction Badge */}
        {viewMode === '3d' && (
          <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md px-2.5 py-1 rounded-md border border-white/10 text-[0.7rem] text-slate-400 pointer-events-none flex items-center gap-1.5">
            <Compass size={12} className="text-indigo-400 animate-spin" style={{ animationDuration: '6s' }} />
            <span>Click & Drag to Rotate | Scroll to Zoom</span>
          </div>
        )}

        {/* Hover Tooltip Overlay */}
        {hoveredNode && (
          <div className="absolute bottom-4 left-4 bg-slate-900/95 border border-indigo-500 rounded-lg px-3 py-2 text-xs text-slate-100 pointer-events-none shadow-xl backdrop-blur-md animate-fade-in">
            <div className="font-bold text-indigo-400">{hoveredNode.label || `ROI_${hoveredNode.id + 1}`}</div>
            <div className="text-slate-400 mt-0.5">
              ROI ID: #{hoveredNode.id} | MNI: ({Math.round(hoveredNode.x)}, {Math.round(hoveredNode.y)}, {Math.round(hoveredNode.z)})
            </div>
            {hoveredNode.importance && (
              <div className="text-rose-400 font-mono text-[0.7rem] mt-0.5">
                Biomarker Saliency: {hoveredNode.importance.toFixed(3)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Anatomical Color Legend */}
      <div className="flex justify-center flex-wrap gap-5 text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-1 bg-red-500 rounded-sm" />
          <span>High Saliency Pathway (Altered)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-indigo-500/60" />
          <span>Intact Connectome Synchrony</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-red-400" />
          <span>Biomarker Hotspot Node</span>
        </div>
      </div>
    </div>
  );
}
