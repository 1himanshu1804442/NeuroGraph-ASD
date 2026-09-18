import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import ImageUploader from '../components/ImageUploader';
import FacialGraphCanvas from '../components/FacialGraphCanvas';
import GradCamViewer from '../components/GradCamViewer';
import DiagnosticSummary from '../components/DiagnosticSummary';
import FacialBiomarkersCard from '../components/FacialBiomarkersCard';
import FacialSaliencyList from '../components/FacialSaliencyList';
import HistoricalRegistryView from '../components/HistoricalRegistryView';
import PatientHistoryModal from '../components/PatientHistoryModal';
import ModelBenchmarksView from '../components/ModelBenchmarksView';
import { useNeuroGraph } from '../hooks/useNeuroGraph';
import {
  Scan,
  Database,
  GitBranch,
  Flame,
  AlertCircle,
  Sparkles,
  Layers,
  Activity,
  BarChart3,
} from 'lucide-react';

/**
 * Dashboard Page.
 * 
 * Why: Serves as the primary clinician workspace for NeuroGraph-ASD.
 * Implements the Image-Based Autism Detection workflow combining:
 * 1. 68-point spatial facial landmark graph visualization with GCN saliency edges.
 * 2. Gradient-weighted Class Activation Mapping (Grad-CAM) thermal heatmap overlays.
 * 3. Mode switcher between the interactive Screening workspace and PostgreSQL Patient Registry.
 * 
 * Adheres strictly to the "No Confusion" rule (no placeholders, explain 'why')
 * and the "Seamless React Bounce" rule (dark solid background without white edges).
 */
export default function Dashboard() {
  const {
    isOnline,
    demographics,
    setDemographics,
    selectedPreset,
    handlePresetSelect,
    predictionResult,
    isLoading,
    errorMessage,
    patientHistory,
    isHistoryLoading,
    historyErrorMessage,
    refetchHistory,
    handleClearHistory,
    isHistoryClearing,
    handleSeedAbide,
    isSeedingAbide,
    isHistoryModalOpen,
    setIsHistoryModalOpen,
    handleSelectHistoricalPatient,

    // Image-based screening state & handlers
    uploadedImageFile,
    imagePreviewUrl,
    activeVisionTab,
    setActiveVisionTab,
    selectedPortraitPresetId,
    imagePredictionResult,
    handleImageUpload,
    handleSamplePortraitSelect,
    handleClearImage,
    handleRunImageInference,
    isImageInferring,
  } = useNeuroGraph();

  // Dashboard workspace mode: 'facial_screening' | 'historical_registry'
  const [dashboardMode, setDashboardMode] = useState('facial_screening');

  const activeResult = imagePredictionResult || predictionResult;
  const isASD =
    activeResult?.predicted_class === 1 ||
    activeResult?.predictedClass === 1 ||
    (activeResult?.predicted_label && activeResult.predicted_label.toLowerCase().includes('autism'));

  return (
    <div
      className="flex flex-col min-h-screen bg-[#080c14] text-slate-100"
      style={{
        margin: 0,
        padding: 0,
        width: '100%',
        minHeight: '100vh',
        backgroundColor: '#080c14',
      }}
    >
      {/* Clinician Header Bar */}
      <Header
        isOnline={isOnline}
        onOpenHistory={() => setIsHistoryModalOpen(true)}
        historyCount={patientHistory?.length || 0}
      />

      {/* Main Workspace Container */}
      <main className="max-w-[1440px] w-full mx-auto p-5 md:p-7 flex flex-col gap-6 flex-1">
        {/* Workspace Mode Navigation Tabs */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          paddingBottom: '16px',
        }}>
          {/* Mode Switcher Buttons */}
          <div style={{
            display: 'flex',
            backgroundColor: 'rgba(15, 23, 42, 0.8)',
            borderRadius: '12px',
            padding: '4px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            gap: '4px',
          }}>
            <button
              type="button"
              onClick={() => setDashboardMode('facial_screening')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 18px',
                borderRadius: '8px',
                fontSize: '0.84rem',
                fontWeight: 700,
                backgroundColor: dashboardMode === 'facial_screening' ? '#6366f1' : 'transparent',
                color: dashboardMode === 'facial_screening' ? '#ffffff' : '#94a3b8',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Scan size={16} />
              <span>Facial Image GCN Screening</span>
            </button>

            <button
              type="button"
              onClick={() => setDashboardMode('historical_registry')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 18px',
                borderRadius: '8px',
                fontSize: '0.84rem',
                fontWeight: 700,
                backgroundColor: dashboardMode === 'historical_registry' ? '#6366f1' : 'transparent',
                color: dashboardMode === 'historical_registry' ? '#ffffff' : '#94a3b8',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Database size={16} />
              <span>Historical Registry</span>
              {patientHistory?.length > 0 && (
                <span
                  style={{
                    backgroundColor: dashboardMode === 'historical_registry' ? 'rgba(255,255,255,0.25)' : 'rgba(99,102,241,0.3)',
                    color: '#ffffff',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: '9999px',
                  }}
                >
                  {patientHistory.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setDashboardMode('benchmarks')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 18px',
                borderRadius: '8px',
                fontSize: '0.84rem',
                fontWeight: 700,
                backgroundColor: dashboardMode === 'benchmarks' ? '#6366f1' : 'transparent',
                color: dashboardMode === 'benchmarks' ? '#ffffff' : '#94a3b8',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <BarChart3 size={16} />
              <span>Model Benchmarks (AJSE Literature)</span>
            </button>
          </div>

          {/* Clinical Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="badge badge-primary">
              <Sparkles size={12} />
              <span>Multimodal Vision XAI</span>
            </span>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
              68-Pt Topological Landmark Engine
            </span>
          </div>
        </div>

        {/* Error Notification Alert */}
        {errorMessage && (
          <div className="bg-red-500/15 border border-red-500/35 rounded-xl p-3.5 flex items-center gap-3 text-red-300 text-sm">
            <AlertCircle size={18} className="shrink-0 text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* View 1: Facial Image GCN Screening Workspace */}
        {dashboardMode === 'facial_screening' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Left Column: Image Dropzone/Picker + Diagnostic Decision + Dysmorphology Metrics */}
            <div className="flex flex-col gap-6">
              {/* Image Uploader & Sample Portrait Picker */}
              <ImageUploader
                uploadedImageFile={uploadedImageFile}
                imagePreviewUrl={imagePreviewUrl}
                onImageUpload={handleImageUpload}
                onSampleSelect={handleSamplePortraitSelect}
                selectedPresetId={selectedPortraitPresetId}
                onRunInference={handleRunImageInference}
                isLoading={isImageInferring || isLoading}
                onClearImage={handleClearImage}
              />

              {/* Diagnostic Output Summary */}
              {activeResult && (
                <>
                  <DiagnosticSummary result={activeResult} />
                  <FacialBiomarkersCard
                    biomarkers={activeResult.biomarkers}
                    isASD={isASD}
                  />
                </>
              )}
            </div>

            {/* Right Column: Visual Explainability Tabs (Landmark Graph vs Grad-CAM) + GCN Edges */}
            <div className="flex flex-col gap-6">
              {/* Visual Explainability Tab Switcher Card */}
              <div className="glass-panel" style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Explainability Vision Modes
                </span>

                <div style={{
                  display: 'flex',
                  backgroundColor: 'rgba(15, 23, 42, 0.8)',
                  borderRadius: '8px',
                  padding: '3px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}>
                  <button
                    type="button"
                    onClick={() => setActiveVisionTab('landmarks')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '0.76rem',
                      fontWeight: 600,
                      backgroundColor: activeVisionTab === 'landmarks' ? '#6366f1' : 'transparent',
                      color: activeVisionTab === 'landmarks' ? '#ffffff' : '#94a3b8',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <GitBranch size={13} />
                    <span>68-Pt Landmark Graph</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveVisionTab('gradcam')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '0.76rem',
                      fontWeight: 600,
                      backgroundColor: activeVisionTab === 'gradcam' ? '#f43f5e' : 'transparent',
                      color: activeVisionTab === 'gradcam' ? '#ffffff' : '#94a3b8',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Flame size={13} />
                    <span>Grad-CAM Heatmap</span>
                  </button>
                </div>
              </div>

              {/* Active Visualizer Component */}
              {activeVisionTab === 'landmarks' ? (
                <FacialGraphCanvas
                  imageUrl={imagePreviewUrl}
                  landmarks={activeResult?.landmarks_68}
                  saliencyEdges={activeResult?.gcn_saliency_edges}
                  patientLabel={activeResult?.predicted_label}
                />
              ) : (
                <GradCamViewer
                  imageUrl={imagePreviewUrl}
                  hotspots={activeResult?.gradcam_hotspots}
                  predictedLabel={activeResult?.predicted_label}
                  confidence={activeResult?.confidence_percentage}
                  clinicalNote={activeResult?.clinical_note}
                />
              )}

              {/* GCN Saliency Pathways List */}
              {activeResult?.gcn_saliency_edges && (
                <FacialSaliencyList edges={activeResult.gcn_saliency_edges} />
              )}
            </div>
          </div>
        ) : dashboardMode === 'benchmarks' ? (
          /* View 2: Empirical Literature & Model Benchmarks View */
          <ModelBenchmarksView onSwitchToScreening={() => setDashboardMode('facial_screening')} />
        ) : (
          /* View 3: Full Historical Patient Registry View */
          <HistoricalRegistryView
            records={patientHistory}
            isLoading={isHistoryLoading}
            error={historyErrorMessage}
            onRefresh={refetchHistory}
            onClearHistory={handleClearHistory}
            isClearing={isHistoryClearing}
            onSeedAbide={handleSeedAbide}
            isSeeding={isSeedingAbide}
            onSelectPatient={handleSelectHistoricalPatient}
            onSwitchToScreening={() => setDashboardMode('facial_screening')}
          />
        )}
      </main>

      {/* Interactive Patient History Modal (Header trigger) */}
      <PatientHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        records={patientHistory}
        isLoading={isHistoryLoading}
        error={historyErrorMessage}
        onRefresh={refetchHistory}
        onClearHistory={handleClearHistory}
        isClearing={isHistoryClearing}
        onSeedAbide={handleSeedAbide}
        isSeeding={isSeedingAbide}
        onSelectPatient={(patient) => {
          handleSelectHistoricalPatient(patient);
          setDashboardMode('facial_screening');
          setIsHistoryModalOpen(false);
        }}
      />
    </div>
  );
}
