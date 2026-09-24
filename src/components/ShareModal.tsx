import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Share2,
  Copy,
  Check,
  ExternalLink,
  Globe,
  FileText,
  Sparkles,
  Lock,
  MessageSquare,
  Send,
  Calendar,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ChatSession, UserProfile, PublicShareData } from '../types';
import { savePublicShareToCloud } from '../lib/firestoreUtils';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: ChatSession | null;
  currentUser: UserProfile;
  onUpdateSessionShareId?: (sessionId: string, shareId: string) => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  session,
  currentUser,
  onUpdateSessionShareId,
}) => {
  const [shareId, setShareId] = useState<string>('');
  const [shareUrl, setShareUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isCopiedMarkdown, setIsCopiedMarkdown] = useState<boolean>(false);
  const [isUpdated, setIsUpdated] = useState<boolean>(false);

  const publishSnapshot = async (targetShareId: string) => {
    if (!session) return;
    try {
      setIsGenerating(true);
      const generatedUrl = `${window.location.origin}${window.location.pathname}?share=${targetShareId}`;
      const shareData: PublicShareData = {
        shareId: targetShareId,
        authorId: currentUser.id,
        authorName: currentUser.displayName || currentUser.name || 'Omnisym User',
        title: session.title || 'Untitled Conversation',
        category: session.category || 'General',
        tags: session.tags || [],
        messages: session.messages,
        createdAt: Date.now(),
        viewCount: 1,
        shareUrl: generatedUrl,
      };
      await savePublicShareToCloud(shareData);
      setShareUrl(generatedUrl);
      if (onUpdateSessionShareId) {
        onUpdateSessionShareId(session.id, targetShareId);
      }
    } catch (err) {
      console.warn('Could not sync share record to cloud:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !session) return;

    // Use existing shareId if already published once, or generate deterministic session-linked token
    const uniqueId =
      session.shareId ||
      `omni_${session.id.replace('session_', '').replace(/[^a-zA-Z0-9]/g, '')}_${session.createdAt.toString(36)}`;
    setShareId(uniqueId);

    const generatedUrl = `${window.location.origin}${window.location.pathname}?share=${uniqueId}`;
    setShareUrl(generatedUrl);
    setIsCopied(false);
    setIsCopiedMarkdown(false);
    setIsUpdated(false);

    // Save/Update public share snapshot
    publishSnapshot(uniqueId);
  }, [isOpen, session?.id, session?.messages.length]);

  if (!isOpen || !session) return null;

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setIsCopied(true);
      confetti({ particleCount: 25, spread: 45, origin: { y: 0.6 } });
      setTimeout(() => setIsCopied(false), 2500);
    } catch {
      // fallback
    }
  };

  const handleCopyMarkdown = async () => {
    if (!session) return;
    const author = currentUser.displayName || currentUser.name || 'User';
    const transcript = [
      `# ${session.title || 'Omnisym Conversation'}`,
      `*Shared by ${author} on ${new Date().toLocaleDateString()}*`,
      '',
      ...session.messages.map((m) => {
        const sender = m.role === 'user' ? author : 'Omnisym AI';
        return `### ${sender} (${new Date(m.timestamp).toLocaleTimeString()})\n\n${m.text}\n`;
      }),
      '---',
      `*Generated with [Omnisym AI Workspace](${window.location.origin})*`,
    ].join('\n\n');

    try {
      await navigator.clipboard.writeText(transcript);
      setIsCopiedMarkdown(true);
      setTimeout(() => setIsCopiedMarkdown(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share && shareUrl) {
      try {
        await navigator.share({
          title: `${session.title} - Omnisym AI Conversation`,
          text: `Check out this conversation with Omnisym AI: "${session.title}"`,
          url: shareUrl,
        });
      } catch {
        // user dismissed
      }
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          id="share-chat-modal"
          className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden"
        >
          {/* Top Banner & Close */}
          <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-xs">
                <Share2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">Share Conversation</h3>
                <p className="text-xs text-slate-500">Generate a unique public link to view this chat history</p>
              </div>
            </div>

            <button
              type="button"
              id="close-share-modal-btn"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            {/* Session Preview Card */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-100/80 text-indigo-700">
                      {session.category || 'Conversation'}
                    </span>
                    {session.mode && (
                      <span className="text-[10px] text-slate-400 font-mono">
                        /{session.mode}
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-semibold text-slate-900 truncate">
                    {session.title || 'Current Conversation'}
                  </h4>
                </div>

                <div className="flex items-center gap-2 shrink-0 text-xs text-slate-500 font-medium">
                  <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                  <span>{session.messages.length} messages</span>
                </div>
              </div>
            </div>

            {/* Public Link Box */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Public View Link</span>
                </span>
                {isGenerating && (
                  <span className="text-[11px] text-indigo-600 animate-pulse font-normal">
                    Syncing public snapshot...
                  </span>
                )}
              </label>

              <div className="flex items-center gap-2 p-1.5 bg-slate-100/80 border border-slate-200 rounded-2xl focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  id="public-share-url-input"
                  className="flex-1 px-3 py-1.5 text-xs text-slate-700 bg-transparent font-mono outline-hidden select-all"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />

                <button
                  type="button"
                  id="copy-share-link-btn"
                  onClick={handleCopyLink}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold shadow-xs transition-all ${
                    isCopied
                      ? 'bg-emerald-600 text-white'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Action Row */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <a
                href={shareUrl}
                target="_blank"
                rel="noopener noreferrer"
                id="open-shared-chat-link"
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                <span>Open in New Tab</span>
              </a>

              <button
                type="button"
                id="republish-share-snapshot-btn"
                disabled={isGenerating}
                onClick={async () => {
                  if (shareId) {
                    await publishSnapshot(shareId);
                    setIsUpdated(true);
                    setTimeout(() => setIsUpdated(false), 2500);
                  }
                }}
                className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-medium transition-all ${
                  isUpdated
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700 font-semibold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
                title="Update this public link with latest conversation messages"
              >
                {isUpdated ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Updated Live!</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                    <span>{isGenerating ? 'Updating...' : 'Update Snapshot'}</span>
                  </>
                )}
              </button>
            </div>

            {/* Markdown Transcript Export Button */}
            <button
              type="button"
              id="copy-markdown-transcript-btn"
              onClick={handleCopyMarkdown}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-slate-200/80 hover:bg-slate-50 text-slate-600 text-xs font-medium transition-colors"
            >
              {isCopiedMarkdown ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-600">Copied Markdown!</span>
                </>
              ) : (
                <>
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  <span>Copy Full Markdown Transcript</span>
                </>
              )}
            </button>

            {/* Native Mobile Share if available */}
            {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
              <button
                type="button"
                onClick={handleNativeShare}
                className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-xl transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Share via other apps...</span>
              </button>
            )}

            {/* Privacy note */}
            <div className="pt-2 border-t border-slate-100 flex items-start gap-2 text-[11px] text-slate-500 leading-relaxed">
              <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              <span>
                Anyone with this link can view this read-only snapshot. Sensitive personal credentials or workspace settings remain private.
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
