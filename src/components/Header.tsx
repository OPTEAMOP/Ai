import React, { useState } from 'react';
import {
  Menu,
  Sparkles,
  Bookmark,
  Trash2,
  Lock,
  Unlock,
  Archive,
  ArchiveRestore,
  Share2,
  User,
  Zap,
  FileDown,
  Check,
  PartyPopper,
  Crown,
  FileCode,
} from 'lucide-react';
import { ChatSession, UserProfile, UserSubscription } from '../types';
import { CATEGORY_META, SessionCategory } from '../utils/categorizer';
import { getUserAvatar, getUserDisplayName } from '../utils/userUtils';

interface HeaderProps {
  onToggleSidebar: () => void;
  currentSession: ChatSession | null;
  currentUser: UserProfile;
  subscription?: UserSubscription;
  onOpenSubscription?: () => void;
  onOpenLiveSandbox?: () => void;
  onOpenMyStuff: () => void;
  onOpenAuth: () => void;
  onClearSession: () => void;
  onExportSession: () => void;
  onDownloadPdf?: () => void;
  onOpenShare?: () => void;
  onToggleReadOnly?: () => void;
  onToggleArchive?: () => void;
  onCelebrate?: () => void;
  savedItemsTotal: number;
  isSyncPaused?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  currentSession,
  currentUser,
  subscription,
  onOpenSubscription,
  onOpenLiveSandbox,
  onOpenMyStuff,
  onOpenAuth,
  onClearSession,
  onExportSession,
  onDownloadPdf,
  onOpenShare,
  onToggleReadOnly,
  onToggleArchive,
  onCelebrate,
  savedItemsTotal,
  isSyncPaused,
}) => {
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const isPro = subscription?.isPro;
  const isCreator = isPro && (subscription?.tier === 'creator' || subscription?.tier === 'student');

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
      className="h-14 border-b border-slate-200/80 bg-white/95 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between z-[40] shrink-0 shadow-sm"
    >
      {/* Left side */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          id="toggle-sidebar-btn"
          onClick={onToggleSidebar}
          className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100/80 transition-colors cursor-pointer"
          title="Toggle Sidebar"
        >
          <Menu className="w-5 h-5 stroke-[1.5]" />
        </button>

        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-900 text-sm tracking-tight">Omnisym</span>

          {/* Pro / Student / Creator Status Pill in Header */}
          {isPro ? (
            <button
              type="button"
              id="header-pro-status-badge"
              onClick={onOpenSubscription}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase bg-[#1e293b] text-amber-500 border border-slate-700 hover:border-amber-500/50 shadow-sm transition-all active:scale-95 cursor-pointer"
              title="Click to view Pro Subscription details"
            >
              <Crown className="w-3 h-3 text-[#f59e0b]" />
              <span>
                {subscription?.tier === 'student'
                  ? 'Student Pass'
                  : subscription?.tier === 'creator'
                  ? 'Creator Pass'
                  : 'Pro Active'}
              </span>
            </button>
          ) : (
            <button
              type="button"
              id="header-upgrade-pro-btn"
              onClick={onOpenSubscription}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all active:scale-95 cursor-pointer"
              title="Upgrade to Omnisym Pro"
            >
              <Sparkles className="w-3 h-3 text-white" />
              <span>Upgrade</span>
            </button>
          )}

          {currentSession?.isTemp && (
            <span className="hidden sm:flex items-center gap-1 text-[11px] font-bold text-zinc-900 bg-zinc-100 px-2 py-0.5 rounded-full border border-zinc-200">
              <Lock className="w-3 h-3 stroke-[2]" /> INCOGNITO
            </span>
          )}

          {currentSession?.isArchived && (
            <span className="hidden sm:flex items-center gap-1 text-[11px] font-bold text-zinc-500 bg-zinc-50 px-2 py-0.5 rounded-full border border-zinc-100">
              <Archive className="w-3 h-3 stroke-[2]" /> ARCHIVED
            </span>
          )}

          {isSyncPaused && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-zinc-900 bg-zinc-100 px-1.5 py-0.5 rounded uppercase tracking-widest border border-zinc-200">
              <Zap className="w-2.5 h-2.5 fill-zinc-900" /> SYNC PAUSED
            </span>
          )}
        </div>
      </div>

      {/* Centre title and category (desktop) */}
      <div className="hidden md:flex items-center gap-2 max-w-md">
        <span className="text-xs font-medium text-slate-600 dark:text-slate-300 truncate">
          {currentSession ? currentSession.title : 'New Chat'}
        </span>
      </div>

      {/* Right side utility area */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Creator Sandbox Shortcut Button */}
        {onOpenLiveSandbox && (
          <button
            type="button"
            id="header-sandbox-btn"
            onClick={onOpenLiveSandbox}
            className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 p-1.5 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold cursor-pointer"
            title="Open Sandbox"
          >
            <FileCode className="w-4 h-4" />
            <span className="hidden lg:inline text-[10px] uppercase tracking-widest">Sandbox</span>
          </button>
        )}

        {/* Floating v2.5 Text */}
        <span className="hidden sm:inline text-xs font-normal text-[#6B7280] select-none">
          v2.5
        </span>

        {/* Lock / Read-Only Toggle */}
        {currentSession && onToggleReadOnly && (
          <button
            type="button"
            id="header-readonly-toggle-btn"
            onClick={onToggleReadOnly}
            className="text-[#4B5563] hover:text-[#111827] p-1 transition-colors flex items-center justify-center cursor-pointer"
            title={
              currentSession.isReadOnly
                ? 'Read-Only Mode: Messaging is locked. Click to enable input.'
                : 'Enable Read-Only mode for this session.'
            }
          >
            {currentSession.isReadOnly ? (
              <Lock className="w-[18px] h-[18px] stroke-[1.5] text-amber-600" />
            ) : (
              <Unlock className="w-[18px] h-[18px] stroke-[1.5]" />
            )}
          </button>
        )}

        {/* Share Button (Minimalist SVG icon only, no text, 18px stroke-1.5) */}
        {currentSession && currentSession.messages.length > 0 && (
          <button
            type="button"
            id="header-share-btn"
            onClick={onOpenShare || onExportSession}
            className="text-[#4B5563] hover:text-[#111827] p-1 transition-colors flex items-center justify-center cursor-pointer"
            title="Share conversation link"
          >
            <Share2 className="w-[18px] h-[18px] stroke-[1.5]" />
          </button>
        )}

        {/* Celebrate / Confetti Party Button */}
        {onCelebrate && (
          <button
            type="button"
            id="header-celebrate-btn"
            onClick={onCelebrate}
            className="text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 p-1.5 rounded-lg transition-colors flex items-center justify-center cursor-pointer active:scale-90"
            title="Celebrate"
          >
            <PartyPopper className="w-[18px] h-[18px] stroke-[1.5]" />
          </button>
        )}

        {/* My Stuff Shortcut */}
        <button
          type="button"
          id="header-my-stuff-btn"
          onClick={onOpenMyStuff}
          className="text-[#4B5563] hover:text-[#111827] p-1 transition-colors relative flex items-center justify-center cursor-pointer"
          title="My Stuff: Saved Images, Snippets & Starred"
        >
          <Bookmark className="w-[18px] h-[18px] stroke-[1.5]" />
          {savedItemsTotal > 0 && (
            <span className="absolute -top-1 -right-1.5 w-3.5 h-3.5 rounded-full bg-slate-900 text-white text-[9px] font-mono flex items-center justify-center">
              {savedItemsTotal}
            </span>
          )}
        </button>

        {currentSession && currentSession.messages.length > 0 && (
          <>
            {/* Download PDF */}
            <button
              type="button"
              id="header-download-pdf-btn"
              onClick={handlePdfClick}
              className="text-[#4B5563] hover:text-[#111827] p-1 transition-colors flex items-center justify-center cursor-pointer"
              title="Download chat conversation as formatted PDF"
            >
              {downloadingPdf ? (
                <Check className="w-[18px] h-[18px] stroke-[1.5] text-emerald-600" />
              ) : (
                <FileDown className="w-[18px] h-[18px] stroke-[1.5]" />
              )}
            </button>

            {/* Clear Chat */}
            <button
              type="button"
              id="header-clear-chat-btn"
              onClick={onClearSession}
              className="text-[#4B5563] hover:text-rose-600 p-1 transition-colors flex items-center justify-center cursor-pointer"
              title="Clear Conversation"
            >
              <Trash2 className="w-[18px] h-[18px] stroke-[1.5]" />
            </button>
          </>
        )}

        {/* User profile avatar trigger */}
        <button
          type="button"
          id="header-user-avatar-btn"
          onClick={onOpenAuth}
          className="hover:opacity-80 transition-opacity flex items-center shrink-0 cursor-pointer group/header-user"
          title={getUserDisplayName(currentUser)}
        >
          <img
            src={getUserAvatar(currentUser)}
            alt={getUserDisplayName(currentUser)}
            className="avatar-circle border border-slate-200 group-hover/header-user:border-indigo-500 transition-colors"
            style={{ width: '40px', height: '40px', minWidth: '40px', minHeight: '40px' }}
          />
        </button>
      </div>
    </header>
  );
};

