import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts';
import {
  X,
  Image as ImageIcon,
  Code2,
  Star,
  Download,
  Copy,
  Check,
  Trash2,
  ExternalLink,
  Sparkles,
  Search,
  BookOpen,
  Brain,
  Plus,
  ShieldCheck,
  BarChart3,
  Zap,
  Activity,
  MessageSquare,
  TrendingUp,
  Cpu,
} from 'lucide-react';
import { SavedImage, SavedSnippet, ChatSession } from '../types';
import { SLASH_COMMANDS } from '../data/constants';

interface MyStuffModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedImages: SavedImage[];
  savedSnippets: SavedSnippet[];
  starredSessions: ChatSession[];
  sessions?: ChatSession[];
  userMemories?: string[];
  onAddMemory?: (memory: string) => void;
  onDeleteMemory?: (index: number) => void;
  onClearMemories?: () => void;
  onSelectSession: (id: string) => void;
  onDeleteImage: (id: string) => void;
  onDeleteSnippet: (id: string) => void;
  onUsePrompt: (prompt: string) => void;
}

export const MyStuffModal: React.FC<MyStuffModalProps> = ({
  isOpen,
  onClose,
  savedImages,
  savedSnippets,
  starredSessions,
  sessions = [],
  userMemories = [],
  onAddMemory,
  onDeleteMemory,
  onClearMemories,
  onSelectSession,
  onDeleteImage,
  onDeleteSnippet,
  onUsePrompt,
}) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'images' | 'code' | 'starred' | 'memories' | 'commands'>('dashboard');
  const [chartMetric, setChartMetric] = useState<'tokens' | 'messages'>('tokens');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [previewImage, setPreviewImage] = useState<SavedImage | null>(null);
  const [newMemoryInput, setNewMemoryInput] = useState('');

  // Compute daily activity and token statistics from chat sessions
  const analyticsData = useMemo(() => {
    const days: { dateStr: string; label: string; tokens: number; messages: number; sessions: number }[] = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString(undefined, { weekday: 'short', month: 'numeric', day: 'numeric' });
      days.push({ dateStr, label, tokens: 0, messages: 0, sessions: 0 });
    }

    const dayMap = new Map<string, { dateStr: string; label: string; tokens: number; messages: number; sessions: number }>();
    days.forEach((day) => dayMap.set(day.dateStr, day));

    let totalTokens = 0;
    let totalMessages = 0;
    const modeCounts: Record<string, number> = {
      default: 0,
      code: 0,
      research: 0,
      '3d': 0,
      human: 0,
      temp: 0,
    };

    sessions.forEach((s) => {
      const sessionDateStr = new Date(s.createdAt).toISOString().split('T')[0];
      const sessionDay = dayMap.get(sessionDateStr);
      if (sessionDay) {
        sessionDay.sessions += 1;
      }

      s.messages.forEach((m) => {
        totalMessages += 1;
        // Estimate token count (~3.8 characters per token)
        const estTokens = Math.max(1, Math.round((m.text?.length || 0) / 3.8));
        totalTokens += estTokens;

        const msgDateStr = new Date(m.timestamp).toISOString().split('T')[0];
        const msgDay = dayMap.get(msgDateStr);
        if (msgDay) {
          msgDay.messages += 1;
          msgDay.tokens += estTokens;
        }

        const modeKey = m.mode || s.mode || 'default';
        modeCounts[modeKey] = (modeCounts[modeKey] || 0) + 1;
      });
    });

    return {
      daily: days,
      totalTokens,
      totalMessages,
      totalSessions: sessions.length,
      modeCounts,
      avgTokensPerMessage: totalMessages > 0 ? Math.round(totalTokens / totalMessages) : 0,
    };
  }, [sessions]);

  if (!isOpen) return null;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleDownload = (dataUrl: string, filename: string) => {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename || 'omnisym_creation.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleAddMemorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemoryInput.trim()) return;
    if (onAddMemory) {
      onAddMemory(newMemoryInput.trim());
    }
    setNewMemoryInput('');
  };

  const filteredImages = savedImages.filter((img) =>
    img.prompt.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSnippets = savedSnippets.filter(
    (snip) =>
      snip.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      snip.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      snip.language.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredMemories = userMemories.filter((mem) =>
    mem.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          transition={{ duration: 0.2 }}
          id="my-stuff-modal"
          className="relative w-full max-w-4xl max-h-[85vh] bg-white rounded-3xl shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden"
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/60 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-xs">
                <Sparkles className="w-4 h-4 text-indigo-300" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900">My Stuff & Continuous Memory</h2>
                <p className="text-[11px] text-slate-500">Your saved creations, code snippets, favourites & learned facts</p>
              </div>
            </div>

            <button
              id="close-my-stuff-btn"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation & Search Bar */}
          <div className="px-5 py-2.5 border-b border-slate-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0">
            {/* Tabs */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-full overflow-x-auto no-scrollbar max-w-full">
              <button
                type="button"
                id="my-stuff-tab-dashboard"
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'dashboard'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Dashboard</span>
              </button>

              <button
                type="button"
                id="my-stuff-tab-images"
                onClick={() => setActiveTab('images')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'images'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Images ({savedImages.length})</span>
              </button>

              <button
                type="button"
                id="my-stuff-tab-code"
                onClick={() => setActiveTab('code')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'code'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>Code ({savedSnippets.length})</span>
              </button>

              <button
                type="button"
                id="my-stuff-tab-memories"
                onClick={() => setActiveTab('memories')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'memories'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Brain className="w-3.5 h-3.5" />
                <span>Memory ({userMemories.length})</span>
              </button>

              <button
                type="button"
                id="my-stuff-tab-starred"
                onClick={() => setActiveTab('starred')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'starred'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Star className="w-3.5 h-3.5" />
                <span>Starred ({starredSessions.length})</span>
              </button>

              <button
                type="button"
                id="my-stuff-tab-commands"
                onClick={() => setActiveTab('commands')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'commands'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Cheatsheet</span>
              </button>
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-56 shrink-0">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search repo..."
                className="w-full pl-8 pr-3 py-1 text-xs bg-slate-50 border border-slate-200 rounded-full focus:outline-hidden focus:ring-1 focus:ring-slate-400 focus:border-slate-400 text-slate-800"
              />
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-slate-50/40">
            {/* Dashboard Tab */}
            {activeTab === 'dashboard' && (
              <div className="space-y-4">
                {/* Compact Metric Cards Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 rounded-xl bg-white border border-[#E5E7EB] hover:border-slate-300 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-slate-500">Est. Tokens</span>
                      <div className="w-5 h-5 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <Zap className="w-3 h-3" />
                      </div>
                    </div>
                    <p className="text-lg font-bold text-slate-900 mt-1 font-mono tracking-tight">
                      {analyticsData.totalTokens >= 1000
                        ? `${(analyticsData.totalTokens / 1000).toFixed(1)}k`
                        : analyticsData.totalTokens}
                    </p>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      ~{analyticsData.avgTokensPerMessage} tok/msg
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white border border-[#E5E7EB] hover:border-slate-300 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-slate-500">Interactions</span>
                      <div className="w-5 h-5 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <MessageSquare className="w-3 h-3" />
                      </div>
                    </div>
                    <p className="text-lg font-bold text-slate-900 mt-1 font-mono tracking-tight">
                      {analyticsData.totalMessages}
                    </p>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {analyticsData.totalSessions} sessions
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white border border-[#E5E7EB] hover:border-slate-300 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-slate-500">Saved Artifacts</span>
                      <div className="w-5 h-5 rounded-md bg-sky-50 text-sky-600 flex items-center justify-center">
                        <ImageIcon className="w-3 h-3" />
                      </div>
                    </div>
                    <p className="text-lg font-bold text-slate-900 mt-1 font-mono tracking-tight">
                      {savedImages.length + savedSnippets.length}
                    </p>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {savedImages.length} img · {savedSnippets.length} snip
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white border border-[#E5E7EB] hover:border-slate-300 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-slate-500">Learned Facts</span>
                      <div className="w-5 h-5 rounded-md bg-violet-50 text-violet-600 flex items-center justify-center">
                        <Brain className="w-3 h-3" />
                      </div>
                    </div>
                    <p className="text-lg font-bold text-slate-900 mt-1 font-mono tracking-tight">
                      {userMemories.length}
                    </p>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Active in context
                    </span>
                  </div>
                </div>

                {/* Daily Activity & Token Usage Bar Chart Card */}
                <div className="p-4 rounded-xl bg-white border border-[#E5E7EB] space-y-3">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-1 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-slate-700" />
                        <h3 className="text-xs sm:text-sm font-bold text-slate-900">Daily Activity & Usage Trends</h3>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Historical activity over the last 7 days
                      </p>
                    </div>

                    {/* Metric Switcher */}
                    <div className="flex items-center p-0.5 bg-slate-100 rounded-full text-xs font-medium">
                      <button
                        type="button"
                        onClick={() => setChartMetric('tokens')}
                        className={`px-2.5 py-0.5 rounded-full text-[11px] transition-all cursor-pointer ${
                          chartMetric === 'tokens'
                            ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Est. Tokens
                      </button>
                      <button
                        type="button"
                        onClick={() => setChartMetric('messages')}
                        className={`px-2.5 py-0.5 rounded-full text-[11px] transition-all cursor-pointer ${
                          chartMetric === 'messages'
                            ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Messages
                      </button>
                    </div>
                  </div>

                  {/* Recharts Bar Chart Container */}
                  <div className="w-full h-48 pt-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={analyticsData.daily}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis
                          dataKey="label"
                          stroke="#94a3b8"
                          fontSize={10}
                          tickLine={false}
                          axisLine={{ stroke: '#e2e8f0' }}
                        />
                        <YAxis
                          stroke="#94a3b8"
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(val) =>
                            val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val
                          }
                        />
                        <Tooltip
                          cursor={{ fill: '#f8fafc' }}
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-slate-900 text-white px-3 py-2 rounded-xl shadow-xl border border-slate-800 text-xs">
                                  <p className="font-bold text-slate-200 mb-1">{data.label}</p>
                                  <div className="space-y-0.5 text-[11px]">
                                    <p className="flex items-center justify-between gap-4 text-indigo-300">
                                      <span>Est. Tokens:</span>
                                      <span className="font-mono font-bold">
                                        {data.tokens.toLocaleString()}
                                      </span>
                                    </p>
                                    <p className="flex items-center justify-between gap-4 text-emerald-300">
                                      <span>Messages:</span>
                                      <span className="font-mono font-bold">{data.messages}</span>
                                    </p>
                                    <p className="flex items-center justify-between gap-4 text-slate-400">
                                      <span>New Sessions:</span>
                                      <span className="font-mono font-bold">{data.sessions}</span>
                                    </p>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar
                          dataKey={chartMetric}
                          fill={chartMetric === 'tokens' ? '#6366f1' : '#10b981'}
                          radius={[4, 4, 0, 0]}
                          maxBarSize={32}
                        >
                          {analyticsData.daily.map((entry, index) => {
                            const isToday = index === analyticsData.daily.length - 1;
                            return (
                              <Cell
                                key={`cell-${entry.dateStr || index}-${index}`}
                                fill={
                                  isToday
                                    ? chartMetric === 'tokens'
                                      ? '#4f46e5'
                                      : '#059669'
                                    : chartMetric === 'tokens'
                                    ? '#818cf8'
                                    : '#34d399'
                                }
                              />
                            );
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Persona Breakdown & Quick Shortcuts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Persona Distribution */}
                  <div className="p-3.5 rounded-xl bg-white border border-[#E5E7EB] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Persona Usage</span>
                      </h4>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {analyticsData.totalMessages} msgs
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      {[
                        { key: 'default', label: 'Omnisym Primary', color: 'bg-indigo-500' },
                        { key: 'code', label: '/code Architect', color: 'bg-emerald-500' },
                        { key: 'research', label: '/research Analytics', color: 'bg-sky-500' },
                        { key: '3d', label: '/3d Visualizer', color: 'bg-amber-500' },
                        { key: 'human', label: '/human Empathy', color: 'bg-pink-500' },
                        { key: 'temp', label: '/temp Ephemeral', color: 'bg-slate-500' },
                      ].map((item, iIdx) => {
                        const count = analyticsData.modeCounts[item.key] || 0;
                        const pct =
                          analyticsData.totalMessages > 0
                            ? Math.round((count / analyticsData.totalMessages) * 100)
                            : 0;
                        return (
                          <div key={`persona_${item.key}_${iIdx}`} className="space-y-0.5">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-700 font-medium">{item.label}</span>
                              <span className="text-slate-400 font-mono text-[10px]">
                                {count} ({pct}%)
                              </span>
                            </div>
                            <div className="w-full h-1 rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${item.color}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Repository Overview & Quick Nav */}
                  <div className="p-3.5 rounded-xl bg-white border border-[#E5E7EB] space-y-2.5 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Quick Navigation</span>
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                        Access your saved multimedia assets, code blocks, and memory repository.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => setActiveTab('images')}
                        className="p-2 rounded-lg bg-sky-50/70 hover:bg-sky-100/70 border border-sky-100 text-left transition-colors cursor-pointer"
                      >
                        <ImageIcon className="w-3.5 h-3.5 text-sky-600 mb-0.5" />
                        <p className="text-[11px] font-bold text-sky-950">Visual Gallery</p>
                        <p className="text-[10px] text-sky-700">{savedImages.length} images</p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTab('code')}
                        className="p-2 rounded-lg bg-emerald-50/70 hover:bg-emerald-100/70 border border-emerald-100 text-left transition-colors cursor-pointer"
                      >
                        <Code2 className="w-3.5 h-3.5 text-emerald-600 mb-0.5" />
                        <p className="text-[11px] font-bold text-emerald-950">Code Snippets</p>
                        <p className="text-[10px] text-emerald-700">{savedSnippets.length} snippets</p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTab('memories')}
                        className="p-2 rounded-lg bg-violet-50/70 hover:bg-violet-100/70 border border-violet-100 text-left transition-colors cursor-pointer"
                      >
                        <Brain className="w-3.5 h-3.5 text-violet-600 mb-0.5" />
                        <p className="text-[11px] font-bold text-violet-950">Memory</p>
                        <p className="text-[10px] text-violet-700">{userMemories.length} facts</p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTab('starred')}
                        className="p-2 rounded-lg bg-amber-50/70 hover:bg-amber-100/70 border border-amber-100 text-left transition-colors cursor-pointer"
                      >
                        <Star className="w-3.5 h-3.5 text-amber-600 mb-0.5" />
                        <p className="text-[11px] font-bold text-amber-950">Favourites</p>
                        <p className="text-[10px] text-amber-700">{starredSessions.length} chats</p>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Images Tab */}
            {activeTab === 'images' && (
              <div>
                {filteredImages.length === 0 ? (
                  <div className="text-center py-12 px-4">
                    {/* Minimalist SVG Illustration for Images */}
                    <div className="w-48 h-36 mx-auto mb-4 flex items-center justify-center">
                      <svg className="w-full h-full max-w-[200px]" viewBox="0 0 200 140" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="25" y="20" width="150" height="100" rx="16" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="1.5" strokeDasharray="4 4" />
                        <rect x="42" y="32" width="116" height="76" rx="12" fill="#FFFFFF" stroke="#E0E7FF" strokeWidth="1.5" />
                        {/* Sun / Aura */}
                        <circle cx="70" cy="56" r="10" fill="#EEF2FF" stroke="#818CF8" strokeWidth="1.5" />
                        {/* Mountains */}
                        <path d="M48 98L76 68C78.5 65.5 82.5 65.5 85 68L105 88L118 75C120.5 72.5 124.5 72.5 127 75L152 98" stroke="#6366F1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M96 98L112 82C114 80 117 80 119 82L135 98" stroke="#A5B4FC" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        {/* Sparkle */}
                        <path d="M142 42L144 48L150 50L144 52L142 58L140 52L134 50L140 48L142 42Z" fill="#6366F1" />
                      </svg>
                    </div>
                    <p className="text-sm font-semibold text-slate-900">Your Visual Gallery is Empty</p>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                      Generated images and visual assets from your conversations will automatically be archived here for high-res preview and download.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        onUsePrompt('Generate a modern minimalist glass architectural pavilion surrounded by serene mist');
                        onClose();
                      }}
                      className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-all active:scale-[0.98]"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Generate First Image</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {filteredImages.map((img, imgIdx) => (
                      <div
                        key={img.id ? `${img.id}_${imgIdx}` : `mystuff_img_${imgIdx}`}
                        className="group relative bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col"
                      >
                        <div className="relative aspect-square overflow-hidden bg-slate-100 cursor-pointer" onClick={() => setPreviewImage(img)}>
                          <img
                            src={img.url}
                            alt={img.prompt}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-xs text-white text-[10px] font-mono px-2 py-0.5 rounded-md">
                            {img.aspectRatio} · {img.imageSize}
                          </div>
                        </div>

                        <div className="p-3 flex-1 flex flex-col justify-between">
                          <p className="text-xs text-slate-700 font-medium line-clamp-2">{img.prompt}</p>
                          <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-2">
                            <button
                              type="button"
                              onClick={() => {
                                onUsePrompt(img.prompt);
                                onClose();
                              }}
                              className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
                            >
                              Remix Prompt
                            </button>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleDownload(img.url, `omnisym_${img.id}.png`)}
                                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md"
                                title="Download"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteImage(img.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Code Tab */}
            {activeTab === 'code' && (
              <div>
                {filteredSnippets.length === 0 ? (
                  <div className="text-center py-12 px-4">
                    {/* Minimalist SVG Illustration for Code */}
                    <div className="w-48 h-36 mx-auto mb-4 flex items-center justify-center">
                      <svg className="w-full h-full max-w-[200px]" viewBox="0 0 200 140" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="25" y="20" width="150" height="100" rx="16" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="1.5" strokeDasharray="4 4" />
                        <rect x="42" y="32" width="116" height="76" rx="12" fill="#0F172A" stroke="#1E293B" strokeWidth="1.5" />
                        {/* Terminal Dots */}
                        <circle cx="56" cy="44" r="3" fill="#EF4444" />
                        <circle cx="65" cy="44" r="3" fill="#F59E0B" />
                        <circle cx="74" cy="44" r="3" fill="#10B981" />
                        {/* Code Lines */}
                        <rect x="56" y="58" width="48" height="4" rx="2" fill="#6366F1" />
                        <rect x="110" y="58" width="32" height="4" rx="2" fill="#38BDF8" />
                        <rect x="56" y="70" width="68" height="4" rx="2" fill="#10B981" />
                        <rect x="56" y="82" width="38" height="4" rx="2" fill="#A855F7" />
                        <rect x="100" y="82" width="24" height="4" rx="2" fill="#94A3B8" />
                        {/* Prompt Cursor */}
                        <rect x="56" y="94" width="8" height="4" rx="1" fill="#F8FAFC" />
                      </svg>
                    </div>
                    <p className="text-sm font-semibold text-slate-900">No Saved Code Snippets</p>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                      Save reusable code blocks, APIs, and algorithms from your conversations to create a searchable developer library.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        onUsePrompt('/code Create a TypeScript debounce hook with cancellation');
                        onClose();
                      }}
                      className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-all active:scale-[0.98]"
                    >
                      <Code2 className="w-3.5 h-3.5" />
                      <span>Start a Coding Session</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredSnippets.map((snip, snipIdx) => (
                      <div
                        key={snip.id ? `${snip.id}_${snipIdx}` : `mystuff_snip_${snipIdx}`}
                        className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs"
                      >
                        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 text-white">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-emerald-400 font-mono">
                              {snip.language || 'code'}
                            </span>
                            <span className="text-xs text-slate-300 font-medium">
                              {snip.title || 'Code Snippet'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleCopy(snip.code, snip.id)}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                            >
                              {copiedId === snip.id ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-400" />
                                  <span>Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteSnippet(snip.id)}
                              className="p-1 text-slate-400 hover:text-rose-400 rounded-md transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <pre className="p-4 text-xs font-mono text-slate-800 bg-slate-50 overflow-x-auto max-h-56">
                          <code>{snip.code}</code>
                        </pre>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Starred Tab */}
            {activeTab === 'starred' && (
              <div>
                {starredSessions.length === 0 ? (
                  <div className="text-center py-12 px-4">
                    {/* Minimalist SVG Illustration for Starred */}
                    <div className="w-48 h-36 mx-auto mb-4 flex items-center justify-center">
                      <svg className="w-full h-full max-w-[200px]" viewBox="0 0 200 140" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="25" y="20" width="150" height="100" rx="16" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="1.5" strokeDasharray="4 4" />
                        <rect x="42" y="32" width="116" height="76" rx="12" fill="#FFFFFF" stroke="#FEF3C7" strokeWidth="1.5" />
                        {/* Star Badge */}
                        <circle cx="100" cy="70" r="22" fill="#FFFBEB" stroke="#FDE68A" strokeWidth="1.5" />
                        <path d="M100 56L103.5 64.5L112.5 65.5L106 71.5L108 80.5L100 76L92 80.5L94 71.5L87.5 65.5L96.5 64.5L100 56Z" fill="#F59E0B" stroke="#D97706" strokeWidth="1" strokeLinejoin="round" />
                        {/* Floating sparks */}
                        <circle cx="62" cy="50" r="2.5" fill="#FBBF24" />
                        <circle cx="140" cy="85" r="2" fill="#FBBF24" />
                        <path d="M136 48L137.5 52L141.5 53.5L137.5 55L136 59L134.5 55L130.5 53.5L134.5 52L136 48Z" fill="#F59E0B" />
                      </svg>
                    </div>
                    <p className="text-sm font-semibold text-slate-900">No Starred Conversations</p>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                      Bookmark essential conversations and key research threads by clicking the star icon in your session sidebar or header.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {starredSessions.map((session, sIdx) => (
                      <div
                        key={session.id ? `${session.id}_${sIdx}` : `mystuff_star_${sIdx}`}
                        onClick={() => {
                          onSelectSession(session.id);
                          onClose();
                        }}
                        className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-amber-600 flex items-center gap-1">
                              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> Favourite
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(session.updatedAt).toLocaleDateString()}
                            </span>
                          </div>
                          <h4 className="text-sm font-semibold text-slate-900 mt-1.5 line-clamp-1">
                            {session.title}
                          </h4>
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                            {session.messages[session.messages.length - 1]?.text || 'No messages'}
                          </p>
                        </div>
                        <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-3">
                          <span className="text-[11px] text-slate-400">
                            {session.messages.length} messages
                          </span>
                          <span className="text-xs font-semibold text-indigo-600 flex items-center gap-1">
                            Open <ExternalLink className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Continuous Memory & Learning Tab */}
            {activeTab === 'memories' && (
              <div className="space-y-5">
                <div className="p-4 rounded-2xl bg-violet-50/70 border border-violet-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Brain className="w-4 h-4 text-violet-600" />
                      <h4 className="text-sm font-bold text-violet-950">Continuous Learning & Preference Memory</h4>
                    </div>
                    <p className="text-xs text-violet-700 mt-0.5 max-w-xl">
                      Omnisym dynamically observes your coding style, personal facts, and tool preferences. These permanent facts are injected across future sessions.
                    </p>
                  </div>
                  {userMemories.length > 0 && onClearMemories && (
                    <button
                      type="button"
                      onClick={onClearMemories}
                      className="px-3 py-1.5 rounded-xl bg-white border border-violet-200 text-violet-700 hover:bg-violet-100/70 text-xs font-semibold shrink-0 transition-colors"
                    >
                      Clear All Memories
                    </button>
                  )}
                </div>

                {/* Add Manual Memory Form */}
                <form onSubmit={handleAddMemorySubmit} className="flex gap-2">
                  <input
                    type="text"
                    value={newMemoryInput}
                    onChange={(e) => setNewMemoryInput(e.target.value)}
                    placeholder="Teach Omnisym a preference (e.g. 'User prefers Python and strict typing')..."
                    className="flex-1 px-4 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-slate-800 shadow-2xs"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs shrink-0 transition-all active:scale-[0.98]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Fact</span>
                  </button>
                </form>

                {/* Memories List */}
                {filteredMemories.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
                    <div className="w-12 h-12 rounded-2xl bg-violet-50 text-violet-500 flex items-center justify-center mx-auto mb-3">
                      <Brain className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-semibold text-slate-800">No memories learned yet</p>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      Chat with Omnisym or add a fact above. Omnisym will automatically tag and remember key facts about your preferences!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {filteredMemories.map((memory, idx) => (
                      <div
                        key={`mem_${idx}_${memory.slice(0, 12)}`}
                        className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-between gap-3 hover:border-violet-200 transition-colors"
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center shrink-0 mt-0.5">
                            <ShieldCheck className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-medium text-slate-800 leading-relaxed">{memory}</p>
                            <span className="text-[10px] text-slate-400">Learned & active in context</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleCopy(memory, `mem_${idx}`)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                            title="Copy fact"
                          >
                            {copiedId === `mem_${idx}` ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          {onDeleteMemory && (
                            <button
                              type="button"
                              onClick={() => onDeleteMemory(idx)}
                              className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Delete memory"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Cheatsheet Tab */}
            {activeTab === 'commands' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100">
                  <h4 className="text-sm font-bold text-indigo-950">Omnisym Slash Commands</h4>
                  <p className="text-xs text-indigo-700 mt-0.5">
                    Type / in the chat box to invoke specialized intelligence personas.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {SLASH_COMMANDS.map((cmd, cIdx) => (
                    <div
                      key={`slash_cmd_${cmd.command}_${cIdx}`}
                      className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                          {cmd.command}
                        </span>
                        <span className="text-xs font-semibold text-slate-700">{cmd.title}</span>
                      </div>
                      <p className="text-xs text-slate-600">{cmd.description}</p>
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[11px] font-mono text-slate-400 truncate max-w-[200px]">
                          {cmd.example}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            onUsePrompt(cmd.example);
                            onClose();
                          }}
                          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                        >
                          Try Now
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Fullscreen Preview Lightbox */}
          {previewImage && (
            <div
              className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
              onClick={() => setPreviewImage(null)}
            >
              <div className="relative max-w-3xl max-h-[90vh] bg-slate-900 rounded-2xl overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <img src={previewImage.url} alt={previewImage.prompt} className="max-w-full max-h-[75vh] object-contain mx-auto" />
                <div className="p-4 bg-slate-900 border-t border-slate-800 text-white flex items-center justify-between">
                  <p className="text-xs font-medium text-slate-300 truncate max-w-md">{previewImage.prompt}</p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleDownload(previewImage.url, `omnisym_${previewImage.id}.png`)}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" /> Download
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewImage(null)}
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
