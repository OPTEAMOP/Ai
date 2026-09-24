import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

// Import only necessary languages for lightweight build
import tsx from 'react-syntax-highlighter/dist/esm/languages/prism/tsx';
import typescript from 'react-syntax-highlighter/dist/esm/languages/prism/typescript';
import javascript from 'react-syntax-highlighter/dist/esm/languages/prism/javascript';
import jsx from 'react-syntax-highlighter/dist/esm/languages/prism/jsx';
import python from 'react-syntax-highlighter/dist/esm/languages/prism/python';
import css from 'react-syntax-highlighter/dist/esm/languages/prism/css';
import json from 'react-syntax-highlighter/dist/esm/languages/prism/json';
import bash from 'react-syntax-highlighter/dist/esm/languages/prism/bash';
import markdown from 'react-syntax-highlighter/dist/esm/languages/prism/markdown';

SyntaxHighlighter.registerLanguage('tsx', tsx);
SyntaxHighlighter.registerLanguage('typescript', typescript);
SyntaxHighlighter.registerLanguage('javascript', javascript);
SyntaxHighlighter.registerLanguage('jsx', jsx);
SyntaxHighlighter.registerLanguage('python', python);
SyntaxHighlighter.registerLanguage('css', css);
SyntaxHighlighter.registerLanguage('json', json);
SyntaxHighlighter.registerLanguage('bash', bash);
SyntaxHighlighter.registerLanguage('markdown', markdown);

import {
  Sparkles,
  User,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Check,
  Volume2,
  VolumeX,
  RotateCw,
  Download,
  Bookmark,
  ExternalLink,
  Code2,
  Maximize2,
  Globe,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Terminal,
  Play,
  Eye,
  Clock,
  BookOpen,
} from 'lucide-react';
import { Message, SavedImage, SavedSnippet } from '../types';

interface ChatMessageProps {
  message: Message;
  userAvatar?: string;
  onLike: (id: string) => void;
  onDislike: (id: string) => void;
  onRegenerate?: (message: Message) => void;
  onSaveImage?: (img: SavedImage) => void;
  onSaveSnippet?: (snip: SavedSnippet) => void;
  isImageSaved?: boolean;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  userAvatar,
  onLike,
  onDislike,
  onRegenerate,
  onSaveImage,
  onSaveSnippet,
  isImageSaved,
}) => {
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinkingOpen, setIsThinkingOpen] = useState(false);
  const [previewImageModal, setPreviewImageModal] = useState<string | null>(null);
  const [codeSandboxModal, setCodeSandboxModal] = useState<{ code: string; lang: string } | null>(null);
  const [copiedCodeIndex, setCopiedCodeIndex] = useState<number | null>(null);
  const [savedSnippetIndexes, setSavedSnippetIndexes] = useState<Record<number, boolean>>({});
  const [collapsedCodeIndexes, setCollapsedCodeIndexes] = useState<Record<number, boolean>>({});
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const isUser = message.role === 'user';
  const hasComplexMarkdown = !isUser && (message.text.includes('```') || message.text.includes('##') || message.text.length > 400);

  // Strip internal trigger & memory tags for pristine display
  const fullText = message.text
    .replace(/\[(?:GENERATE_PICTURE|TRIGGER_IMAGE_GEN):\s*[^\]]+\]/gi, '')
    .replace(/\[SAVE_MEMORY:\s*[^\]]+\]/gi, '')
    .trim();

  // Typewriter effect logic
  useEffect(() => {
    if (isUser || message.status === 'error') {
      setDisplayedText(fullText);
      return;
    }

    // Only animate if it's a new message or status change
    if (message.status === 'done' && displayedText === '') {
      setIsTyping(true);
      let currentIndex = 0;
      const stepSize = Math.max(1, Math.floor(fullText.length / 50)); // Scale speed with length
      
      const interval = setInterval(() => {
        if (currentIndex < fullText.length) {
          setDisplayedText(fullText.slice(0, currentIndex + stepSize));
          currentIndex += stepSize;
        } else {
          setDisplayedText(fullText);
          setIsTyping(false);
          clearInterval(interval);
        }
      }, 10); // Very fast for smooth feel

      return () => clearInterval(interval);
    } else {
      setDisplayedText(fullText);
    }
  }, [fullText, isUser, message.status]);

  const [imageLoadError, setImageLoadError] = useState(false);
  const [mdImageErrors, setMdImageErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Reset image error states when message generatedImage changes
    setImageLoadError(false);
  }, [message.generatedImage?.url]);

  const handleCopyText = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleCopyCodeBlock = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeIndex(idx);
    setTimeout(() => setCopiedCodeIndex(null), 1800);
  };

  const handleToggleCodeCollapse = (idx: number) => {
    setCollapsedCodeIndexes((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleSaveCodeSnippet = (code: string, lang: string, idx: number) => {
    if (onSaveSnippet) {
      onSaveSnippet({
        id: `snip_${Date.now()}_${idx}`,
        title: `${lang.toUpperCase()} snippet from Omnisym`,
        language: lang || 'typescript',
        code,
        timestamp: Date.now(),
      });
      setSavedSnippetIndexes((prev) => ({ ...prev, [idx]: true }));
    }
  };

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleSpeak = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    // Cancel any previous speech playback across the page
    window.speechSynthesis.cancel();

    // Clean text for natural speech synthesis
    const cleanText = displayedText
      .replace(/```[\s\S]*?```/g, 'Code block omitted.')
      .replace(/\[(?:GENERATE_PICTURE|TRIGGER_IMAGE_GEN):\s*[^\]]+\]/gi, '')
      .replace(/\[SAVE_MEMORY:\s*[^\]]+\]/gi, '')
      .replace(/https?:\/\/\S+/g, 'link')
      .replace(/[*#_`>~]/g, '')
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    // Pick natural voice if available
    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      const naturalVoice = voices.find(
        (v) =>
          v.lang.startsWith('en') &&
          (v.name.includes('Natural') ||
            v.name.includes('Google') ||
            v.name.includes('Samantha') ||
            v.name.includes('Daniel') ||
            v.name.includes('Enhanced'))
      ) || voices.find((v) => v.lang.startsWith('en')) || voices[0];

      if (naturalVoice) {
        utterance.voice = naturalVoice;
      }
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = (e) => {
      console.warn('Speech synthesis error:', e);
      setIsSpeaking(false);
    };

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleDownloadImage = (url: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `omnisym_${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Strip internal trigger & memory tags for pristine display
  const displayText = message.text
    .replace(/\[(?:GENERATE_PICTURE|TRIGGER_IMAGE_GEN):\s*[^\]]+\]/gi, '')
    .replace(/\[SAVE_MEMORY:\s*[^\]]+\]/gi, '')
    .trim();

  // Reading time calculation (average 200 words per minute)
  const wordCount = fullText ? fullText.split(/\s+/).filter(Boolean).length : 0;
  const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));

  const markdownComponents = {
    // Collapsible details and summary elements
    details({ children, ...props }: any) {
      return (
        <details
          className="my-3 rounded-2xl border border-slate-200/90 bg-slate-50/80 p-3 text-sm transition-all open:bg-white open:shadow-xs group/details"
          {...props}
        >
          {children}
        </details>
      );
    },
    summary({ children, ...props }: any) {
      return (
        <summary
          className="cursor-pointer font-semibold text-slate-800 hover:text-indigo-600 list-none flex items-center justify-between gap-2 select-none py-1 px-1.5 rounded-lg hover:bg-slate-100/70 transition-colors"
          {...props}
        >
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
            <span className="text-slate-800 font-medium">{children}</span>
          </span>
          <ChevronDown className="w-4 h-4 text-slate-400 group-open/details:rotate-180 transition-transform duration-200 shrink-0" />
        </summary>
      );
    },
    // Enhanced Code Blocks with Syntax Highlighting, Collapse/Expand, and Actions
    code({ node, inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : 'text';
      const codeString = String(children).replace(/\n$/, '');

      if (!inline && (match || codeString.includes('\n'))) {
        const codeIdx = Math.abs(codeString.length * 31 + language.length);
        const isCopied = copiedCodeIndex === codeIdx;
        const isSaved = !!savedSnippetIndexes[codeIdx];
        const isCollapsed = !!collapsedCodeIndexes[codeIdx];
        const lineCount = codeString.split('\n').length;

        return (
          <div className="my-3 rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 text-slate-100 shadow-md">
            {/* Code Header */}
            <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 text-xs">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => handleToggleCodeCollapse(codeIdx)}
                  className="p-1 -ml-1 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition-colors flex items-center gap-1"
                  title={isCollapsed ? 'Expand code block' : 'Collapse code block'}
                >
                  {isCollapsed ? (
                    <ChevronRight className="w-3.5 h-3.5 text-indigo-400" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-indigo-400" />
                  )}
                </button>
                <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-mono font-semibold uppercase text-emerald-400 text-[11px]">
                  {language}
                </span>
                <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                  {lineCount} {lineCount === 1 ? 'line' : 'lines'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleCodeCollapse(codeIdx)}
                  className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono transition-colors"
                >
                  {isCollapsed ? 'Expand' : 'Collapse'}
                </button>

                {(language === 'html' || language === 'javascript' || language === 'jsx' || language === 'tsx') && (
                  <button
                    type="button"
                    onClick={() => setCodeSandboxModal({ code: codeString, lang: language })}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] transition-colors"
                    title="Preview output in sandbox"
                  >
                    <Play className="w-3 h-3 text-indigo-400" />
                    <span>Run</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleSaveCodeSnippet(codeString, language, codeIdx)}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] transition-colors ${
                    isSaved
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                  title="Save to My Stuff"
                >
                  <Bookmark className="w-3 h-3" />
                  <span>{isSaved ? 'Saved' : 'Save'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCopyCodeBlock(codeString, codeIdx)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] transition-colors"
                >
                  {isCopied ? (
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
              </div>
            </div>

            {/* Code Body (Collapsible) */}
            {!isCollapsed ? (
              <div className="overflow-x-auto bg-slate-950/90 text-[13px] leading-relaxed">
                <SyntaxHighlighter
                  language={language || 'text'}
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
            ) : (
              <button
                type="button"
                onClick={() => handleToggleCodeCollapse(codeIdx)}
                className="w-full py-2.5 px-4 text-left text-xs font-mono text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 transition-colors flex items-center justify-between"
              >
                <span>Code collapsed ({lineCount} lines)</span>
                <span className="text-indigo-400 text-[11px]">Click to view code ↓</span>
              </button>
            )}
          </div>
        );
      }

      return (
        <code
          className="px-1.5 py-0.5 rounded-md bg-slate-100 text-indigo-700 font-mono text-xs font-medium border border-slate-200"
          {...props}
        >
          {children}
        </code>
      );
    },
    // Safe image rendering with alt truncation, fallback box, and error handling
    img({ src, alt, ...props }: any) {
      const truncatedAlt = alt ? (alt.length > 30 ? `${alt.slice(0, 30)}...` : alt) : 'Generated AI Image';
      const imgSrcKey = src || 'empty_src';
      const hasError = mdImageErrors[imgSrcKey] || !src;

      if (hasError) {
        return (
          <div className="my-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-600 flex items-center gap-3 text-xs shadow-2xs">
            <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <p className="font-semibold text-slate-800">⚠️ Image generation failed or timed out. Please try again.</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{truncatedAlt}</p>
            </div>
          </div>
        );
      }

      return (
        <div className="my-3 rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-50 max-w-md">
          <img
            src={src}
            alt={truncatedAlt}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setMdImageErrors((prev) => ({ ...prev, [imgSrcKey]: true }))}
            className="w-full h-auto object-cover cursor-pointer hover:opacity-95 transition-opacity optimize-gpu"
            onClick={() => setPreviewImageModal(src)}
            {...props}
          />
        </div>
      );
    },
    p({ children, ...props }: any) {
      return <div {...props}>{children}</div>;
    },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`group w-full py-3 px-2 sm:px-4 rounded-2xl transition-colors ${
        isUser ? 'flex justify-end' : 'flex justify-start'
      }`}
      id={`message-${message.id}`}
    >
      <div className={`flex gap-3 max-w-4xl w-full ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        <div className="shrink-0 mt-0.5">
          {isUser ? (
            userAvatar ? (
              <img 
                src={userAvatar} 
                alt="User" 
                loading="lazy"
                decoding="async"
                className="avatar-circle shadow-xs border border-slate-200 optimize-gpu"
                style={{ width: '32px', height: '32px', minWidth: '32px', minHeight: '32px' }}
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center shadow-xs">
                <User className="w-4 h-4" />
              </div>
            )
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-sm shadow-indigo-500/20">
              <Sparkles className="w-4 h-4" />
            </div>
          )}
        </div>

        {/* Bubble & Content */}
        <div className={`flex-1 min-w-0 ${isUser ? 'items-end' : 'items-start'}`}>
          {/* Header info for assistant */}
          {!isUser && (
            <div className="flex items-center flex-wrap gap-2 mb-1.5 text-xs text-slate-700">
              <span className="font-semibold text-slate-900">Omnisym</span>
              {message.mode && message.mode !== 'default' && (
                <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 uppercase">
                  /{message.mode}
                </span>
              )}
              {message.timestamp && (
                <span className="text-[11px] text-[#9CA3AF] font-normal">
                  {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              {wordCount > 0 && (
                <span className="text-[11px] text-[#9CA3AF] font-normal">
                  · {readingTimeMinutes} min read
                </span>
              )}
            </div>
          )}

          {/* User message timestamp */}
          {isUser && message.timestamp && (
            <div className="flex justify-end mb-1 text-[11px] text-[#9CA3AF] font-normal">
              <span>{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          )}

          {/* Attached User Image Preview */}
          {message.imageAttachment && (
            <div className="mb-2 max-w-sm rounded-2xl overflow-hidden border border-slate-200 shadow-xs">
              <img
                src={message.imageAttachment.dataUrl}
                alt="Attached visual"
                loading="lazy"
                decoding="async"
                className="w-full h-auto max-h-64 object-cover cursor-pointer hover:opacity-95 optimize-gpu"
                onClick={() => setPreviewImageModal(message.imageAttachment!.dataUrl)}
              />
              <div className="px-3 py-1 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-500 font-mono">
                Multimodal Image Analysis
              </div>
            </div>
          )}

          {/* Thinking Process Accordion (if present) */}
          {message.thinkingProcess && message.thinkingProcess.length > 0 && (
            <div className="mb-2 rounded-xl bg-slate-50 border border-slate-200/80 overflow-hidden text-xs">
              <button
                type="button"
                onClick={() => setIsThinkingOpen(!isThinkingOpen)}
                className="w-full px-3 py-2 flex items-center justify-between text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
              >
                <div className="flex items-center gap-1.5 font-semibold">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Thinking & Reasoning Path</span>
                </div>
                {isThinkingOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
              {isThinkingOpen && (
                <div className="p-3 bg-white border-t border-slate-100 space-y-1 font-mono text-[11px] text-slate-600">
                  {message.thinkingProcess.map((step, idx) => (
                    <div key={`${message.id || 'msg'}_step_${idx}`} className="flex items-start gap-2">
                      <span className="text-indigo-400 font-bold">{idx + 1}.</span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Main Bubble Content */}
          <div
            className={`text-[15px] leading-[1.6] ${
              isUser
                ? 'bg-[var(--bg-bubble-user)] text-white border border-indigo-500/20 rounded-[24px] p-[16px_24px] shadow-lg shadow-indigo-500/10 ml-auto font-medium premium-shadow'
                : message.status === 'error'
                ? 'bg-amber-50/80 border border-amber-200 text-amber-950 rounded-[24px] p-[16px_24px] shadow-xs'
                : 'bg-transparent border-0 p-0 sm:p-4 text-[var(--text-primary)] font-normal'
            }`}
          >
            {isUser ? (
              <p className="whitespace-pre-wrap leading-[1.6] font-normal">{message.text}</p>
            ) : message.status === 'error' ? (
              <div className="space-y-2.5">
                <div className="flex items-start gap-2">
                  <div className="p-1 rounded-md bg-amber-200/60 text-amber-800 shrink-0 mt-0.5">
                    <RotateCw className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="font-semibold text-amber-900 text-xs">High Traffic & Demand Spike</p>
                    <p className="text-xs text-amber-800/90 mt-0.5">{displayedText}</p>
                  </div>
                </div>
                {onRegenerate && (
                  <button
                    type="button"
                    onClick={() => onRegenerate(message)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition-all active:scale-[0.98]"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Try Again</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="markdown-body prose prose-slate max-w-none text-[var(--text-primary)] leading-[1.6] font-normal prose-headings:font-semibold prose-headings:text-[var(--text-primary)] dark:prose-headings:text-white prose-p:my-4 prose-p:leading-[1.6] prose-strong:text-[var(--text-primary)] dark:prose-strong:text-white prose-pre:my-4 prose-pre:p-0 prose-pre:bg-transparent relative">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={markdownComponents}
                >
                  {displayedText}
                </ReactMarkdown>
                {isTyping && (
                  <motion.span
                    animate={{ opacity: [1, 0] }}
                    transition={{ repeat: Infinity, duration: 0.8 }}
                    className="inline-block w-1.5 h-4 bg-indigo-500 ml-1 translate-y-0.5"
                  />
                )}
              </div>
            )}

            {/* Generated Image Result Card */}
            {message.generatedImage && (
              <div className="mt-3 rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-50">
                {imageLoadError || !message.generatedImage.url ? (
                  <div className="p-5 bg-slate-50 border-b border-slate-200 text-slate-600 flex items-center gap-3 text-xs">
                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 shrink-0">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">
                        ⚠️ Image generation failed or timed out. Please try again.
                      </p>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {message.generatedImage.prompt ? message.generatedImage.prompt.slice(0, 30) + '...' : 'Generated AI Image'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div 
                    className={`relative group/img mx-auto bg-slate-100 cursor-pointer overflow-hidden ${
                      message.generatedImage.aspectRatio === '16:9' 
                        ? 'aspect-video max-w-2xl' 
                        : message.generatedImage.aspectRatio === '9:16'
                        ? 'aspect-[9/16] max-w-xs'
                        : 'aspect-square max-w-md'
                    }`}
                  >
                    <img
                      src={message.generatedImage.url}
                      alt={
                        message.generatedImage.prompt
                          ? message.generatedImage.prompt.length > 30
                            ? `${message.generatedImage.prompt.slice(0, 30)}...`
                            : message.generatedImage.prompt
                          : 'Generated AI Image'
                      }
                      referrerPolicy="no-referrer"
                      onError={() => setImageLoadError(true)}
                      className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300"
                      onClick={() => setPreviewImageModal(message.generatedImage!.url)}
                    />
                    <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-xs text-white text-[10px] font-mono px-2 py-0.5 rounded-md">
                      {message.generatedImage.aspectRatio} · {message.generatedImage.imageSize}
                    </div>
                  </div>
                )}

                <div className="p-3 bg-white border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-600 font-medium line-clamp-1">
                    {message.generatedImage.prompt ? (message.generatedImage.prompt.length > 60 ? `${message.generatedImage.prompt.slice(0, 60)}...` : message.generatedImage.prompt) : 'Generated Image'}
                  </span>

                  {!imageLoadError && message.generatedImage.url && (
                    <div className="flex items-center gap-1.5">
                      {onSaveImage && (
                        <button
                          type="button"
                          onClick={() =>
                            onSaveImage({
                              id: `img_${Date.now()}`,
                              url: message.generatedImage!.url,
                              prompt: message.generatedImage!.prompt,
                              timestamp: Date.now(),
                              aspectRatio: message.generatedImage!.aspectRatio,
                              imageSize: message.generatedImage!.imageSize,
                            })
                          }
                          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold ${
                            isImageSaved
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-100'
                          }`}
                        >
                          <Bookmark className="w-3 h-3" />
                          <span>{isImageSaved ? 'Saved' : 'Save to My Stuff'}</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDownloadImage(message.generatedImage!.url)}
                        className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg"
                        title="Download image"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setPreviewImageModal(message.generatedImage!.url)}
                        className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg"
                        title="Fullscreen"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Web Search Citations */}
            {message.citations && message.citations.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-2">
                  <Globe className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Verified Omnisym Search Grounding ({message.citations.length})</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {message.citations.map((cite, idx) => (
                    <a
                      key={`${message.id || 'msg'}_cite_${idx}`}
                      href={cite.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50/70 hover:bg-indigo-100 border border-indigo-100 text-[11px] font-medium text-indigo-700 transition-colors"
                    >
                      <span className="truncate max-w-[180px]">{cite.title || cite.url}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Small Metadata Tag below long AI responses */}
            {!isUser && wordCount >= 60 && (
              <div className="mt-3 pt-2.5 border-t border-slate-100/90 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Clock className="w-3 h-3 text-indigo-500" />
                  <span>Estimated reading time: {readingTimeMinutes} min read</span>
                </div>
                <span>{wordCount} words</span>
              </div>
            )}
          </div>

          {/* Action Toolbar for Omnisym response */}
          {!isUser && (
            <div className="flex items-center gap-4 mt-2">
              {/* Like */}
              <button
                type="button"
                id={`like-btn-${message.id}`}
                onClick={() => onLike(message.id)}
                className={`p-1.5 rounded-md hover:bg-gray-100 transition-colors flex items-center justify-center cursor-pointer ${
                  message.reaction === 'like' ? 'text-emerald-600' : 'text-[#6B7280] hover:text-[#111827]'
                }`}
                title="Good response"
              >
                <ThumbsUp className="w-4 h-4 stroke-[1.5]" />
              </button>

              {/* Dislike (triggers Feedback Modal) */}
              <button
                type="button"
                id={`dislike-btn-${message.id}`}
                onClick={() => onDislike(message.id)}
                className={`p-1.5 rounded-md hover:bg-gray-100 transition-colors flex items-center justify-center cursor-pointer ${
                  message.reaction === 'dislike' ? 'text-rose-600' : 'text-[#6B7280] hover:text-[#111827]'
                }`}
                title="Dislike response"
              >
                <ThumbsDown className="w-4 h-4 stroke-[1.5]" />
              </button>

              {/* Copy */}
              <button
                type="button"
                onClick={handleCopyText}
                className="p-1.5 rounded-md hover:bg-gray-100 text-[#6B7280] hover:text-[#111827] transition-colors flex items-center justify-center cursor-pointer"
                title="Copy response"
              >
                {copied ? (
                  <Check className="w-4 h-4 stroke-[1.5] text-emerald-600" />
                ) : (
                  <Copy className="w-4 h-4 stroke-[1.5]" />
                )}
              </button>

              {/* Listen Button (Single naked Volume/Speaker icon) */}
              <button
                type="button"
                id={`listen-btn-${message.id}`}
                onClick={handleSpeak}
                className={`p-1.5 rounded-md hover:bg-gray-100 transition-colors flex items-center justify-center cursor-pointer ${
                  isSpeaking ? 'text-indigo-600' : 'text-[#6B7280] hover:text-[#111827]'
                }`}
                title={isSpeaking ? 'Stop listening' : 'Listen to response'}
              >
                {isSpeaking ? (
                  <VolumeX className="w-4 h-4 stroke-[1.5]" />
                ) : (
                  <Volume2 className="w-4 h-4 stroke-[1.5]" />
                )}
              </button>

              {/* Regenerate / Reload */}
              {onRegenerate && (
                <button
                  type="button"
                  onClick={() => onRegenerate(message)}
                  className="p-1.5 rounded-md hover:bg-gray-100 text-[#6B7280] hover:text-[#111827] transition-colors flex items-center justify-center cursor-pointer"
                  title="Regenerate response"
                >
                  <RotateCw className="w-4 h-4 stroke-[1.5]" />
                </button>
              )}

              {/* Focus Mode Toggle */}
              {hasComplexMarkdown && (
                <button
                  type="button"
                  onClick={() => setIsFocusMode(true)}
                  className="p-1.5 rounded-md hover:bg-gray-100 text-[#6B7280] hover:text-[#111827] transition-colors flex items-center justify-center cursor-pointer"
                  title="Read in Focus View"
                >
                  <Eye className="w-4 h-4 stroke-[1.5]" />
                </button>
              )}

              {message.feedbackSubmitted && (
                <span className="text-[11px] text-emerald-600 font-normal">
                  Feedback recorded
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox Zoom Modal */}
      {previewImageModal && (
        <div
          className="fixed inset-0 z-[200] bg-black/85 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setPreviewImageModal(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <img src={previewImageModal} alt="Preview" className="max-w-full max-h-[85vh] object-contain rounded-xl" />
            <div className="absolute top-3 right-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleDownloadImage(previewImageModal)}
                className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg shadow-md flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Download
              </button>
              <button
                type="button"
                onClick={() => setPreviewImageModal(null)}
                className="p-1.5 bg-slate-900/80 text-white rounded-lg hover:bg-slate-900"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Code Sandbox Modal */}
      {codeSandboxModal && (
        <div
          className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setCodeSandboxModal(null)}
        >
          <div
            className="w-full max-w-3xl bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-200 flex flex-col h-[75vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-3 bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <Play className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-semibold">Live Sandbox Runner</span>
              </div>
              <button
                type="button"
                onClick={() => setCodeSandboxModal(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 p-4 bg-slate-50 overflow-auto">
              <iframe
                title="Code Sandbox"
                sandbox="allow-scripts"
                srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"/><style>body{font-family:system-ui,sans-serif;padding:16px;color:#1e293b;}</style></head><body>${codeSandboxModal.code}</body></html>`}
                className="w-full h-full bg-white rounded-xl border border-slate-200 shadow-inner"
              />
            </div>
          </div>
        </div>
      )}

      {/* Focus Mode Modal */}
      {isFocusMode && (
        <div
          className="fixed inset-0 z-60 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
          onClick={() => setIsFocusMode(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-4xl max-h-[90vh] bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-200 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2 text-indigo-600">
                <Eye className="w-5 h-5" />
                <span className="text-sm font-bold">Focus View</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSpeak}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    isSpeaking
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600'
                  }`}
                  title={isSpeaking ? 'Stop listening' : 'Listen aloud'}
                >
                  {isSpeaking ? (
                    <>
                      <VolumeX className="w-3.5 h-3.5 text-white" />
                      <span>Stop Listening</span>
                      <span className="flex items-center gap-0.5 ml-0.5">
                        <span className="w-0.5 h-2 bg-white rounded-full animate-bounce [animation-delay:0ms]" />
                        <span className="w-0.5 h-3 bg-white rounded-full animate-bounce [animation-delay:150ms]" />
                        <span className="w-0.5 h-2 bg-white rounded-full animate-bounce [animation-delay:300ms]" />
                      </span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Listen Aloud</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setIsFocusMode(false)}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 sm:p-10 bg-slate-50">
              <div className="max-w-3xl mx-auto markdown-body prose prose-slate prose-lg max-w-none text-slate-800 prose-p:my-4 prose-pre:my-6 prose-pre:p-0 prose-pre:bg-transparent">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={markdownComponents}
                >
                  {displayedText}
                </ReactMarkdown>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};
