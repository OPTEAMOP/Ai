import React, { useState } from 'react';
import {
  Menu,
  Sparkles,
  Bookmark,
  Trash2,
  Lock,
  Share2,
  User,
  Zap,
  FileDown,
  Check,
} from 'lucide-react';
import { ChatSession, UserProfile } from '../types';

interface HeaderProps {
  onToggleSidebar: () => void;
  currentSession: ChatSession | null;
  currentUser: UserProfile;
  onOpenMyStuff: () => void;
  onOpenAuth: () => void;
  onClearSession: () => void;
  onExportSession: () => void;
  onDownloadPdf?: () => void;
  savedItemsTotal: number;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  currentSession,
  currentUser,
  onOpenMyStuff,
  onOpenAuth,
  onClearSession,
  onExportSession,
  onDownloadPdf,
  savedItemsTotal,
}) => {
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const handlePdfClick = () => {
    if (!onDownloadPdf) return;
    setDownloadingPdf(true);
    try {
      onDownloadPdf();
    } finally {
      setTimeout(() => setDownloadingPdf(false), 1500);
    }
  };
  return (
    <header
      id="main-app-header"
      className="h-14 border-b border-slate-200/80 bg-white/95 backdrop-blur-md px-4 flex items-center justify-between z-20 shrink-0"
    >
      {/* Left side */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          id="toggle-sidebar-btn"
          onClick={onToggleSidebar}
          className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
          title="Toggle Sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
            <span>Omnisym</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              v2.5
            </span>
          </div>

          {currentSession?.isTemp && (
            <span className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold">
              <Lock className="w-3 h-3" /> Incognito Mode
            </span>
          )}
        </div>
      </div>

      {/* Center title (desktop) */}
      <div className="hidden md:block text-xs font-semibold text-slate-600 max-w-sm truncate">
        {currentSession ? currentSession.title : 'New Chat Session'}
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-2">
        {/* My Stuff Button */}
        <button
          type="button"
          id="header-my-stuff-btn"
          onClick={onOpenMyStuff}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors shadow-2xs"
          title="My Stuff: Saved Images, Code & Starred"
        >
          <Bookmark className="w-3.5 h-3.5 text-indigo-600" />
          <span className="hidden sm:inline">My Stuff</span>
          {savedItemsTotal > 0 && (
            <span className="text-[10px] font-mono bg-indigo-600 text-white px-1.5 py-0.2 rounded-full">
              {savedItemsTotal}
            </span>
          )}
        </button>

        {currentSession && currentSession.messages.length > 0 && (
          <>
            <button
              type="button"
              id="header-download-pdf-btn"
              onClick={handlePdfClick}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-xl transition-all text-xs font-semibold"
              title="Download chat conversation as formatted PDF"
            >
              {downloadingPdf ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="hidden sm:inline text-emerald-600">Saved PDF</span>
                </>
              ) : (
                <>
                  <FileDown className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="hidden sm:inline">Export PDF</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onExportSession}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
              title="Share / Copy Chat Transcript"
            >
              <Share2 className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onClearSession}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
              title="Clear Conversation"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </>
        )}

        {/* User profile avatar trigger */}
        <button
          type="button"
          id="header-user-avatar-btn"
          onClick={onOpenAuth}
          className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl hover:bg-slate-100 border border-slate-200 transition-colors"
        >
          <img
            src={currentUser.avatar}
            alt={currentUser.name}
            className="w-6 h-6 rounded-full object-cover"
          />
          <span className="text-xs font-bold text-slate-800 hidden sm:inline">
            {currentUser.name.split(' ')[0]}
          </span>
        </button>
      </div>
    </header>
  );
};
