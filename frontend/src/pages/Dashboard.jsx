import React, { useEffect } from 'react';
import Header from '../components/Header';
import DemographicsForm from '../components/DemographicsForm';
import DiagnosticSummary from '../components/DiagnosticSummary';
import NetworkAttribution from '../components/NetworkAttribution';
import SaliencyPathways from '../components/SaliencyPathways';
import ConnectomeCanvas from '../components/ConnectomeCanvas';
import PatientHistoryModal from '../components/PatientHistoryModal';
import { useNeuroGraph } from '../hooks/useNeuroGraph';
import { AlertCircle } from 'lucide-react';

export default function Dashboard() {
  const {
    isOnline,
    demographics,
    setDemographics,
    selectedPreset,
    handlePresetSelect,
    handleFormSubmit,
    predictionResult,
    isLoading,
    errorMessage,
    patientHistory,
    isHistoryLoading,
    historyErrorMessage,
    refetchHistory,
    isHistoryModalOpen,
    setIsHistoryModalOpen,
    handleSelectHistoricalPatient,
  } = useNeuroGraph();

  // Trigger initial inference on mount for instantaneous clinician preview
  useEffect(() => {
    handlePresetSelect('asd_sample');
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Clinician Header Bar with PostgreSQL History trigger */}
      <Header
        isOnline={isOnline}
        onOpenHistory={() => setIsHistoryModalOpen(true)}
        historyCount={patientHistory?.length || 0}
      />

      {/* Main Clinical Dashboard Workspace */}
      <main className="max-w-[1440px] w-full mx-auto p-6 md:p-7 flex flex-col gap-6 flex-1">
        {/* Error Alert Notification */}
        {errorMessage && (
          <div className="bg-red-500/15 border border-red-500/35 rounded-xl p-3.5 flex items-center gap-3 text-red-300 text-sm">
            <AlertCircle size={18} className="shrink-0 text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Left Column: Phenotypic Input Form + Diagnostic Decision Summary + Canonical Sub-Networks */}
          <div className="flex flex-col gap-6">
            <DemographicsForm
              demographics={demographics}
              onChange={setDemographics}
              onLoadPreset={handlePresetSelect}
              onSubmit={handleFormSubmit}
              isLoading={isLoading}
            />

            {predictionResult && (
              <>
                <DiagnosticSummary result={predictionResult} />
                <NetworkAttribution networkAttribution={predictionResult.network_attribution} />
              </>
            )}
          </div>

          {/* Right Column: 3D WebGL / 2D Multi-Planar Connectome Visualizer + Explainable Biomarkers */}
          <div className="flex flex-col gap-6">
            {predictionResult && (
              <>
                <ConnectomeCanvas graphData={predictionResult.connectome_graph} />
                <SaliencyPathways
                  pathways={predictionResult.top_pathways}
                  biomarkerRois={predictionResult.top_biomarker_rois}
                />
              </>
            )}
          </div>
        </div>
      </main>

      {/* Interactive PostgreSQL Patient History Modal */}
      <PatientHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        records={patientHistory}
        isLoading={isHistoryLoading}
        error={historyErrorMessage}
        onRefresh={refetchHistory}
        onSelectPatient={handleSelectHistoricalPatient}
      />
    </div>
  );
}

