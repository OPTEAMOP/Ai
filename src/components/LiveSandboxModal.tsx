import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Play,
  Download,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  RefreshCw,
  Code2,
  FileCode,
  Sparkles,
  Layers,
  Crown,
  Eye,
  Terminal,
} from 'lucide-react';
import JSZip from 'jszip';
import confetti from 'canvas-confetti';
import { UserSubscription } from '../types';

interface LiveSandboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialHtml?: string;
  initialCss?: string;
  initialJs?: string;
  subscription: UserSubscription;
  onOpenUpgrade?: () => void;
  onOpenSubscription?: () => void;
}

const DEFAULT_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Omnisym Sandbox</title>
</head>
<body>
  <div class="card">
    <div class="badge">Omnisym Creator Studio</div>
    <h1>Real-time App Sandbox</h1>
    <p>Zero-code live preview runner with instant ZIP project exports.</p>
    <button id="action-btn">Click for Interactive Burst ⚡</button>
    <div id="counter">Clicks: 0</div>
  </div>
</body>
</html>`;

const DEFAULT_CSS = `* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

body {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at top, #1e1b4b, #0f172a);
  color: #ffffff;
  padding: 20px;
}

.card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(16px);
  border-radius: 24px;
  padding: 32px;
  max-width: 440px;
  width: 100%;
  text-align: center;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4);
}

.badge {
  display: inline-block;
  padding: 4px 12px;
  background: rgba(168, 85, 247, 0.2);
  color: #c084fc;
  border: 1px solid rgba(168, 85, 247, 0.4);
  border-radius: 100px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  margin-bottom: 16px;
}

h1 {
  font-size: 24px;
  font-weight: 800;
  margin-bottom: 12px;
  background: linear-gradient(135deg, #ffffff, #a5b4fc);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

p {
  font-size: 14px;
  color: #94a3b8;
  margin-bottom: 24px;
  line-height: 1.5;
}

button {
  background: linear-gradient(135deg, #6366f1, #a855f7);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 14px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  box-shadow: 0 8px 20px rgba(99, 102, 241, 0.3);
  transition: all 0.2s ease;
}

button:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 24px rgba(99, 102, 241, 0.4);
}

#counter {
  margin-top: 16px;
  font-size: 13px;
  font-weight: 600;
  color: #38bdf8;
}`;

const DEFAULT_JS = `let count = 0;
const btn = document.getElementById('action-btn');
const counter = document.getElementById('counter');

btn.addEventListener('click', () => {
  count++;
  counter.textContent = 'Clicks: ' + count;
  btn.style.transform = 'scale(0.95)';
  setTimeout(() => {
    btn.style.transform = 'none';
  }, 100);
});`;

export const LiveSandboxModal: React.FC<LiveSandboxModalProps> = ({
  isOpen,
  onClose,
  initialHtml,
  initialCss,
  initialJs,
  subscription,
  onOpenUpgrade,
  onOpenSubscription,
}) => {
  const handleUpgradeTrigger = () => {
    if (onOpenSubscription) {
      onOpenSubscription();
    } else if (onOpenUpgrade) {
      onOpenUpgrade();
    }
  };
  const [htmlCode, setHtmlCode] = useState(initialHtml || DEFAULT_HTML);
  const [cssCode, setCssCode] = useState(initialCss || DEFAULT_CSS);
  const [jsCode, setJsCode] = useState(initialJs || DEFAULT_JS);
  const [activeTab, setActiveTab] = useState<'html' | 'css' | 'js'>('html');
  const [isZipping, setIsZipping] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [fullPreview, setFullPreview] = useState(false);
  const [sandboxDoc, setSandboxDoc] = useState('');

  const iframeRef = useRef<HTMLIFrameElement>(null);

  const isCreator = subscription.isPro && (subscription.tier === 'creator' || subscription.tier === 'student');

  useEffect(() => {
    if (initialHtml) setHtmlCode(initialHtml);
    if (initialCss) setCssCode(initialCss);
    if (initialJs) setJsCode(initialJs);
  }, [initialHtml, initialCss, initialJs]);

  const compileSandbox = () => {
    const combined = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>${cssCode}</style>
        </head>
        <body>
          ${htmlCode.replace(/<!DOCTYPE html>|<\/?html.*?>|<\/?head.*?>|<\/?body.*?>/gi, '')}
          <script>
            try {
              ${jsCode}
            } catch (err) {
              console.error("Sandbox Error:", err);
            }
          <\/script>
        </body>
      </html>
    `;
    setSandboxDoc(combined);
  };

  useEffect(() => {
    if (isOpen) {
      compileSandbox();
    }
  }, [isOpen, htmlCode, cssCode, jsCode]);

  if (!isOpen) return null;

  const handleDownloadZip = async () => {
    if (!subscription.isPro || subscription.tier !== 'creator') {
      handleUpgradeTrigger();
      return;
    }
    try {
      setIsZipping(true);
      const zip = new JSZip();

      // Full clean project structure
      zip.file('index.html', `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Omnisym Project</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  ${htmlCode.replace(/<!DOCTYPE html>|<\/?html.*?>|<\/?head.*?>|<\/?body.*?>/gi, '')}
  <script src="script.js"></script>
</body>
</html>`);

      zip.file('style.css', cssCode);
      zip.file('script.js', jsCode);
      zip.file('README.md', `# Omnisym AI Project Export
Generated with Omnisym Pro Creator Suite.

## How to run locally:
1. Extract this ZIP folder.
2. Open \`index.html\` directly in any modern browser, or run \`npx serve .\`
3. Enjoy your zero-code interactive applet!`);

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `omnisym_project_${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      confetti({ particleCount: 30, spread: 45, origin: { y: 0.6 } });
    } catch (err) {
      console.error('ZIP generation failed:', err);
    } finally {
      setIsZipping(false);
    }
  };

  const handleCopyCurrentCode = () => {
    const code = activeTab === 'html' ? htmlCode : activeTab === 'css' ? cssCode : jsCode;
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <AnimatePresence>
      <div
        id="omnisym-live-sandbox-backdrop"
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-6xl h-[88vh] rounded-3xl bg-white border border-gray-200 text-[#111827] shadow-2xl overflow-hidden flex flex-col font-sans"
        >
          {/* Header */}
          <header className="px-4 py-4 md:px-6 md:py-4 border-b border-gray-200 bg-white flex flex-col md:flex-row md:items-center justify-between shrink-0 gap-4 md:gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <FileCode className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-bold text-gray-900 leading-tight">
                    Live Sandbox & ZIP Exporter
                  </h3>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">
                    CREATOR SUITE
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5 line-height-1.5">
                  Real-time HTML/CSS/JS interpreter with instant 1-Click ZIP bundle export.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between md:justify-end gap-2">
              {/* 1-Click ZIP Download */}
              <button
                type="button"
                id="download-project-zip-btn"
                onClick={handleDownloadZip}
                disabled={isZipping}
                className="w-full md:w-auto px-4 py-2 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-bold shadow-md shadow-indigo-100 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>{isZipping ? 'Bundling ZIP...' : '1-Click ZIP Export'}</span>
              </button>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setFullPreview(!fullPreview)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                  title={fullPreview ? 'Split view' : 'Maximize preview'}
                >
                  {fullPreview ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </header>

          {/* Sandbox Main Area (Split View) */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 overflow-hidden bg-gray-50">
            {/* Left: Code Editor Tabs */}
            {!fullPreview && (
              <div className="flex flex-col border-r border-gray-200 bg-white overflow-hidden p-3 md:p-4">
                {/* Editor Tab Bar */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center bg-gray-100 p-1 rounded-xl gap-1">
                    <button
                      type="button"
                      onClick={() => setActiveTab('html')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all ${
                        activeTab === 'html'
                          ? 'bg-white text-indigo-600 shadow-sm border-b-2 border-indigo-600'
                          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                      }`}
                    >
                      index.html
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('css')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all ${
                        activeTab === 'css'
                          ? 'bg-white text-indigo-600 shadow-sm border-b-2 border-indigo-600'
                          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                      }`}
                    >
                      style.css
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('js')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all ${
                        activeTab === 'js'
                          ? 'bg-white text-indigo-600 shadow-sm border-b-2 border-indigo-600'
                          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                      }`}
                    >
                      script.js
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyCurrentCode}
                      className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-700 px-2 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                    >
                      {copiedCode ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span className="font-semibold">{copiedCode ? 'Copied' : 'Copy'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={compileSandbox}
                      className="flex items-center gap-1 text-[11px] text-white px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 font-bold transition-all shadow-sm"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>Run</span>
                    </button>
                  </div>
                </div>

                {/* Editor Textarea with dark background and rounded borders */}
                <div className="flex-1 relative bg-[#0b0f19] rounded-xl border border-gray-200 overflow-hidden shadow-inner">
                  {activeTab === 'html' && (
                    <textarea
                      value={htmlCode}
                      onChange={(e) => setHtmlCode(e.target.value)}
                      spellCheck={false}
                      className="w-full h-full p-4 bg-transparent text-indigo-50 font-mono text-xs leading-relaxed outline-hidden resize-none selection:bg-indigo-500/30"
                      placeholder="<!-- HTML markup here -->"
                    />
                  )}
                  {activeTab === 'css' && (
                    <textarea
                      value={cssCode}
                      onChange={(e) => setCssCode(e.target.value)}
                      spellCheck={false}
                      className="w-full h-full p-4 bg-transparent text-indigo-50 font-mono text-xs leading-relaxed outline-hidden resize-none selection:bg-indigo-500/30"
                      placeholder="/* CSS stylesheets here */"
                    />
                  )}
                  {activeTab === 'js' && (
                    <textarea
                      value={jsCode}
                      onChange={(e) => setJsCode(e.target.value)}
                      spellCheck={false}
                      className="w-full h-full p-4 bg-transparent text-indigo-50 font-mono text-xs leading-relaxed outline-hidden resize-none selection:bg-indigo-500/30"
                      placeholder="// JavaScript code here"
                    />
                  )}
                </div>
              </div>
            )}

            {/* Right: Live Interactive Output Frame */}
            <div className={`flex flex-col overflow-hidden p-3 md:p-4 bg-gray-50 ${fullPreview ? 'col-span-2' : ''}`}>
              <div className="flex-1 flex flex-col bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden">
                {/* Preview Bar - Floating Browser Look */}
                <div className="px-4 py-3 border-b border-gray-100 bg-white flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-gray-200" />
                      <div className="w-2.5 h-2.5 rounded-full bg-gray-200" />
                      <div className="w-2.5 h-2.5 rounded-full bg-gray-200" />
                    </div>
                    <div className="h-4 w-[1px] bg-gray-100 mx-1" />
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[11px] font-bold text-gray-800 tracking-wide uppercase">
                        Omnisym Creator Studio - Live Browser
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={compileSandbox}
                    className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors"
                    title="Reload sandbox preview"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>

                {/* Iframe */}
                <div className="flex-1 bg-white relative">
                  <iframe
                    ref={iframeRef}
                    srcDoc={sandboxDoc}
                    title="Omnisym Live Sandbox"
                    sandbox="allow-scripts allow-modals allow-forms"
                    className="w-full h-full border-0"
                  />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
