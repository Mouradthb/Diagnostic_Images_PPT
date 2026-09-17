import { useState } from 'react';
import { X, Copy, Check, Download, FileCode, ExternalLink } from 'lucide-react';

interface CodeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CodeModal({ isOpen, onClose }: CodeModalProps) {
  const [activeTab, setActiveTab] = useState<'index.html' | 'style.css' | 'app.js'>('index.html');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const downloadFile = (filename: string, url: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <FileCode className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-800 text-base">
              Fichiers générés (index.html, style.css, app.js)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info banner */}
        <div className="px-5 py-3 bg-blue-50 border-b border-blue-100 flex items-center justify-between text-xs text-blue-800">
          <span>
            Ces 3 fichiers sont également accessibles et servis directement dans le dossier public.
          </span>
          <a
            href="/standalone/index.html"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:underline"
          >
            Ouvrir la version statique <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 px-4 bg-slate-50 gap-2">
          {(['index.html', 'style.css', 'app.js'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-xs font-mono font-semibold border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600 bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2 py-1.5">
            <button
              onClick={() => downloadFile(activeTab, `/standalone/${activeTab}`)}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 hover:bg-slate-100 rounded-md text-xs font-semibold text-slate-700 transition-colors shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              Télécharger {activeTab}
            </button>
          </div>
        </div>

        {/* Tab Content preview note */}
        <div className="p-5 flex-1 overflow-y-auto font-mono text-xs bg-slate-900 text-slate-200">
          <p className="text-slate-400 mb-2">
            // Fichier disponible à l'emplacement : /public/standalone/{activeTab}
          </p>
          <p className="text-slate-300 leading-relaxed">
            Vous pouvez télécharger directement le fichier via le bouton ci-dessus ou ouvrir la version
            statique autonome dans un nouvel onglet avec l'URL :
            <span className="text-emerald-400 block mt-1">/standalone/{activeTab}</span>
          </p>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Version conforme aux spécifications Gemini 3.6 Flash
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-semibold hover:bg-slate-900 transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
