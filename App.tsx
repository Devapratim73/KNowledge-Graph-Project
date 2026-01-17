
import React, { useState, useEffect, useRef } from 'react';
import { Notebook, GraphData, Node, EntityType } from './types';
import { analyzeNotebookContent, generateGraphSummary } from './services/geminiService';
import { extractTextFromFile } from './services/fileService';
import GraphCanvas from './components/GraphCanvas';
import { 
  FolderIcon, 
  ArrowPathIcon, 
  InformationCircleIcon, 
  ArrowDownTrayIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  LightBulbIcon,
  CloudIcon,
  CheckCircleIcon,
  PlusIcon,
  DocumentTextIcon,
  TrashIcon,
  DocumentIcon,
  SparklesIcon,
  BookOpenIcon
} from '@heroicons/react/24/outline';

const App: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [selectedNotebook, setSelectedNotebook] = useState<Notebook | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [graphSummary, setGraphSummary] = useState<string | null>(null);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  
  // Staged Files for Upload
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('kg_ai_notebooks');
    if (saved) {
      setNotebooks(JSON.parse(saved));
    } else {
      const starter: Notebook = {
        id: 'starter',
        name: 'Introduction to KnowledgeGraphs',
        lastModified: new Date().toLocaleDateString(),
        contentSnippet: 'Knowledge graphs represent a network of real-world entities—i.e. objects, events, situations, or abstract concepts—and illustrate the relationship between them.'
      };
      setNotebooks([starter]);
      localStorage.setItem('kg_ai_notebooks', JSON.stringify([starter]));
    }
  }, []);

  const saveNotebooks = (updated: Notebook[]) => {
    setNotebooks(updated);
    localStorage.setItem('kg_ai_notebooks', JSON.stringify(updated));
  };

  const handleConnect = () => {
    setIsConnecting(true);
    setTimeout(() => {
      setIsConnecting(false);
      setIsConnected(true);
    }, 1200);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setStagedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeStagedFile = (index: number) => {
    setStagedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleAnalyzeStagedFiles = async () => {
    if (stagedFiles.length === 0) return;
    setIsAnalyzing(true);
    setGraphData(null);
    setSelectedNode(null);
    setGraphSummary(null);

    try {
      const texts = await Promise.all(stagedFiles.map(file => extractTextFromFile(file)));
      const combinedContent = texts.join('\n\n--- NEXT FILE ---\n\n');
      
      const data = await analyzeNotebookContent(combinedContent);
      
      const compositeNb: Notebook = {
        id: Date.now().toString(),
        name: stagedFiles.length === 1 ? stagedFiles[0].name : `Combined Analysis (${stagedFiles.length} files)`,
        lastModified: new Date().toLocaleDateString(),
        contentSnippet: combinedContent.slice(0, 500)
      };
      
      setSelectedNotebook(compositeNb);
      setGraphData(data);
      setStagedFiles([]); 
    } catch (error) {
      console.error(error);
      alert("Analysis failed. Ensure valid Gemini API access.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleImportNotebook = async (notebook: Notebook) => {
    setSelectedNotebook(notebook);
    setIsAnalyzing(true);
    setGraphData(null);
    setSelectedNode(null);
    setGraphSummary(null);

    try {
      const data = await analyzeNotebookContent(notebook.contentSnippet);
      setGraphData(data);
    } catch (error) {
      alert("Analysis failed.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (!graphData) return;
    setIsSummarizing(true);
    try {
      const summary = await generateGraphSummary(graphData);
      setGraphSummary(summary);
      setIsSummaryModalOpen(true);
    } catch (error) {
      alert("Failed to generate summary.");
    } finally {
      setIsSummarizing(false);
    }
  };

  const exportGraph = () => {
    const svg = document.querySelector('svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], {type: "image/svg+xml;charset=utf-8"});
    const svgUrl = URL.createObjectURL(svgBlob);
    const downloadLink = document.createElement("a");
    downloadLink.href = svgUrl;
    downloadLink.download = `kg-${selectedNotebook?.name || 'graph'}.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-100 overflow-hidden font-sans">
      
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-80 bg-slate-900 border-r border-slate-800 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 h-full flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
                KnowledgeGraph AI
              </h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight mt-1">
                By Dr Devapratim Mohanty
              </p>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-1 hover:bg-slate-800 rounded">
              <XMarkIcon className="h-5 w-5 text-slate-400" />
            </button>
          </div>

          {/* Sync Section */}
          <div className="mb-6">
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <CloudIcon className="h-3 w-3" />
              NotebookLM Account
            </label>
            {!isConnected ? (
              <button onClick={handleConnect} disabled={isConnecting} className="w-full flex items-center justify-center gap-3 bg-white text-slate-900 hover:bg-slate-100 rounded-xl px-4 py-3 text-xs font-black transition-all shadow-xl active:scale-95">
                {isConnecting ? <ArrowPathIcon className="h-4 w-4 animate-spin text-blue-600" /> : <img src="https://www.google.com/favicon.ico" className="h-4 w-4" alt="G" />}
                {isConnecting ? 'Connecting...' : 'Sign in with Google'}
              </button>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[9px] text-emerald-400 font-black tracking-widest flex items-center gap-1">
                    <CheckCircleIcon className="h-3 w-3" /> SYNC ACTIVE
                  </span>
                  <button onClick={() => setIsConnected(false)} className="text-[9px] text-slate-600 hover:text-slate-400 font-black">LOGOUT</button>
                </div>
                <div className="relative">
                  <select 
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer"
                    onChange={(e) => {
                      const nb = notebooks.find(n => n.id === e.target.value);
                      if (nb) handleImportNotebook(nb);
                    }}
                    value={selectedNotebook?.id || ''}
                  >
                    <option value="" disabled>Cloud Notebooks ({notebooks.length})</option>
                    {notebooks.map(nb => <option key={nb.id} value={nb.id}>{nb.name}</option>)}
                  </select>
                  <FolderIcon className="absolute right-3 top-3 h-4 w-4 text-slate-500 pointer-events-none" />
                </div>
              </div>
            )}
          </div>

          {/* Upload Section */}
          <div className="mb-6">
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <DocumentIcon className="h-3 w-3" />
              Local Knowledge
            </label>
            <div className="space-y-3">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold transition-all text-slate-300"
              >
                <PlusIcon className="h-4 w-4" />
                Upload Files
              </button>
              <input 
                ref={fileInputRef}
                type="file" 
                className="hidden" 
                multiple
                onChange={handleFileSelect}
                accept=".txt,.md,.pdf,.docx,.doc,.json,.csv,.html,.xml"
              />

              {stagedFiles.length > 0 && (
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1 animate-in slide-in-from-top-2">
                  {stagedFiles.map((file, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-slate-800/40 border border-slate-700/50 rounded-lg text-[10px]">
                      <div className="truncate pr-2">
                        <p className="text-slate-200 font-bold truncate">{file.name}</p>
                        <p className="text-slate-500">{formatFileSize(file.size)}</p>
                      </div>
                      <button onClick={() => removeStagedFile(i)} className="p-1 hover:text-red-400 transition-colors">
                        <TrashIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  <button 
                    onClick={handleAnalyzeStagedFiles}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest py-2 rounded-xl text-[10px] transition-all shadow-xl shadow-emerald-600/20"
                  >
                    Analyze & Generate Graph
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-1">
            {selectedNode ? (
              <div className="bg-slate-800/40 rounded-2xl p-5 border border-slate-700/50 animate-in fade-in zoom-in-95 duration-300">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300">
                      {selectedNode.type}
                    </span>
                    <h3 className="text-lg font-bold mt-2 text-white leading-tight">{selectedNode.label}</h3>
                  </div>
                  <button onClick={() => setSelectedNode(null)} className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors">
                    <XMarkIcon className="h-4 w-4 text-slate-400" />
                  </button>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed italic mb-6">"{selectedNode.description}"</p>
                
                <div className="pt-4 border-t border-slate-700/50">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Linked Entities</h4>
                  <div className="space-y-2">
                    {graphData?.links.filter(l => 
                      (typeof l.source === 'string' ? l.source : l.source.id) === selectedNode.id || 
                      (typeof l.target === 'string' ? l.target : l.target.id) === selectedNode.id
                    ).map((l, i) => {
                      const otherNodeId = (typeof l.source === 'string' ? l.source : l.source.id) === selectedNode.id 
                        ? (typeof l.target === 'string' ? l.target : l.target.id) 
                        : (typeof l.source === 'string' ? l.source : l.source.id);
                      const otherNode = graphData.nodes.find(n => n.id === otherNodeId);
                      return (
                        <div key={i} className="flex items-center justify-between gap-2 p-2 bg-slate-900/50 rounded-lg text-[10px]">
                          <span className="text-blue-400 font-bold uppercase">{l.label}</span>
                          <span className="text-slate-300 truncate font-medium">{otherNode?.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : graphData ? (
               <div className="bg-indigo-900/20 border border-indigo-500/20 rounded-2xl p-6 text-center animate-in fade-in slide-in-from-bottom-2">
                <SparklesIcon className="h-10 w-10 text-indigo-400 mx-auto mb-4" />
                <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-2">Synthesis Ready</p>
                <p className="text-[11px] text-slate-400 leading-relaxed mb-6 italic">Gemini has mapped the graph. Ready for a detailed point-wise write-up?</p>
                <button 
                  onClick={handleGenerateSummary}
                  disabled={isSummarizing}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest py-3 rounded-xl text-[10px] transition-all shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2"
                >
                  {isSummarizing ? <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" /> : <SparklesIcon className="h-3.5 w-3.5" />}
                  {isSummarizing ? 'Synthesizing...' : 'Generate Report'}
                </button>
              </div>
            ) : (
              <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-6 text-center">
                <InformationCircleIcon className="h-10 w-10 text-slate-700 mx-auto mb-4 opacity-30" />
                <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2">Insight Panel</p>
                <p className="text-[11px] text-slate-500 leading-relaxed italic">Upload multiple files or select a notebook to begin mapping your domain knowledge.</p>
              </div>
            )}
          </div>

          <div className="mt-auto pt-6 flex flex-col gap-4">
            <button 
              onClick={exportGraph}
              disabled={!graphData}
              className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl px-4 py-3 text-xs font-black uppercase tracking-widest transition-all border border-slate-700"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
              Download Graph
            </button>
            <div className="text-center opacity-60">
              <p className="text-[9px] font-bold text-slate-400">Created by Dr Devapratim Mohanty</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 relative flex flex-col">
        <header className="absolute top-0 inset-x-0 z-40 bg-slate-950/60 backdrop-blur-xl border-b border-white/5 h-16 flex items-center justify-between px-8">
          <div className="flex items-center gap-4">
            {!isSidebarOpen && <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-white/5 rounded-xl transition-all"><MagnifyingGlassIcon className="h-5 w-5" /></button>}
            <div className="flex flex-col">
              <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Active Analysis</span>
              <h2 className="text-xs font-bold text-white truncate max-w-[200px]">{selectedNotebook?.name || 'Synthesize Your World'}</h2>
            </div>
          </div>
          <div className="flex items-center gap-4">
             {graphSummary && (
                <button 
                  onClick={() => setIsSummaryModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 rounded-full border border-indigo-500/30 text-[10px] font-black uppercase transition-all"
                >
                  <BookOpenIcon className="h-3.5 w-3.5" />
                  View Report
                </button>
             )}
             <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/50 rounded-full border border-white/5">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Gemini 3 Pro Engine</span>
             </div>
             <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xs font-black shadow-lg shadow-indigo-500/20">DM</div>
          </div>
        </header>

        <main className="flex-1 relative">
          {isAnalyzing && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md">
              <div className="text-center space-y-6 max-w-sm">
                <div className="relative inline-block">
                  <div className="h-24 w-24 border-4 border-indigo-500/10 border-t-indigo-500 rounded-3xl animate-spin"></div>
                  <LightBulbIcon className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-8 text-indigo-400 animate-pulse" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white uppercase tracking-tight">Mapping Intelligence</h2>
                  <p className="text-[11px] text-slate-500 font-medium px-10 mt-2">Dr Devapratim's Synthesis Logic is scanning text across {stagedFiles.length || 1} sources to build your network.</p>
                </div>
              </div>
            </div>
          )}

          {graphData ? (
            <GraphCanvas data={graphData} onNodeClick={setSelectedNode} selectedNodeId={selectedNode?.id} />
          ) : !isAnalyzing && (
            <div className="h-full flex flex-col items-center justify-center bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900 to-slate-950 px-10 text-center">
              <div className="w-20 h-20 rounded-[2rem] bg-indigo-500/10 flex items-center justify-center mb-8 border border-indigo-500/20 group hover:scale-105 transition-all">
                <DocumentTextIcon className="h-10 w-10 text-indigo-500" />
              </div>
              <h2 className="text-2xl font-black text-white mb-3 uppercase tracking-tighter">Knowledge Synthesis Platform</h2>
              <p className="max-w-md text-slate-500 mb-10 text-sm italic font-medium">Upload PDF, Word, Markdown or Text files to generate a multi-dimensional semantic map of your research data.</p>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="bg-indigo-600 hover:bg-indigo-500 px-8 py-3.5 rounded-2xl text-xs font-black text-white transition-all shadow-2xl shadow-indigo-600/30 active:scale-95 uppercase tracking-widest"
              >
                Start New Project
              </button>
            </div>
          )}

          {/* Summary Modal Overlay */}
          {isSummaryModalOpen && graphSummary && (
            <div className="absolute inset-0 z-[60] flex items-center justify-center p-4 sm:p-8 md:p-12 animate-in fade-in duration-300">
               <div 
                 className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm cursor-pointer" 
                 onClick={() => setIsSummaryModalOpen(false)}
               />
               <div className="relative w-full max-w-4xl max-h-[85vh] bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
                  <div className="p-8 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-indigo-500/20 rounded-2xl text-indigo-400">
                        <SparklesIcon className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-white uppercase tracking-tight">Synthesis Report</h3>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Point-wise Write-up • Gemini AI Insight</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setIsSummaryModalOpen(false)} 
                      className="p-3 hover:bg-white/5 rounded-2xl transition-all"
                    >
                      <XMarkIcon className="h-6 w-6 text-slate-400" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-8 sm:p-12 prose prose-invert prose-sm max-w-none">
                     <div className="space-y-6 text-slate-300 leading-relaxed">
                        {graphSummary.split('\n').map((line, i) => {
                          if (line.startsWith('**') || line.includes(':')) {
                            const [title, ...rest] = line.split(':');
                            return (
                              <div key={i} className="mb-4">
                                <span className="text-indigo-400 font-black uppercase text-xs tracking-widest block mb-2">{title.replace(/\*/g, '')}</span>
                                <p className="text-sm text-slate-400">{rest.join(':')}</p>
                              </div>
                            );
                          }
                          if (line.trim().startsWith('-') || line.trim().startsWith('*')) {
                            return <li key={i} className="ml-4 list-disc text-sm text-slate-300 mb-2">{line.trim().substring(1).trim()}</li>;
                          }
                          return <p key={i} className="text-sm">{line}</p>;
                        })}
                     </div>
                  </div>
                  <div className="p-8 bg-slate-950/30 border-t border-white/5 flex items-center justify-between">
                    <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest italic">Analysis completed by KnowledgeGraph AI Synthesis Engine</p>
                    <button 
                      onClick={() => setIsSummaryModalOpen(false)}
                      className="bg-indigo-600 hover:bg-indigo-500 px-6 py-2.5 rounded-xl text-[10px] font-black text-white uppercase tracking-widest transition-all"
                    >
                      Return to Map
                    </button>
                  </div>
               </div>
            </div>
          )}
        </main>
        
        <footer className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-3">
           <div className="bg-slate-900/60 backdrop-blur-xl px-6 py-2 rounded-full border border-white/5 text-[9px] text-slate-500 font-black tracking-[0.3em] flex items-center gap-4">
              <span>ANALYZE</span>
              <div className="h-1 w-1 rounded-full bg-indigo-500"></div>
              <span>CLUSTER</span>
              <div className="h-1 w-1 rounded-full bg-indigo-500"></div>
              <span>MAP</span>
           </div>
           <p className="text-[9px] text-slate-700 font-black uppercase tracking-widest">Created by Dr Devapratim Mohanty • Professional V2.3</p>
        </footer>
      </div>
    </div>
  );
};

export default App;
