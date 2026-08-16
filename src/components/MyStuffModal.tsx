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
          className="relative w-full max-w-4xl h-[85vh] bg-white rounded-3xl shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden"
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-sm">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">My Stuff & Continuous Memory</h2>
                <p className="text-xs text-slate-500">Your creations, code snippets, favorites & learned preferences</p>
              </div>
            </div>

            <button
              id="close-my-stuff-btn"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation & Search Bar */}
          <div className="px-6 py-3 border-b border-slate-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto max-w-full">
              <button
                type="button"
                id="my-stuff-tab-dashboard"
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  activeTab === 'dashboard'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
                <span>Dashboard</span>
              </button>

              <button
                type="button"
                id="my-stuff-tab-images"
                onClick={() => setActiveTab('images')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  activeTab === 'images'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5 text-sky-500" />
                <span>Images ({savedImages.length})</span>
              </button>

              <button
                type="button"
                id="my-stuff-tab-code"
                onClick={() => setActiveTab('code')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  activeTab === 'code'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Code2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Code ({savedSnippets.length})</span>
              </button>

              <button
                type="button"
                id="my-stuff-tab-memories"
                onClick={() => setActiveTab('memories')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  activeTab === 'memories'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Brain className="w-3.5 h-3.5 text-violet-500" />
                <span>Memory ({userMemories.length})</span>
              </button>

              <button
                type="button"
                id="my-stuff-tab-starred"
                onClick={() => setActiveTab('starred')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  activeTab === 'starred'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Star className="w-3.5 h-3.5 text-amber-500" />
                <span>Starred ({starredSessions.length})</span>
              </button>

              <button
                type="button"
                id="my-stuff-tab-commands"
                onClick={() => setActiveTab('commands')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  activeTab === 'commands'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 text-purple-500" />
                <span>Cheatsheet</span>
              </button>
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search repository..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800"
              />
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-6 bg-slate-50/40">
            {/* Dashboard Tab */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                {/* Metric Cards Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-slate-500">Est. Tokens</span>
                      <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <Zap className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <p className="text-xl font-bold text-slate-900 mt-2 font-mono">
                      {analyticsData.totalTokens >= 1000
                        ? `${(analyticsData.totalTokens / 1000).toFixed(1)}k`
                        : analyticsData.totalTokens}
                    </p>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      ~{analyticsData.avgTokensPerMessage} tokens/message
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-slate-500">Interactions</span>
                      <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <MessageSquare className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <p className="text-xl font-bold text-slate-900 mt-2 font-mono">
                      {analyticsData.totalMessages}
                    </p>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      Across {analyticsData.totalSessions} sessions
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-slate-500">Saved Artifacts</span>
                      <div className="w-6 h-6 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
                        <ImageIcon className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <p className="text-xl font-bold text-slate-900 mt-2 font-mono">
                      {savedImages.length + savedSnippets.length}
                    </p>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      {savedImages.length} images · {savedSnippets.length} snippets
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-slate-500">Learned Facts</span>
                      <div className="w-6 h-6 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">
                        <Brain className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <p className="text-xl font-bold text-slate-900 mt-2 font-mono">
                      {userMemories.length}
                    </p>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      Injected in context
                    </span>
                  </div>
                </div>

                {/* Daily Activity & Token Usage Bar Chart Card */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-1 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-indigo-600" />
                        <h3 className="text-sm font-bold text-slate-900">Daily Activity & Usage Trends</h3>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Historical volume over the last 7 days
                      </p>
                    </div>

                    {/* Metric Switcher */}
                    <div className="flex items-center p-1 bg-slate-100 rounded-xl text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() => setChartMetric('tokens')}
                        className={`px-3 py-1 rounded-lg transition-all ${
                          chartMetric === 'tokens'
                            ? 'bg-white text-indigo-600 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Est. Tokens
                      </button>
                      <button
                        type="button"
                        onClick={() => setChartMetric('messages')}
                        className={`px-3 py-1 rounded-lg transition-all ${
                          chartMetric === 'messages'
                            ? 'bg-white text-emerald-600 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Messages
                      </button>
                    </div>
                  </div>

                  {/* Recharts Bar Chart Container */}
                  <div className="w-full h-56 pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={analyticsData.daily}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis
                          dataKey="label"
                          stroke="#94a3b8"
                          fontSize={11}
                          tickLine={false}
                          axisLine={{ stroke: '#e2e8f0' }}
                        />
                        <YAxis
                          stroke="#94a3b8"
                          fontSize={11}
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
                                <div className="bg-slate-900 text-white px-3 py-2.5 rounded-xl shadow-xl border border-slate-800 text-xs">
                                  <p className="font-bold text-slate-200 mb-1.5">{data.label}</p>
                                  <div className="space-y-1 text-[11px]">
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
                          radius={[6, 6, 0, 0]}
                          maxBarSize={36}
                        >
                          {analyticsData.daily.map((entry, index) => {
                            const isToday = index === analyticsData.daily.length - 1;
                            return (
                              <Cell
                                key={`cell-${index}`}
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Persona Distribution */}
                  <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Slash Command & Persona Usage</span>
                      </h4>
                      <span className="text-[10px] text-slate-400">
                        {analyticsData.totalMessages} total msgs
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      {[
                        { key: 'default', label: 'Default Hinglish', color: 'bg-indigo-500' },
                        { key: 'code', label: '/code Developer', color: 'bg-emerald-500' },
                        { key: 'research', label: '/research Grounding', color: 'bg-sky-500' },
                        { key: '3d', label: '/3d Graphics Specialist', color: 'bg-amber-500' },
                        { key: 'human', label: '/human Empathy Friend', color: 'bg-pink-500' },
                        { key: 'temp', label: '/temp Incognito', color: 'bg-slate-500' },
                      ].map((item) => {
                        const count = analyticsData.modeCounts[item.key] || 0;
                        const pct =
                          analyticsData.totalMessages > 0
                            ? Math.round((count / analyticsData.totalMessages) * 100)
                            : 0;
                        return (
                          <div key={item.key} className="space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-700 font-medium">{item.label}</span>
                              <span className="text-slate-400 font-mono">
                                {count} ({pct}%)
                              </span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
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
                  <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3 flex flex-col justify-between">
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Quick Navigation</span>
                      </h4>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Access your saved multimedia assets, code blocks, and continuous learning repository directly.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setActiveTab('images')}
                        className="p-3 rounded-xl bg-sky-50/70 hover:bg-sky-100/70 border border-sky-100 text-left transition-colors"
                      >
                        <ImageIcon className="w-4 h-4 text-sky-600 mb-1" />
                        <p className="text-xs font-bold text-sky-950">Visual Gallery</p>
                        <p className="text-[10px] text-sky-700">{savedImages.length} saved images</p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTab('code')}
                        className="p-3 rounded-xl bg-emerald-50/70 hover:bg-emerald-100/70 border border-emerald-100 text-left transition-colors"
                      >
                        <Code2 className="w-4 h-4 text-emerald-600 mb-1" />
                        <p className="text-xs font-bold text-emerald-950">Code Snippets</p>
                        <p className="text-[10px] text-emerald-700">{savedSnippets.length} snippets</p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTab('memories')}
                        className="p-3 rounded-xl bg-violet-50/70 hover:bg-violet-100/70 border border-violet-100 text-left transition-colors"
                      >
                        <Brain className="w-4 h-4 text-violet-600 mb-1" />
                        <p className="text-xs font-bold text-violet-950">Learned Memory</p>
                        <p className="text-[10px] text-violet-700">{userMemories.length} preferences</p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTab('starred')}
                        className="p-3 rounded-xl bg-amber-50/70 hover:bg-amber-100/70 border border-amber-100 text-left transition-colors"
                      >
                        <Star className="w-4 h-4 text-amber-600 mb-1" />
                        <p className="text-xs font-bold text-amber-950">Favorites</p>
                        <p className="text-[10px] text-amber-700">{starredSessions.length} starred chats</p>
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
                  <div className="text-center py-16">
                    <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-500 flex items-center justify-center mx-auto mb-3">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-semibold text-slate-800">No saved images yet</p>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      Ask Omnisym to generate an image or use the 'Generate Image' suggestion chip to get started.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {filteredImages.map((img) => (
                      <div
                        key={img.id}
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
                  <div className="text-center py-16">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                      <Code2 className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-semibold text-slate-800">No saved code snippets</p>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      Click "Save Snippet" on any generated code block in your chat to store it in your repository.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredSnippets.map((snip) => (
                      <div
                        key={snip.id}
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
                  <div className="text-center py-16">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mx-auto mb-3">
                      <Star className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-semibold text-slate-800">No starred conversations</p>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      Click the star icon next to any chat in your sidebar to mark it as a favorite.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {starredSessions.map((session) => (
                      <div
                        key={session.id}
                        onClick={() => {
                          onSelectSession(session.id);
                          onClose();
                        }}
                        className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-amber-600 flex items-center gap-1">
                              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> Favorite
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
                        key={`mem_${idx}`}
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
                  {SLASH_COMMANDS.map((cmd) => (
                    <div
                      key={cmd.command}
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
