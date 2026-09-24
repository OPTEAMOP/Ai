import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Send,
  Plus,
  Image as ImageIcon,
  Mic,
  MicOff,
  Sparkles,
  X,
  Sliders,
  Brain,
  Search,
  Code2,
  Lock,
  Unlock,
  ChevronDown,
  Camera,
  Layout,
} from 'lucide-react';
import { SlashCommandMenu } from './SlashCommandMenu';
import { SlashCommandInfo, SlashCommandType } from '../types';
import { safeLocalStorageGet, safeLocalStorageSet } from '../utils/storageUtils';

interface ChatInputProps {
  onSendMessage: (
    text: string,
    imageAttachment?: { dataUrl: string; mimeType: string; name?: string },
    options?: {
      mode?: SlashCommandType | 'default';
      aspectRatio?: string;
      imageSize?: string;
      thinking?: boolean;
    }
  ) => void;
  isLoading: boolean;
  activeMode: SlashCommandType | 'default';
  onChangeMode: (mode: SlashCommandType | 'default') => void;
  isTempSession?: boolean;
  isReadOnly?: boolean;
  onToggleReadOnly?: () => void;
  initialPrompt?: string;
  onClearInitialPrompt?: () => void;
  onOpenTemplates?: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  isLoading,
  activeMode,
  onChangeMode,
  isTempSession = false,
  isReadOnly = false,
  onToggleReadOnly,
  initialPrompt = '',
  onClearInitialPrompt,
  onOpenTemplates,
}) => {
  const [inputText, setInputText] = useState('');
  const [attachedImage, setAttachedImage] = useState<{
    dataUrl: string;
    mimeType: string;
    name?: string;
  } | null>(null);

  // Slash commands state
  const [isSlashMenuOpen, setIsSlashMenuOpen] = useState(false);
  const [slashFilter, setSlashFilter] = useState('');
  const [slashSelectedIndex, setSlashSelectedIndex] = useState(0);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [speechLang, setSpeechLang] = useState<'en-US' | 'hi-IN'>('en-US');

  // Settings & Image generation parameters with persistence
  const [showConfig, setShowConfig] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '16:9' | '9:16'>(() => {
    return safeLocalStorageGet<'1:1' | '16:9' | '9:16'>('omnisym_aspect_ratio', '1:1');
  });
  const [imageSize, setImageSize] = useState(() => {
    return safeLocalStorageGet<string>('omnisym_image_size', '1K');
  });
  const [thinkingEnabled, setThinkingEnabled] = useState(() => {
    return safeLocalStorageGet<boolean>('omnisym_thinking_enabled', false);
  });
  const [useSearchGrounding, setUseSearchGrounding] = useState(() => {
    return safeLocalStorageGet<boolean>('omnisym_search_grounding', false);
  });

  // Persist settings changes
  useEffect(() => {
    safeLocalStorageSet('omnisym_aspect_ratio', aspectRatio);
  }, [aspectRatio]);

  useEffect(() => {
    safeLocalStorageSet('omnisym_image_size', imageSize);
  }, [imageSize]);

  useEffect(() => {
    safeLocalStorageSet('omnisym_thinking_enabled', thinkingEnabled);
  }, [thinkingEnabled]);

  useEffect(() => {
    safeLocalStorageSet('omnisym_search_grounding', useSearchGrounding);
  }, [useSearchGrounding]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const originalTextRef = useRef<string>('');

  // Auto-fill prompt when passed from chips or remixes
  useEffect(() => {
    if (initialPrompt) {
      setInputText(initialPrompt);
      if (initialPrompt.startsWith('/code')) onChangeMode('code');
      else if (initialPrompt.startsWith('/research')) onChangeMode('research');
      else if (initialPrompt.startsWith('/3d')) onChangeMode('3d');
      else if (initialPrompt.startsWith('/human')) onChangeMode('human');
      else if (initialPrompt.startsWith('/temp')) onChangeMode('temp');

      if (textareaRef.current) {
        textareaRef.current.focus();
      }
      if (onClearInitialPrompt) onClearInitialPrompt();
    }
  }, [initialPrompt, onChangeMode, onClearInitialPrompt]);

  // Adjust textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      if (inputText) {
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
      }
    }
  }, [inputText]);

  // Handle Speech Recognition
  const toggleVoiceInput = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. You can type your query directly.');
      return;
    }

    if (isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = speechLang;

      originalTextRef.current = inputText;

      recognition.onstart = () => setIsRecording(true);
      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        const base = originalTextRef.current ? originalTextRef.current + ' ' : '';
        setInputText(base + currentTranscript);
      };
      recognition.onerror = (e: any) => {
        console.error('Speech error:', e);
        setIsRecording(false);
      };
      recognition.onend = () => setIsRecording(false);

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error(err);
      setIsRecording(false);
    }
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (PNG, JPEG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setAttachedImage({
          dataUrl: event.target.result as string,
          mimeType: file.type,
          name: file.name,
        });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setInputText(text);

    // Trigger slash command menu when typing /
    if (text.startsWith('/') && !text.includes(' ')) {
      setIsSlashMenuOpen(true);
      setSlashFilter(text);
      setSlashSelectedIndex(0);
    } else {
      setIsSlashMenuOpen(false);
    }
  };

  const handleSelectSlashCommand = (cmd: SlashCommandInfo) => {
    onChangeMode(cmd.type);
    setIsSlashMenuOpen(false);
    setInputText('');
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (isSlashMenuOpen) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSlashSelectedIndex((prev) => (prev + 1) % 5);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSlashSelectedIndex((prev) => (prev - 1 + 5) % 5);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsSlashMenuOpen(false);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (isReadOnly || (!inputText.trim() && !attachedImage) || isLoading) return;

    onSendMessage(inputText.trim(), attachedImage || undefined, {
      mode: activeMode,
      aspectRatio,
      imageSize,
      thinking: thinkingEnabled,
    });

    setInputText('');
    setAttachedImage(null);
    setIsSlashMenuOpen(false);
  };

  const isImageMode = activeMode === '3d' || inputText.toLowerCase().includes('generate image');

  return (
    <div 
      id="chat-input-container" 
      className="relative w-full max-w-4xl mx-auto px-4 z-40"
      style={{
        paddingBottom: 'calc(env(safe-area-inset-bottom, 20px) + 15px)',
        position: 'sticky',
        bottom: 'env(safe-area-inset-bottom, 0)',
        backgroundColor: 'transparent'
      }}
    >
      {/* Read-Only State Display */}
      {isReadOnly ? (
        <div
          id="chat-readonly-banner"
          className="flex items-center justify-between p-3 sm:px-4 sm:py-3 rounded-[24px] bg-zinc-50 border border-zinc-200 text-zinc-900 shadow-sm"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-white border border-zinc-200 flex items-center justify-center text-zinc-900 shrink-0 shadow-xs">
              <Lock className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-zinc-900 uppercase tracking-tighter">Read-Only Session</p>
              <p className="text-[10px] text-zinc-500 truncate font-medium">
                Further message input is disabled for this conversation.
              </p>
            </div>
          </div>
          {onToggleReadOnly && (
            <button
              type="button"
              id="chat-unlock-input-btn"
              onClick={onToggleReadOnly}
              className="ml-3 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-black text-white text-[10px] font-bold shadow-sm transition-all flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95 uppercase tracking-widest"
              title="Unlock conversation"
            >
              <Unlock className="w-3 h-3" />
              <span>Unlock</span>
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Slash Command Autocomplete Menu Popup */}
          <SlashCommandMenu
            isOpen={isSlashMenuOpen}
            filterText={slashFilter}
            selectedIndex={slashSelectedIndex}
            onSelect={handleSelectSlashCommand}
            onClose={() => setIsSlashMenuOpen(false)}
          />

          {/* Quick Command & Mode Bar */}
          <div className="flex items-center justify-between pb-1.5 px-2">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
              {activeMode !== 'default' && (
                <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-[11px] font-medium shrink-0">
                  <Sparkles className="w-3 h-3 text-indigo-600" />
                  <span className="capitalize font-mono">/{activeMode} active</span>
                  <button
                    type="button"
                    onClick={() => onChangeMode('default')}
                    className="hover:text-indigo-900 ml-0.5 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              {isTempSession && (
                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-900 text-[10px] font-bold shrink-0 uppercase tracking-widest">
                  <Lock className="w-3 h-3" /> Incognito
                </span>
              )}

              <button
                type="button"
                onClick={() => setIsSlashMenuOpen(!isSlashMenuOpen)}
                className="text-[11px] font-medium text-slate-400 hover:text-slate-700 flex items-center gap-1 px-2 py-0.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
              >
                <span className="font-mono bg-slate-100 px-1 rounded text-[10px] text-slate-600 font-bold">/</span>
                <span>Commands</span>
              </button>

              <button
                type="button"
                id="arsenal-trigger-btn"
                onClick={onOpenTemplates}
                className="text-[11px] font-medium text-slate-400 hover:text-slate-700 flex items-center gap-1 px-2 py-0.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
              >
                <Layout className="w-3 h-3" />
                <span>Library</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  const nextRatio = aspectRatio === '1:1' ? '16:9' : aspectRatio === '16:9' ? '9:16' : '1:1';
                  setAspectRatio(nextRatio);
                }}
                className={`p-1.5 rounded-lg transition-all flex items-center gap-1.5 border ${
                  aspectRatio !== '1:1' 
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm' 
                    : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100 border-transparent'
                }`}
                title={`Change Aspect Ratio (Current: ${aspectRatio})`}
              >
                <div className="flex items-center justify-center relative">
                  <Layout className="w-4 h-4" />
                  {aspectRatio !== '1:1' && (
                    <span className="absolute -top-1 -right-1 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-bold uppercase tracking-tighter">{aspectRatio}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowConfig(!showConfig)}
                className={`p-1 rounded-md transition-colors flex items-center gap-1 cursor-pointer ${
                  showConfig ? 'text-zinc-900 bg-zinc-100 border border-zinc-200 shadow-xs' : 'text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100'
                }`}
                title="Parameters"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span className="text-[10px] font-mono hidden sm:inline">{imageSize}</span>
              </button>

              <kbd
                className="hidden sm:inline-flex items-center text-[10px] text-slate-400 font-mono bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/60 cursor-pointer hover:bg-slate-200 transition-colors"
                onClick={() => textareaRef.current?.focus()}
                title="Focus input"
              >
                ⌘K
              </kbd>
            </div>
          </div>

          {/* Image Attachment Preview */}
          {attachedImage && (
            <div className="mb-2 p-2 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-2.5">
              <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-slate-200 shrink-0">
                <img
                  src={attachedImage.dataUrl}
                  alt="Upload preview"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setAttachedImage(null)}
                  className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-black/70 text-white hover:bg-black cursor-pointer"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
              <div className="flex-1 min-w-0 text-xs">
                <span className="font-semibold text-slate-800 truncate block text-[11px]">
                  {attachedImage.name || 'Attached Photo'}
                </span>
                <span className="text-slate-400 text-[10px]">
                  Omnisym vision analysis ready
                </span>
              </div>
            </div>
          )}

          {/* Sleek Pill Input Container */}
          <div
            className={`relative flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-[32px] bg-white dark:bg-zinc-900 border transition-all duration-300 shadow-lg hover:shadow-xl focus-within:shadow-2xl focus-within:border-indigo-500/50 ${
              isTempSession
                ? 'border-indigo-400 ring-4 ring-indigo-400/10'
                : 'border-slate-200 dark:border-zinc-800'
            }`}
          >
            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageFileChange}
            />

            {/* Plus (+) Button for Attachments */}
            <button
              type="button"
              id="upload-image-button"
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors shrink-0 cursor-pointer flex items-center justify-center"
              title="Attach image for vision (+)"
            >
              <Plus className="w-5 h-5" />
            </button>

            {/* Text Area */}
            <textarea
              ref={textareaRef}
              id="chat-textarea"
              rows={1}
              value={inputText}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              placeholder="Message Omnisym..."
              className="flex-1 bg-transparent resize-none focus:outline-hidden text-sm text-slate-800 placeholder:text-slate-400 py-1.5 px-1 leading-normal max-h-36 overflow-y-auto block font-sans"
            />

            {/* Voice Wave Animation */}
            {isRecording && (
              <div className="flex items-center justify-center gap-0.5 px-1 shrink-0">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={`recording-${i}`}
                    animate={{ height: ['4px', '14px', '4px'] }}
                    transition={{
                      duration: 0.6,
                      repeat: Infinity,
                      ease: 'easeInOut',
                      delay: i * 0.15,
                    }}
                    className="w-1 bg-zinc-900 rounded-full"
                    style={{ minHeight: '4px' }}
                  />
                ))}
              </div>
            )}

            {/* Language Selector Pill */}
            <div className="flex items-center bg-slate-100 hover:bg-slate-200/80 rounded-full px-2 py-0.5 shrink-0 transition-colors">
              <select
                value={speechLang}
                onChange={(e) => setSpeechLang(e.target.value as 'en-US' | 'hi-IN')}
                className="text-[11px] font-semibold text-slate-600 bg-transparent border-none outline-hidden cursor-pointer pr-0.5 appearance-none"
                title="Dictation Language"
              >
                <option value="en-US">EN</option>
                <option value="hi-IN">HI</option>
              </select>
            </div>

            {/* Voice Input Button */}
            <button
              type="button"
              id="voice-mic-button"
              onClick={toggleVoiceInput}
              className={`p-1.5 rounded-full transition-all shrink-0 cursor-pointer ${
                isRecording
                  ? 'bg-zinc-900 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100'
              }`}
              title={isRecording ? 'Stop Voice Recording' : 'Voice Input'}
            >
              {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            {/* Send Button */}
            <button
              type="button"
              id="send-message-button"
              onClick={handleSubmit}
              disabled={(!inputText.trim() && !attachedImage) || isLoading}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shrink-0 active:scale-95 shadow-xs ${
                isLoading 
                  ? 'bg-slate-100 text-slate-300 cursor-not-allowed' 
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer disabled:bg-slate-100 disabled:text-slate-300 disabled:cursor-not-allowed'
              }`}
              title={isLoading ? "Generation in progress..." : "Send Message"}
            >
              {isLoading ? (
                <div className="w-3.5 h-3.5 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

