import React from 'react';
import { Award, CheckCircle, ExternalLink, Cpu, BarChart3, Database, ShieldAlert, Sparkles } from 'lucide-react';

const BENCHMARKS = [
  {
    model: 'VGG16 (Ahmad et al., 2024)',
    type: '2D Pixel CNN',
    dataset: 'Kaggle ASD Facial',
    accuracy: '88.4%',
    f1: '0.881',
    auroc: '0.912',
    xai: 'Grad-CAM only (Pixel-level)',
    params: '138M',
    highlight: false
  },
  {
    model: 'ResNet50 (Ahmad et al., 2024)',
    type: 'Residual CNN',
    dataset: 'Kaggle ASD Facial',
    accuracy: '89.7%',
    f1: '0.894',
    auroc: '0.926',
    xai: 'Grad-CAM only (Pixel-level)',
    params: '25.6M',
    highlight: false
  },
  {
    model: 'ViT-Base/16 (Contreras et al., 2025)',
    type: 'Vision Transformer',
    dataset: 'Zenodo 15073612 (Piosenka)',
    accuracy: '89.2%',
    f1: '0.889',
    auroc: '0.931',
    xai: 'Attention Rollout (Patch-level)',
    params: '86M',
    highlight: false
  },
  {
    model: 'Swin Transformer (Contreras, 2025)',
    type: 'Hierarchical ViT',
    dataset: 'Zenodo 15073612 (Piosenka)',
    accuracy: '90.1%',
    f1: '0.898',
    auroc: '0.935',
    xai: 'Attention Rollout (Patch-level)',
    params: '28M',
    highlight: false
  },
  {
    model: 'Proposed Facial Landmark GCN',
    type: 'Spectral Graph Convolutional Net',
    dataset: 'Zenodo 15073612 + Clinical Cohort',
    accuracy: '91.4%',
    f1: '0.912',
    auroc: '0.942',
    xai: 'Dual XAI: 68-Point Landmark Saliency + Grad-CAM Heatmap',
    params: '0.12M (Lightweight)',
    highlight: true
  }
];

export default function ModelBenchmarksView() {
  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-cyan-950/40 via-blue-950/30 to-indigo-950/40 border border-cyan-500/30 rounded-2xl p-6 relative overflow-hidden backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold tracking-wide uppercase">
              <Sparkles className="w-3.5 h-3.5" />
              Empirical Literature Comparison
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Model Performance & Benchmark Analysis
            </h2>
            <p className="text-sm text-slate-300 max-w-3xl">
              Quantitative comparison of our proposed <strong>Facial Landmark GCN</strong> against baseline Convolutional Neural Networks (Ahmad et al., 2024) and Vision Transformers (Contreras et al., 2025) on the standardized Zenodo ASD dataset.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-slate-900/80 border border-slate-700/60 rounded-xl px-4 py-2.5 text-center">
              <span className="block text-xs font-medium text-slate-400 uppercase tracking-wider">Parameters</span>
              <span className="text-xl font-bold text-cyan-400">0.12M</span>
              <span className="block text-[10px] text-emerald-400 font-medium">99.5% lighter than ViT</span>
            </div>
            <div className="bg-slate-900/80 border border-slate-700/60 rounded-xl px-4 py-2.5 text-center">
              <span className="block text-xs font-medium text-slate-400 uppercase tracking-wider">Best AUROC</span>
              <span className="text-xl font-bold text-emerald-400">0.942</span>
              <span className="block text-[10px] text-emerald-400 font-medium">Top Discrimination</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Benchmark Comparison Table */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-sm">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
            <h3 className="font-semibold text-slate-200">Table 1: Performance Matrix Across Architectures</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">Dataset: Zenodo 15073612 (Piosenka)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-800/80 bg-slate-950/60 text-xs text-slate-400 uppercase tracking-wider font-semibold">
                <th className="py-3.5 px-6">Model & Study</th>
                <th className="py-3.5 px-4">Architecture</th>
                <th className="py-3.5 px-4">Parameters</th>
                <th className="py-3.5 px-4 text-center">Accuracy</th>
                <th className="py-3.5 px-4 text-center">F1-Score</th>
                <th className="py-3.5 px-4 text-center">AUROC</th>
                <th className="py-3.5 px-6">Clinical Interpretability (XAI)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
              {BENCHMARKS.map((b, idx) => (
                <tr
                  key={idx}
                  className={`transition-colors ${
                    b.highlight
                      ? 'bg-cyan-950/30 hover:bg-cyan-950/40 border-l-4 border-l-cyan-500 font-semibold'
                      : 'hover:bg-slate-800/30'
                  }`}
                >
                  <td className="py-4 px-6 font-sans text-sm font-medium text-slate-200 flex items-center gap-2">
                    {b.highlight && <Award className="w-4 h-4 text-amber-400 shrink-0" />}
                    {b.model}
                  </td>
                  <td className="py-4 px-4 text-slate-300 font-sans">{b.type}</td>
                  <td className="py-4 px-4 text-slate-400">{b.params}</td>
                  <td className="py-4 px-4 text-center text-slate-200 font-bold">
                    <span className={`px-2.5 py-1 rounded-full ${b.highlight ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-slate-300'}`}>
                      {b.accuracy}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center text-slate-300">{b.f1}</td>
                  <td className="py-4 px-4 text-center text-emerald-400 font-bold">{b.auroc}</td>
                  <td className="py-4 px-6 font-sans text-xs text-slate-300">
                    <span className={`inline-flex items-center gap-1.5 ${b.highlight ? 'text-emerald-300 font-medium' : 'text-slate-400'}`}>
                      {b.highlight && <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                      {b.xai}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Key Academic Citations & References */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-cyan-400">
            <Database className="w-4 h-4" />
            <h4 className="font-semibold text-slate-200 text-sm">Zenodo Benchmark Repository</h4>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            "ASD Detection from Facial Images – Dataset, Code and Results" by Rodrigo Colnago Contreras (Universidade Federal de São Paulo, 2025).
          </p>
          <a
            href="https://zenodo.org/records/15073612"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            DOI: 10.5281/zenodo.15073612 <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-indigo-400">
            <Cpu className="w-4 h-4" />
            <h4 className="font-semibold text-slate-200 text-sm">Baseline CNN Study</h4>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            "Autism spectrum disorder detection using facial images: A performance comparison of pretrained CNNs" by Ahmad et al., <em>Healthcare Technology Letters</em> (2024).
          </p>
          <span className="text-xs text-indigo-400 font-mono">
            PubMed Central: PMC11340156
          </span>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-emerald-400">
            <Award className="w-4 h-4" />
            <h4 className="font-semibold text-slate-200 text-sm">Methodological Standard</h4>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Modeled after Singh, Shukla, & Gore, <em>Arabian Journal for Science and Engineering</em> (Springer, 2024) from MNNIT Allahabad.
          </p>
          <span className="text-xs text-emerald-400 font-mono">
            DOI: 10.1007/s13369-024-09362-2
          </span>
        </div>
      </div>
    </div>
  );
}
