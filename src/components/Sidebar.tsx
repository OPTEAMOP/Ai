import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus,
  MessageSquare,
  Sparkles,
  Trash2,
  Pin,
  Star,
  Search,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LogOut,
  User,
  Shield,
  Clock,
  MoreVertical,
  Settings,
  Moon,
  Sun,
  GripVertical,
  Tag,
  Code2,
  Layers,
  BookOpen,
  PenTool,
  Cpu,
  Archive,
  ArchiveRestore,
  Lock,
  Unlock,
  MoreHorizontal,
  Download,
  Crown,
  HardDrive,
  FileCode,
  Zap,
  ArrowUpRight,
} from 'lucide-react';
import { ChatSession, UserProfile, UserSubscription, SubscriptionTier } from '../types';
import { CATEGORIES, CATEGORY_META, SessionCategory } from '../utils/categorizer';
import { SidebarContextMenu } from './SidebarContextMenu';
import { usePWA } from './PWAInstallProvider';
import { getUserAvatar, getUserDisplayName } from '../utils/userUtils';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string) => void;
  onTogglePinSession: (id: string) => void;
  onToggleStarSession: (id: string) => void;
  onToggleArchiveSession?: (id: string) => void;
  onToggleReadOnlySession?: (id: string) => void;
  onReorderSessions?: (newSessions: ChatSession[]) => void;
  onOpenMyStuff: () => void;
  onOpenAuth: () => void;
  currentUser: UserProfile;
  subscription?: UserSubscription;
  onOpenSubscription?: (tier?: SubscriptionTier) => void;
  onOpenLiveSandbox?: () => void;
  storageUsageMB?: number;
  savedImagesCount: number;
  savedSnippetsCount: number;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenAdmin?: () => void;
  onOpenFeedback?: (sessionId: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onToggle,
  sessions,
  currentSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  onTogglePinSession,
  onToggleStarSession,
  onToggleArchiveSession,
  onToggleReadOnlySession,
  onReorderSessions,
  onOpenMyStuff,
  onOpenAuth,
  currentUser,
  subscription,
  onOpenSubscription,
  onOpenLiveSandbox,
  storageUsageMB = 4.2,
  savedImagesCount,
  savedSnippetsCount,
  darkMode,
  onToggleDarkMode,
  onOpenAdmin,
  onOpenFeedback,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<SessionCategory | 'All'>('All');
  const [showSettings, setShowSettings] = useState(false);
  const [isArchiveFolderOpen, setIsArchiveFolderOpen] = useState(false);

  const isPro = subscription?.isPro;
  const storageLimitGB = subscription?.storageLimitGB || 1;
  const storageUsedGB = (storageUsageMB / 1024);
  const storagePercent = Math.min(100, Math.max(3, Math.round((storageUsedGB / storageLimitGB) * 100)));

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    anchorPoint: { x: number; y: number };
    sessionId: string | null;
    isPinned: boolean;
  }>({
    isOpen: false,
    anchorPoint: { x: 0, y: 0 },
    sessionId: null,
    isPinned: false,
  });

  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  const handleContextMenu = (e: React.MouseEvent | React.TouchEvent, session: ChatSession) => {
    e.preventDefault();
    e.stopPropagation();
    
    let x, y;
    if ('clientX' in e) {
      x = e.clientX;
      y = e.clientY;
    } else {
      x = e.touches[0].clientX;
      y = e.touches[0].clientY;
    }

    setContextMenu({
      isOpen: true,
      anchorPoint: { x, y },
      sessionId: session.id,
      isPinned: !!session.isPinned,
    });
  };

  const handleTouchStart = (e: React.TouchEvent, session: ChatSession) => {
    longPressTimer.current = setTimeout(() => {
      handleContextMenu(e, session);
    }, 500); // 500ms for long press
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  // Drag and drop state
  const [draggedSessionId, setDraggedSessionId] = useState<string | null>(null);
  const [dragOverSessionId, setDragOverSessionId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | null>(null);

  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Extract all unique tags across all sessions for tag filters
  const allUniqueTags = Array.from(
    new Set(
      sessions.flatMap((s) => s.tags || []).filter(Boolean)
    )
  ).slice(0, 8);

  // Safeguard: Ensure sessions are unique by ID before filtering and rendering to prevent duplicate key errors
  const uniqueSessionsBase = Array.from(new Map(sessions.map(s => [s.id, s])).values());

  const filteredSessions = uniqueSessionsBase.filter((s) => {
    const term = searchTerm.toLowerCase().trim();
    
    // Tag filter match
    if (selectedTag && (!s.tags || !s.tags.includes(selectedTag))) {
      return false;
    }

    if (!term) {
      return selectedCategory === 'All' || s.category === selectedCategory;
    }

    const matchesTitle = s.title.toLowerCase().includes(term);
    const matchesCategory = s.category && s.category.toLowerCase().includes(term);
    const matchesTags = s.tags && s.tags.some((t) => t.toLowerCase().includes(term));
    const matchesMessages = s.messages && s.messages.some((m) => m.text.toLowerCase().includes(term));

    const matchesSearch = matchesTitle || matchesCategory || matchesTags || matchesMessages;
    const matchesCat = selectedCategory === 'All' || s.category === selectedCategory;

    return matchesSearch && matchesCat;
  });

  // Calculate category counts for badges
  const categoryCounts = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = uniqueSessionsBase.filter((s) => s.category === cat).length;
    return acc;
  }, {} as Record<SessionCategory, number>);

  // Inactivity threshold: 30 days
  const now = Date.now();
  const ONE_DAY = 24 * 60 * 60 * 1000;
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

  // Identify archived sessions (explicitly archived OR inactive > 30 days unless pinned)
  const isSessionArchived = (s: ChatSession) => {
    return Boolean(s.isArchived || (!s.isPinned && now - (s.updatedAt || s.createdAt) >= THIRTY_DAYS));
  };

  const archivedSessions = filteredSessions.filter((s) => isSessionArchived(s));
  const activeSessions = filteredSessions.filter((s) => !isSessionArchived(s));

  const pinnedSessions = activeSessions.filter((s) => s.isPinned);
  const regularActiveSessions = activeSessions.filter((s) => !s.isPinned);

  const todaySessions = regularActiveSessions.filter((s) => now - (s.updatedAt || s.createdAt) < ONE_DAY);
  const olderSessions = regularActiveSessions.filter((s) => now - (s.updatedAt || s.createdAt) >= ONE_DAY);

  // Drag & drop handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedSessionId(id);
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (id === draggedSessionId) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const isTopHalf = e.clientY - rect.top < rect.height / 2;
    setDragOverSessionId(id);
    setDropPosition(isTopHalf ? 'before' : 'after');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverSessionId(null);
      setDropPosition(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain') || draggedSessionId;
    if (!sourceId || sourceId === targetId) {
      setDraggedSessionId(null);
      setDragOverSessionId(null);
      setDropPosition(null);
      return;
    }

    const sourceIndex = sessions.findIndex((s) => s.id === sourceId);
    const targetIndex = sessions.findIndex((s) => s.id === targetId);

    if (sourceIndex === -1 || targetIndex === -1) {
      setDraggedSessionId(null);
      setDragOverSessionId(null);
      setDropPosition(null);
      return;
    }

    const updated = [...sessions];
    const [movedSession] = updated.splice(sourceIndex, 1);
    const adjustedTargetIndex = updated.findIndex((s) => s.id === targetId);
    const insertIndex = dropPosition === 'after' ? adjustedTargetIndex + 1 : adjustedTargetIndex;
    updated.splice(insertIndex, 0, movedSession);

    if (onReorderSessions) {
      onReorderSessions(updated);
    }

    setDraggedSessionId(null);
    setDragOverSessionId(null);
    setDropPosition(null);
  };

  const handleDragEnd = () => {
    setDraggedSessionId(null);
    setDragOverSessionId(null);
    setDropPosition(null);
  };

  const handleSidebarAction = (action: () => void) => {
    action();
    if (window.innerWidth < 768) {
      onToggle();
    }
  };

  return (
    <>
      {/* Sidebar Container */}
      {/* Mobile Backdrop Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onToggle}
            className="fixed inset-0 bg-slate-900/60 z-[80] md:hidden"
          />
        )}
      </AnimatePresence>

      <aside
        id="sidebar-navigation"
        className={`fixed md:static inset-y-0 left-0 z-[90] w-72 h-[100dvh] bg-[var(--bg-sidebar)] border-r border-[var(--border-color)] flex flex-col overflow-hidden transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0 shadow-2xl md:shadow-none' : '-translate-x-full md:translate-x-0 md:w-0 md:opacity-0 md:pointer-events-none'
        }`}
      >
        {/* Context Menu Instance */}
        <SidebarContextMenu
          isOpen={contextMenu.isOpen}
          onClose={() => setContextMenu({ ...contextMenu, isOpen: false })}
          anchorPoint={contextMenu.anchorPoint}
          isPinned={contextMenu.isPinned}
          onPin={() => contextMenu.sessionId && onTogglePinSession(contextMenu.sessionId)}
          onDelete={() => contextMenu.sessionId && onDeleteSession(contextMenu.sessionId)}
          onFeedback={() => contextMenu.sessionId && onOpenFeedback && onOpenFeedback(contextMenu.sessionId)}
        />

        {/* Brand Header */}
        <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center border border-indigo-500 shadow-sm shadow-indigo-500/10">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-zinc-900 tracking-tight">Omnisym</h1>
              <span className="text-[10px] font-bold text-zinc-500 bg-zinc-100 px-1.5 py-0.5 rounded-sm border border-zinc-200 uppercase tracking-tighter">
                AI Agent
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onToggle}
            className="md:hidden p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        {/* Action Controls */}
        <div className="p-3 space-y-2 border-b border-[var(--border-color)] shrink-0">
          {/* New Chat Button */}
          <button
            type="button"
            id="new-chat-button"
            onClick={() => handleSidebarAction(onNewChat)}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-lg shadow-indigo-500/20 transition-all duration-250 ease-in-out active:scale-[0.98]"
            title="Start new conversation (Cmd/Ctrl + N)"
          >
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              <span>New Chat</span>
            </div>
            <kbd className="text-[10px] bg-zinc-800 px-1.5 py-0.5 rounded font-mono text-zinc-400">
              ⌘N
            </kbd>
          </button>

          {/* My Stuff Hub Shortcut */}
          <button
            type="button"
            id="open-my-stuff-sidebar-btn"
            onClick={() => handleSidebarAction(onOpenMyStuff)}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-white hover:bg-zinc-50 border border-zinc-200 text-xs font-bold text-zinc-900 transition-colors shadow-sm"
          >
            <div className="flex items-center gap-2">
              <Bookmark className="w-3.5 h-3.5 text-zinc-900" />
              <span>My Stuff</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-zinc-100 text-zinc-600 font-bold">
                {savedImagesCount + savedSnippetsCount}
              </span>
            </div>
          </button>

          {/* Discord Link for Sidebar (Under My Stuff) */}
          <a
            id="sidebar-discord-community-link"
            href="https://discord.gg/kbvYTvtqFv"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-bold text-slate-600 transition-colors shadow-sm"
          >
            <svg
              className="w-4 h-4 text-[#5865F2] shrink-0"
              viewBox="0 0 127.14 96.36"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83 97.68 97.68 0 0 0-29.08 0 72.37 72.37 0 0 0-3.38-6.83 105.15 105.15 0 0 0-26.23 8.07C3.4 29.09-3.3 54.45 1.09 81.18a105.43 105.43 0 0 0 32.14 16.14 75.35 75.35 0 0 0 6.89-11.2 68.3 68.3 0 0 1-10.85-5.18c.9-.66 1.8-1.34 2.66-2a75.57 75.57 0 0 0 64.32 0c.87.66 1.76 1.34 2.66 2a68.3 68.3 0 0 1-10.87 5.19 75.35 75.35 0 0 0 6.89 11.2 105.43 105.43 0 0 0 32.14-16.14c4.88-30.82-7.17-53.53-29.37-73.11ZM42.63 65.59c-6.19 0-11.31-5.71-11.31-12.72s5.04-12.72 11.31-12.72 11.39 5.71 11.31 12.72c0 7-5.04 12.72-11.31 12.72Zm41.88 0c-6.19 0-11.31-5.71-11.31-12.72s5.04-12.72 11.31-12.72 11.39 5.71 11.31 12.72c0 7-5.04 12.72-11.31 12.72Z" />
            </svg>
            <span>Community</span>
          </a>

          {/* Plugins Button */}
          <button
            type="button"
            id="sidebar-arsenal-btn"
            onClick={() => {
              const arsenalBtn = document.getElementById('arsenal-trigger-btn');
              arsenalBtn?.click();
            }}
            className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-zinc-50 border border-zinc-200 text-xs font-bold text-zinc-900 transition-colors shadow-sm"
          >
            <Layers className="w-3.5 h-3.5 text-zinc-900" />
            <span>AI Tools</span>
          </button>
          
          {/* PWA Install Button */}
          {usePWA().isInstallable && (
            <button
              type="button"
              id="pwa-install-btn"
              onClick={usePWA().installApp}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 text-xs font-semibold text-emerald-700 transition-all shadow-2xs group relative overflow-hidden"
            >
              <div className="flex items-center gap-2">
                <Download className="w-3.5 h-3.5 text-emerald-600 group-hover:scale-110 transition-transform" />
                <span>Download App</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              </div>
            </button>
          )}

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="sidebar-session-search-input"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-9 pr-8 py-2.5 text-xs bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl focus:outline-hidden focus:ring-2 focus:ring-slate-400/20 focus:border-slate-400 text-[var(--text-primary)] placeholder:text-slate-400 shadow-2xs"
            />
            {searchTerm && (
              <button
                type="button"
                id="sidebar-search-clear-btn"
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 cursor-pointer"
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Chat History List */}
        <div 
          className="flex-1 min-h-[35vh] overflow-y-auto px-2 py-2 space-y-3 virtual-scroll-area optimize-gpu"
          style={{ flexGrow: '1 !important' as any }}
        >
          {searchTerm && (
            <div className="px-2 py-1 bg-slate-100/80 rounded-lg text-[11px] text-slate-600 flex items-center justify-between font-medium">
              <span>Found {filteredSessions.length} {filteredSessions.length === 1 ? 'match' : 'matches'}</span>
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="text-[10px] text-slate-500 hover:text-slate-900 hover:underline cursor-pointer"
              >
                Clear
              </button>
            </div>
          )}
          {/* Pinned Sessions */}
          {pinnedSessions.length > 0 && (
            <div>
              <div className="px-2 mb-1.5 flex items-center gap-1.5 text-[10px] font-bold text-indigo-600/70 uppercase tracking-wider">
                <Pin className="w-3 h-3 text-indigo-500" />
                <span>Pinned</span>
              </div>
              <div className="space-y-1">
                {pinnedSessions.map((session) => renderSessionItem(session, 'pinned'))}
              </div>
            </div>
          )}

          {/* Today Sessions */}
          {todaySessions.length > 0 && (
            <div>
              <div className="px-2 mb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Today
              </div>
              <div className="space-y-1">
                {todaySessions.map((session) => renderSessionItem(session, 'today'))}
              </div>
            </div>
          )}

          {/* Older Sessions */}
          {olderSessions.length > 0 && (
            <div>
              <div className="px-2 mb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Previous Conversations
              </div>
              <div className="space-y-1">
                {olderSessions.map((session) => renderSessionItem(session, 'older'))}
              </div>
            </div>
          )}

          {/* Archived Folder (Collapsible) */}
          {archivedSessions.length > 0 && (
            <div className="pt-2 border-t border-slate-200/60">
              <button
                type="button"
                id="sidebar-archived-folder-toggle"
                onClick={() => setIsArchiveFolderOpen(!isArchiveFolderOpen)}
                className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-[11px] font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 transition-colors uppercase tracking-wider cursor-pointer"
              >
                <div className="flex items-center gap-1.5">
                  <Archive className="w-3.5 h-3.5 text-slate-500" />
                  <span>Archived</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-600">
                    {archivedSessions.length}
                  </span>
                </div>
                {isArchiveFolderOpen ? (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                )}
              </button>

              <AnimatePresence>
                {isArchiveFolderOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.18 }}
                    className="space-y-1 mt-1.5 pl-1"
                  >
                    <div className="text-[10px] text-slate-400 px-2 py-0.5 mb-1 italic">
                      Older than 30 days or manually archived
                    </div>
                    {archivedSessions.map((session) => renderSessionItem(session, 'archived'))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {filteredSessions.length === 0 && (
            <div className="p-4 text-center space-y-2">
              <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Search className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold text-slate-600">No conversations found</p>
              <p className="text-[11px] text-slate-400">
                {searchTerm || selectedTag ? 'Try adjusting your search terms or content tags.' : 'Start a new conversation to see it here.'}
              </p>
              {(searchTerm || selectedTag || selectedCategory !== 'All') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedTag(null);
                    setSelectedCategory('All');
                  }}
                  className="px-3 py-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                >
                  Clear Filters
                </button>
              )}
            </div>
          )}
        </div>
 
        {/* User Profile Footer & Pro Subscription Section */}
        <div className="p-2.5 border-t border-[var(--border-color)] bg-[var(--bg-sidebar)] relative space-y-2 shrink-0 mt-auto">
          {/* Subscription Banner / Storage Status Card */}
          {isPro ? (
            <div
              id="sidebar-pro-active-card"
              onClick={() => onOpenSubscription && onOpenSubscription(subscription?.tier)}
              className="p-2.5 rounded-xl bg-indigo-50/40 border border-indigo-100 cursor-pointer hover:border-indigo-300 transition-all group"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-600">
                    Pro Active
                  </span>
                </div>
                <ArrowUpRight className="w-3 h-3 text-indigo-400 group-hover:text-indigo-600" />
              </div>
 
              {/* Storage Usage Meter */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[9px] text-slate-500">
                  <span className="font-bold">Vault</span>
                  <span className="font-mono text-indigo-700 font-bold">
                    {storageUsageMB.toFixed(1)}MB / {storageLimitGB}GB
                  </span>
                </div>
                <div className="w-full h-1 bg-indigo-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 rounded-full transition-all"
                    style={{ width: `${storagePercent}%` }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div
              id="sidebar-upgrade-promo-card"
              onClick={() => onOpenSubscription && onOpenSubscription()}
              className="p-2.5 rounded-xl bg-indigo-500/5 border border-indigo-500/20 hover:bg-indigo-500/10 hover:border-indigo-500/30 transition-all cursor-pointer group shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                    <Crown className="w-3.5 h-3.5 text-indigo-600" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider">
                      Upgrade
                    </div>
                    <p className="text-[9px] text-indigo-600/70 font-bold">Unlock full power</p>
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-indigo-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>
          )}

          {showSettings ? (
            <div className="absolute bottom-[110%] left-3 right-3 bg-white border border-slate-200 shadow-2xl rounded-2xl p-3 z-[1000] animate-in fade-in slide-in-from-bottom-2 duration-300">
              {/* Centered Avatar Section */}
              <div className="flex flex-col items-center py-4 px-2 border-b border-slate-100 mb-2">
                <img
                  src={getUserAvatar(currentUser)}
                  alt={getUserDisplayName(currentUser)}
                  loading="lazy"
                  decoding="async"
                  className="w-[72px] h-[72px] rounded-full object-cover border-4 border-white shadow-md mb-3"
                  style={{ display: 'block', margin: '0 auto 12px auto' }}
                />
                <h3 className="text-sm font-bold text-slate-900 text-center truncate w-full">
                  {getUserDisplayName(currentUser)}
                </h3>
                <p className="text-[11px] text-slate-500 text-center truncate w-full">
                  {currentUser.email}
                </p>
              </div>

              {/* Main Actions */}
              <div className="space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowSettings(false);
                    // Trigger generic settings
                  }}
                  className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 transition-colors text-left text-slate-700"
                >
                  <Settings className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="text-xs font-semibold">General Settings</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onOpenSubscription();
                    setShowSettings(false);
                  }}
                  className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 transition-colors text-left text-slate-700"
                >
                  <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="text-xs font-semibold">Billing & Subscriptions</span>
                </button>

                {onOpenLiveSandbox && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenLiveSandbox();
                      setShowSettings(false);
                    }}
                    className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 transition-colors text-left text-slate-700"
                  >
                    <FileCode className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                    <span className="text-xs font-semibold">Live Sandbox & ZIP</span>
                  </button>
                )}
                
                {/* Dev Only: Reset VIP */}
                {(currentUser.email === 'apar123445@gmail.com' || currentUser.role === 'admin') && (
                  <button
                    type="button"
                    onClick={() => {
                      localStorage.removeItem('pro_watch_ads_counter');
                      localStorage.removeItem('pro_watch_ads_expiry');
                      alert('VIP Status Reset!');
                      setShowSettings(false);
                    }}
                    className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-rose-50 transition-colors text-left text-rose-600"
                  >
                    <Unlock className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-xs font-semibold">Reset VIP (Dev Only)</span>
                  </button>
                )}

                <div className="h-px bg-slate-100 my-2 mx-1" />

                <button
                  type="button"
                  className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 transition-colors text-left text-slate-700"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span className="text-xs font-semibold">Help & Support</span>
                </button>

                <a
                  href="https://discord.gg/kbvYTvtqFv"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setShowSettings(false)}
                  className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 transition-colors text-left text-slate-700"
                >
                  <svg className="w-3.5 h-3.5 text-[#5865F2] shrink-0" viewBox="0 0 127.14 96.36" fill="currentColor">
                    <path d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83 97.68 97.68 0 0 0-29.08 0 72.37 72.37 0 0 0-3.38-6.83 105.15 105.15 0 0 0-26.23 8.07C3.4 29.09-3.3 54.45 1.09 81.18a105.43 105.43 0 0 0 32.14 16.14 75.35 75.35 0 0 0 6.89-11.2 68.3 68.3 0 0 1-10.85-5.18c.9-.66 1.8-1.34 2.66-2a75.57 75.57 0 0 0 64.32 0c.87.66 1.76 1.34 2.66 2a68.3 68.3 0 0 1-10.87 5.19 75.35 75.35 0 0 0 6.89 11.2 105.43 105.43 0 0 0 32.14-16.14c4.88-30.82-7.17-53.53-29.37-73.11ZM42.63 65.59c-6.19 0-11.31-5.71-11.31-12.72s5.04-12.72 11.31-12.72 11.39 5.71 11.31 12.72c0 7-5.04 12.72-11.31 12.72Zm41.88 0c-6.19 0-11.31-5.71-11.31-12.72s5.04-12.72 11.31-12.72 11.39 5.71 11.31 12.72c0 7-5.04 12.72-11.31 12.72Z"/>
                  </svg>
                  <span className="text-xs font-semibold text-slate-700">Discord Community</span>
                </a>

                <button
                  type="button"
                  onClick={onToggleDarkMode}
                  className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-2.5">
                    {darkMode ? <Moon className="w-3.5 h-3.5 text-indigo-600" /> : <Sun className="w-3.5 h-3.5 text-amber-500" />}
                    <span className="text-xs font-semibold text-slate-700">Dark Mode</span>
                  </div>
                  <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${darkMode ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                    <div className={`w-3 h-3 bg-white rounded-full shadow-xs transition-transform ${darkMode ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                </button>
              </div>
            </div>
          ) : null}

          <div className="flex items-center gap-1">
            <button
              type="button"
              id="user-profile-btn"
              onClick={onOpenAuth}
              className="flex-1 flex items-center justify-between p-2 rounded-xl hover:bg-white transition-all duration-250 ease-in-out text-left min-w-0 group/user shadow-xs border border-transparent hover:border-slate-100"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src={getUserAvatar(currentUser)}
                  alt={getUserDisplayName(currentUser)}
                  className="avatar-circle border border-slate-200 group-hover/user:border-indigo-400 group-hover/user:ring-2 group-hover/user:ring-indigo-400/10 transition-all"
                  style={{ width: '40px', height: '40px', minWidth: '40px', minHeight: '40px' }}
                />
                <div className="min-w-0 max-w-[140px]">
                  <p className="text-xs font-bold text-slate-900 truncate" title={getUserDisplayName(currentUser)}>{getUserDisplayName(currentUser)}</p>
                  <p className="text-[10px] text-slate-400 truncate">{currentUser.email}</p>
                </div>
              </div>
            </button>
            
            <button
              type="button"
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-xl transition-colors shrink-0 ${showSettings ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'}`}
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>

          {/* Legal Links at absolute bottom */}
          <div className="pt-2 flex items-center justify-center gap-4 text-[10px] font-medium text-slate-400 border-t border-[var(--border-color)] mt-1 opacity-70">
            <button 
              onClick={() => {
                const privacyBtn = document.getElementById('global-privacy-btn');
                privacyBtn?.click();
              }}
              className="hover:text-slate-600 transition-colors cursor-pointer"
            >
              Privacy
            </button>
            <span className="w-1 h-1 rounded-full bg-slate-200" />
            <button 
              onClick={() => {
                const termsBtn = document.getElementById('global-terms-btn');
                termsBtn?.click();
              }}
              className="hover:text-slate-600 transition-colors cursor-pointer"
            >
              Terms
            </button>
          </div>
        </div>
      </aside>
    </>
  );

  function renderSessionItem(session: ChatSession, category: string = 'active') {
    const isSelected = currentSessionId === session.id;
    const isBeingDragged = draggedSessionId === session.id;
    const isDropTarget = dragOverSessionId === session.id;
    const isArchivedSection = category === 'archived';

    return (
      <div key={`${category}_${session.id}`} className="relative select-none">
        {/* Top Drop Indicator Line */}
        {isDropTarget && dropPosition === 'before' && (
          <div className="absolute -top-1 left-2 right-2 h-0.5 bg-indigo-600 rounded-full z-10 shadow-xs animate-pulse" />
        )}

        <div
          id={`sidebar-session-${session.id}`}
          draggable={true}
          onDragStart={(e) => handleDragStart(e, session.id)}
          onDragOver={(e) => handleDragOver(e, session.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, session.id)}
          onDragEnd={handleDragEnd}
          onClick={() => handleSidebarAction(() => onSelectSession(session.id))}
          className={`group relative flex items-center justify-between px-4 py-3.5 rounded-xl text-sm transition-all cursor-pointer ${
            isBeingDragged ? 'opacity-40 scale-[0.98] border-dashed border-slate-300' : ''
          } ${
            isSelected
              ? 'bg-[var(--bg-main)] text-[var(--text-primary)] font-semibold shadow-xs'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-main)] hover:text-[var(--text-primary)]'
          } ${isArchivedSection ? 'bg-[var(--bg-main)] opacity-70' : ''}`}
          title={isArchivedSection ? 'Archived conversation' : 'Drag to reorder conversation'}
          onContextMenu={(e) => handleContextMenu(e, session)}
          onTouchStart={(e) => handleTouchStart(e, session)}
          onTouchEnd={handleTouchEnd}
          onTouchMove={handleTouchEnd}
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {/* Drag Grip Handle */}
            <div
              className="opacity-0 group-hover:opacity-40 hover:opacity-100 cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-700 transition-opacity shrink-0 -ml-1"
              title="Drag to reorder"
            >
              <GripVertical className="w-3.5 h-3.5" />
            </div>

            {isArchivedSection ? (
              <Archive className="w-4 h-4 shrink-0 text-[#9CA3AF]" />
            ) : (
              <MessageSquare className="w-4 h-4 shrink-0 text-[#9CA3AF]" />
            )}

            <div className="min-w-0 flex-1 flex items-center gap-2 overflow-hidden">
              <span className="truncate whitespace-nowrap text-[14px] text-sm font-medium text-[var(--text-primary)] flex-1">
                {session.title || 'New Conversation'}
              </span>
              {session.isReadOnly && (
                <span
                  className="shrink-0 p-0.5 rounded-sm bg-amber-50 text-amber-700 border border-amber-200/60"
                  title="Read-Only: Messaging locked"
                >
                  <Lock className="w-2.5 h-2.5" />
                </span>
              )}
            </div>
          </div>

          {/* Action icons on hover */}
          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity shrink-0 ml-2">
            {/* Context Menu Trigger (⋮) */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleContextMenu(e, session);
              }}
              className="p-1 rounded-md hover:bg-slate-200/70 text-slate-400 hover:text-slate-700 transition-all"
              title="Options"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Bottom Drop Indicator Line */}
        {isDropTarget && dropPosition === 'after' && (
          <div className="absolute -bottom-1 left-2 right-2 h-0.5 bg-indigo-600 rounded-full z-10 shadow-xs animate-pulse" />
        )}
      </div>
    );
  }
};
