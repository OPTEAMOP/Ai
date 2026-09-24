import React, { useState } from 'react';
import {
  Sparkles,
  Share2,
  Copy,
  Check,
  FileDown,
  ArrowRight,
  User,
  Bot,
  Calendar,
  MessageSquare,
  ExternalLink,
  Code2,
  Image as ImageIcon,
  CheckCircle2,
  Layers,
  Terminal,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import confetti from 'canvas-confetti';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { PublicShareData, Message } from '../types';
import { exportSessionToPdf } from '../utils/pdfExport';

interface PublicSharedChatViewProps {
  shareData: PublicShareData;
  onForkSession: (shareData: PublicShareData) => void;
  onGoToApp: () => void;
}

export const PublicSharedChatView: React.FC<PublicSharedChatViewProps> = ({
  shareData,
  onForkSession,
  onGoToApp,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [copiedSnippetId, setCopiedSnippetId] = useState<string | null>(null);

  const shareUrl = window.location.href;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      confetti({ particleCount: 25, spread: 45, origin: { y: 0.6 } });
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleDownloadPdf = () => {
    setDownloadingPdf(true);
    try {
      const mockSession: any = {
        id: shareData.shareId,
        title: shareData.title,
        createdAt: shareData.createdAt,
        updatedAt: shareData.createdAt,
        category: shareData.category,
        tags: shareData.tags,
        messages: shareData.messages,
      };
      exportSessionToPdf(mockSession, shareData.authorName || 'Omnisym User');
    } finally {
      setTimeout(() => setDownloadingPdf(false), 1500);
    }
  };

  const copyCode = (codeText: string, id: string) => {
    navigator.clipboard.writeText(codeText);
    setCopiedSnippetId(id);
    setTimeout(() => setCopiedSnippetId(null), 2000);
  };

  // Custom markdown renderer for public view
  const markdownComponents = {
    code({ node, inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      const codeString = String(children).replace(/\n$/, '');
      const snippetId = `pub_snip_${Math.random().toString(36).substring(2, 7)}`;

      if (!inline && (match || codeString.includes('\n'))) {
        const lang = match ? match[1] : 'text';
        const lineCount = codeString.split('\n').length;
        return (
          <div className="my-3 rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 text-slate-100 font-mono text-xs shadow-md">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 text-slate-400">
              <div className="flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
                  {lang}
                </span>
                <span className="text-[10px] text-slate-500 hidden sm:inline">
                  {lineCount} {lineCount === 1 ? 'line' : 'lines'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => copyCode(codeString, snippetId)}
                className="flex items-center gap-1 text-[11px] text-slate-300 hover:text-white px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                {copiedSnippetId === snippetId ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy Code</span>
                  </>
                )}
              </button>
            </div>
            <div className="overflow-x-auto text-[13px] leading-relaxed">
              <SyntaxHighlighter
                language={lang || 'text'}
                style={vscDarkPlus}
                showLineNumbers={lineCount > 3}
                lineNumberStyle={{
                  minWidth: '2.5em',
                  paddingRight: '1em',
                  color: '#64748b',
                  fontSize: '11px',
                  userSelect: 'none',
                }}
                customStyle={{
                  margin: 0,
                  padding: '1rem',
                  background: 'transparent',
                }}
                codeTagProps={{
                  style: {
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    fontSize: 'inherit',
                  },
                }}
              >
                {codeString}
              </SyntaxHighlighter>
            </div>
          </div>
        );
      }

      return (
        <code className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-mono text-xs" {...props}>
          {children}
        </code>
      );
    },
  };

  return (
    <div id="public-shared-chat-view" className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onGoToApp}
              className="flex items-center gap-2 font-bold text-slate-900 text-sm hover:opacity-80 transition-opacity"
            >
              <div className="w-8 h-8 bg-slate-200 flex items-center justify-center rounded-xl shadow-xs overflow-hidden border border-slate-200/50">
                <img 
                  src="https://cdn.discordapp.com/attachments/1539132081970487380/1539602344612859984/be47cfea-92be-4a5a-8ecd-5ee52daac97d.jpg?ex=6a86e9eb&is=6a85986b&hm=1a5c072856337920edbacbfefad54ffeb7c6a6d2d07ccea05948db5d586c7620&" 
                  alt="Omnisym Logo" 
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="hidden sm:inline">Omnisym</span>
            </button>

            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              Shared Snapshot
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all shadow-2xs"
              title="Copy share link to clipboard"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-600 hidden sm:inline">Link Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span className="hidden sm:inline">Copy Link</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all shadow-2xs"
              title="Export as formatted PDF"
            >
              {downloadingPdf ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-600 hidden sm:inline">Saved PDF</span>
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
              id="public-view-fork-chat-btn"
              onClick={() => onForkSession(shareData)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Continue in Omnisym</span>
              <ArrowRight className="w-3.5 h-3.5 hidden sm:inline" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Conversation Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 pb-28 space-y-6">
        {/* Title & Metadata Hero Card */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-lg bg-indigo-100/80 text-indigo-700">
              {shareData.category || 'Conversation'}
            </span>
            {shareData.tags?.map((tag, tIdx) => (
              <span key={`tag_${tag}_${tIdx}`} className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">
                #{tag}
              </span>
            ))}
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {shareData.title || 'Shared Conversation'}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1 border-t border-slate-100">
            <span className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-indigo-600" />
              <span>Shared by <strong>{shareData.authorName || 'Omnisym User'}</strong></span>
            </span>

            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{new Date(shareData.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
            </span>

            <span className="flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
              <span>{shareData.messages.length} messages</span>
            </span>
          </div>
        </div>

        {/* Message Stream */}
        <div className="space-y-6">
          {shareData.messages.map((message, index) => {
            const isUser = message.role === 'user';
            return (
              <div
                key={message.id ? `${message.id}_${index}` : `shared_msg_${index}`}
                className={`flex gap-3 sm:gap-4 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                    <Sparkles className="w-4 h-4" />
                  </div>
                )}

                <div className={`max-w-2xl w-full ${isUser ? 'flex justify-end' : ''}`}>
                  <div
                    className={`text-[14px] leading-[1.65] ${
                      isUser
                        ? 'bg-[#F3F4F6] text-slate-900 border border-slate-200/90 rounded-2xl p-4 shadow-2xs max-w-xl'
                        : 'bg-white border border-slate-200/90 rounded-3xl p-5 shadow-2xs w-full'
                    }`}
                  >
                    {/* User message */}
                    {isUser ? (
                      <div className="space-y-2">
                        {message.imageAttachment && (
                          <img
                            src={message.imageAttachment.dataUrl}
                            alt="Attachment"
                            className="max-h-60 rounded-xl object-contain bg-slate-900/10 mb-2"
                          />
                        )}
                        <p className="whitespace-pre-wrap">{message.text}</p>
                      </div>
                    ) : (
                      /* Assistant response */
                      <div className="space-y-3">
                        {/* Generated Image if present */}
                        {message.generatedImage && (
                          <div className="mb-3 rounded-2xl overflow-hidden border border-slate-200 bg-slate-950 p-1">
                            <img
                              src={message.generatedImage.url}
                              alt={message.generatedImage.prompt}
                              className="w-full max-h-96 object-contain rounded-xl"
                            />
                            <p className="p-2 text-xs text-slate-400 italic">
                              "{message.generatedImage.prompt}"
                            </p>
                          </div>
                        )}

                        <div className="markdown-body prose prose-slate max-w-none text-slate-900 leading-[1.65] font-normal prose-headings:font-semibold prose-headings:text-slate-900 prose-p:my-2 prose-p:leading-[1.65] prose-pre:my-3 prose-pre:p-0 prose-pre:bg-transparent">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={markdownComponents}
                          >
                            {message.text}
                          </ReactMarkdown>
                        </div>

                        {/* Citations if present */}
                        {message.citations && message.citations.length > 0 && (
                          <div className="pt-3 border-t border-slate-100 flex flex-wrap gap-2 text-xs">
                            <span className="font-semibold text-slate-500">Sources:</span>
                            {message.citations.map((cite, cIdx) => (
                              <a
                                key={`cite_${cIdx}_${cite.url || ''}`}
                                href={cite.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-indigo-600 hover:underline bg-indigo-50 px-2 py-0.5 rounded-md"
                              >
                                <span>{cite.title || cite.url}</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>

      {/* Sticky Bottom CTA bar */}
      <footer className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 sm:p-4 z-30 shadow-lg">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-xs text-slate-600 font-medium">
              Want to ask questions or build on top of this conversation?
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onGoToApp}
              className="flex-1 sm:flex-initial px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
            >
              Start New Chat
            </button>
            <button
              type="button"
              onClick={() => onForkSession(shareData)}
              className="flex-1 sm:flex-initial px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Continue this Chat in Omnisym</span>
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
