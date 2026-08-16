import React, { useState } from 'react';
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
  LogOut,
  User,
  Shield,
  Clock,
  MoreVertical,
  Settings,
  Moon,
  Sun,
  GripVertical
} from 'lucide-react';
import { ChatSession, UserProfile } from '../types';

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
  onReorderSessions?: (newSessions: ChatSession[]) => void;
  onOpenMyStuff: () => void;
  onOpenAuth: () => void;
  currentUser: UserProfile;
  savedImagesCount: number;
  savedSnippetsCount: number;
  darkMode: boolean;
  onToggleDarkMode: () => void;
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
  onReorderSessions,
  onOpenMyStuff,
  onOpenAuth,
  currentUser,
  savedImagesCount,
  savedSnippetsCount,
  darkMode,
  onToggleDarkMode,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  // Drag and drop state
  const [draggedSessionId, setDraggedSessionId] = useState<string | null>(null);
  const [dragOverSessionId, setDragOverSessionId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | null>(null);

  const filteredSessions = sessions.filter((s) =>
    s.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group by Today, Yesterday, Older
  const now = Date.now();
  const ONE_DAY = 24 * 60 * 60 * 1000;

  const pinnedSessions = filteredSessions.filter((s) => s.isPinned);
  const regularSessions = filteredSessions.filter((s) => !s.isPinned);

  const todaySessions = regularSessions.filter((s) => now - s.updatedAt < ONE_DAY);
  const olderSessions = regularSessions.filter((s) => now - s.updatedAt >= ONE_DAY);

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

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/20 backdrop-blur-xs md:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar Container */}
      <aside
        id="sidebar-navigation"
        className={`fixed md:static inset-y-0 left-0 z-40 w-72 bg-slate-50/90 border-r border-slate-200/80 flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0 md:w-0 md:opacity-0 md:pointer-events-none'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-200/70 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-sm shadow-indigo-500/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 tracking-tight">Omnisym</h1>
              <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-sm border border-indigo-100">
                Multi-Modal AI
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
        <div className="p-3 space-y-2 border-b border-slate-200/70">
          {/* New Chat Button */}
          <button
            type="button"
            id="new-chat-button"
            onClick={onNewChat}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-all active:scale-[0.98]"
            title="Start new conversation (Cmd/Ctrl + N)"
          >
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              <span>New Chat</span>
            </div>
            <kbd className="text-[10px] bg-indigo-700/80 px-1.5 py-0.5 rounded font-mono text-indigo-200">
              ⌘N
            </kbd>
          </button>

          {/* My Stuff Hub Shortcut */}
          <button
            type="button"
            id="open-my-stuff-sidebar-btn"
            onClick={onOpenMyStuff}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200/80 text-xs font-semibold text-slate-700 transition-colors shadow-2xs"
          >
            <div className="flex items-center gap-2">
              <Bookmark className="w-3.5 h-3.5 text-indigo-600" />
              <span>My Stuff</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-mono">
                {savedImagesCount + savedSnippetsCount}
              </span>
            </div>
          </button>

          {/* Search History */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Chat History List */}
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
          {/* Pinned Sessions */}
          {pinnedSessions.length > 0 && (
            <div>
              <div className="px-2 mb-1.5 flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <Pin className="w-3 h-3 text-indigo-500" />
                <span>Pinned</span>
              </div>
              <div className="space-y-1">
                {pinnedSessions.map((session) => renderSessionItem(session))}
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
                {todaySessions.map((session) => renderSessionItem(session))}
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
                {olderSessions.map((session) => renderSessionItem(session))}
              </div>
            </div>
          )}

          {filteredSessions.length === 0 && (
            <div className="p-4 text-center text-xs text-slate-400">
              No matching conversations found.
            </div>
          )}
        </div>

        {/* User Profile Footer */}
        <div className="p-3 border-t border-slate-200/80 bg-white relative">
          {showSettings && (
            <div className="absolute bottom-[110%] left-3 right-3 bg-white border border-slate-200 shadow-lg rounded-xl p-2 z-50">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-2">Settings</div>
              <button
                type="button"
                onClick={onToggleDarkMode}
                className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  {darkMode ? <Moon className="w-4 h-4 text-indigo-600" /> : <Sun className="w-4 h-4 text-amber-500" />}
                  <span className="text-xs font-semibold text-slate-700">Dark Mode</span>
                </div>
                <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${darkMode ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                  <div className={`w-3 h-3 bg-white rounded-full shadow-xs transition-transform ${darkMode ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
              </button>
            </div>
          )}

          <div className="flex items-center gap-1">
            <button
              type="button"
              id="user-profile-btn"
              onClick={onOpenAuth}
              className="flex-1 flex items-center justify-between p-2 rounded-xl hover:bg-slate-100 transition-colors text-left min-w-0"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-8 h-8 rounded-full object-cover border border-slate-200"
                />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">{currentUser.name}</p>
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
        </div>
      </aside>
    </>
  );

  function renderSessionItem(session: ChatSession) {
    const isSelected = currentSessionId === session.id;
    const isBeingDragged = draggedSessionId === session.id;
    const isDropTarget = dragOverSessionId === session.id;

    return (
      <div key={session.id} className="relative select-none">
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
          onClick={() => onSelectSession(session.id)}
          className={`group relative flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-all cursor-pointer ${
            isBeingDragged ? 'opacity-40 scale-[0.98] border-dashed border-indigo-300' : ''
          } ${
            isSelected
              ? 'bg-white text-indigo-900 font-semibold shadow-xs border border-slate-200/80'
              : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-900'
          }`}
          title="Drag to reorder conversation"
        >
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {/* Drag Grip Handle */}
            <div
              className="opacity-0 group-hover:opacity-60 hover:opacity-100 cursor-grab active:cursor-grabbing p-0.5 text-slate-400 hover:text-indigo-600 transition-opacity shrink-0"
              title="Drag to reorder"
            >
              <GripVertical className="w-3 h-3" />
            </div>

            <MessageSquare
              className={`w-3.5 h-3.5 shrink-0 ${
                isSelected ? 'text-indigo-600' : 'text-slate-400'
              }`}
            />
            <span className="truncate">{session.title || 'New Conversation'}</span>
          </div>

          {/* Action icons on hover */}
          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onTogglePinSession(session.id);
              }}
              className={`p-1 hover:text-indigo-600 rounded-md hover:bg-slate-100 ${
                session.isPinned ? 'text-indigo-600 opacity-100' : 'text-slate-400'
              }`}
              title={session.isPinned ? 'Unpin' : 'Pin to top'}
            >
              <Pin className="w-3 h-3" />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleStarSession(session.id);
              }}
              className={`p-1 hover:text-amber-500 rounded-md hover:bg-slate-100 ${
                session.isFavorite ? 'text-amber-500 opacity-100' : 'text-slate-400'
              }`}
              title={session.isFavorite ? 'Unfavorite' : 'Favorite'}
            >
              <Star className={`w-3 h-3 ${session.isFavorite ? 'fill-amber-400' : ''}`} />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteSession(session.id);
              }}
              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md"
              title="Delete conversation"
            >
              <Trash2 className="w-3 h-3" />
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
