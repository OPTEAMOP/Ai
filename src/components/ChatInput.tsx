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
  ChevronDown,
  Camera,
  Layout,
} from 'lucide-react';
import { SlashCommandMenu } from './SlashCommandMenu';
import { SlashCommandInfo, SlashCommandType } from '../types';

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

  // Settings & Image generation parameters
  const [showConfig, setShowConfig] = useState(false);
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [imageSize, setImageSize] = useState('1K');
  const [thinkingEnabled, setThinkingEnabled] = useState(false);
  const [useSearchGrounding, setUseSearchGrounding] = useState(false);

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
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
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
    if ((!inputText.trim() && !attachedImage) || isLoading) return;

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
    <div id="chat-input-container" className="relative w-full max-w-4xl mx-auto px-2 sm:px-4 pb-4">
      {/* Slash Command Autocomplete Menu */}
      <SlashCommandMenu
        isOpen={isSlashMenuOpen}
        filterText={slashFilter}
        selectedIndex={slashSelectedIndex}
        onSelect={handleSelectSlashCommand}
        onClose={() => setIsSlashMenuOpen(false)}
      />

      {/* Advanced Model & Resolution Config Drawer */}
      {showConfig && (
        <div
          id="generation-config-drawer"
          className="mb-3 p-3.5 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-lg flex flex-wrap items-center justify-between gap-4 text-xs"
        >
          {/* Image Aspect Ratio */}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Aspect Ratio:</span>
            {['1:1', '16:9', '9:16', '4:3'].map((ratio) => (
              <button
                key={ratio}
                type="button"
                onClick={() => setAspectRatio(ratio)}
                className={`px-2.5 py-1 rounded-lg font-mono font-medium transition-all ${
                  aspectRatio === ratio
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {ratio}
              </button>
            ))}
          </div>

          {/* Image Size (1K, 2K, 4K) */}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Resolution:</span>
            {['1K', '2K', '4K'].map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setImageSize(size)}
                className={`px-2.5 py-1 rounded-lg font-mono font-medium transition-all ${
                  imageSize === size
                    ? 'bg-sky-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {size}
              </button>
            ))}
          </div>

          {/* Thinking Toggle */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setThinkingEnabled(!thinkingEnabled)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-semibold transition-all ${
                thinkingEnabled
                  ? 'bg-violet-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Brain className="w-3.5 h-3.5" />
              <span>Deep Reasoning (High Thinking)</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Input Box */}
      <div
        className={`relative rounded-3xl bg-white border transition-all duration-200 shadow-md ${
          isTempSession
            ? 'border-amber-400/80 ring-2 ring-amber-400/10'
            : 'border-slate-200/90 focus-within:border-indigo-500/80 focus-within:ring-3 focus-within:ring-indigo-500/15'
        }`}
      >
        {/* Active Mode & Persona Pill Header */}
        <div className="flex items-center justify-between px-4 pt-2.5 pb-1 border-b border-slate-100/80 text-xs">
          <div className="flex items-center gap-2">
            {/* Active Persona Tag */}
            {activeMode !== 'default' ? (
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 font-medium">
                <Sparkles className="w-3 h-3 text-indigo-600" />
                <span className="capitalize font-mono text-[11px]">/{activeMode} active</span>
                <button
                  type="button"
                  onClick={() => onChangeMode('default')}
                  className="hover:text-indigo-900 ml-1"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsSlashMenuOpen(!isSlashMenuOpen)}
                className="flex items-center gap-1 text-slate-500 hover:text-indigo-600 font-medium transition-colors"
              >
                <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[11px] font-bold">/</span>
                <span className="text-[11px]">Commands</span>
              </button>
            )}

            <button
              type="button"
              onClick={onOpenTemplates}
              className="flex items-center gap-1 text-slate-500 hover:text-indigo-600 font-medium transition-colors border-l border-slate-200 pl-2"
            >
              <Layout className="w-3 h-3" />
              <span className="text-[11px]">Library</span>
            </button>

            {isTempSession && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold">
                <Lock className="w-3 h-3" /> Incognito Session
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <kbd
              className="hidden sm:inline-flex items-center gap-0.5 text-[10px] text-slate-400 font-mono bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/80 cursor-pointer hover:bg-slate-200 hover:text-slate-600 transition-colors"
              onClick={() => textareaRef.current?.focus()}
              title="Shortcut: Cmd/Ctrl + K to focus"
            >
              ⌘K
            </kbd>

            <button
              type="button"
              onClick={() => setShowConfig(!showConfig)}
              className={`p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-1 ${
                showConfig ? 'text-indigo-600 bg-indigo-50' : ''
              }`}
              title="Parameters & Resolution"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span className="text-[10px] font-mono hidden sm:inline">{aspectRatio} · {imageSize}</span>
            </button>
          </div>
        </div>

        {/* Image Attachment Preview */}
        {attachedImage && (
          <div className="p-3 border-b border-slate-100 flex items-center gap-3">
            <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-slate-200 shrink-0">
              <img
                src={attachedImage.dataUrl}
                alt="Upload preview"
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => setAttachedImage(null)}
                className="absolute top-1 right-1 p-0.5 rounded-full bg-black/70 text-white hover:bg-black"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            <div className="flex-1 min-w-0 text-xs">
              <span className="font-semibold text-slate-800 truncate block">
                {attachedImage.name || 'Attached Photo'}
              </span>
              <span className="text-slate-500 text-[11px]">
                Omnisym vision analysis ready. Ask any question about this image.
              </span>
            </div>
          </div>
        )}

        {/* Text Area & Input Controls */}
        <div className="flex items-end gap-2 p-3">
          {/* File Upload Button (+) */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageFileChange}
          />
          <button
            type="button"
            id="upload-image-button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors shrink-0"
            title="Upload Photo for Vision Analysis (+)"
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
            placeholder={
              activeMode === 'code'
                ? 'Ask to write, refactor, or debug code...'
                : activeMode === 'research'
                ? 'Enter topic to research with Google Search Grounding...'
                : activeMode === '3d'
                ? 'Describe a 3D asset, shader, or Three.js scene...'
                : activeMode === 'human'
                ? 'Talk to Omnisym with empathetic depth...'
                : 'Message Omnisym or type / for specialized modes...'
            }
            className="flex-1 max-h-40 py-1.5 px-1 bg-transparent resize-none focus:outline-hidden text-sm text-slate-800 placeholder:text-slate-400 leading-relaxed font-sans"
          />

          {/* Visual Wave Animation */}
          {isRecording && (
            <div className="flex items-center justify-center gap-0.5 px-2">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ height: ['6px', '16px', '6px'] }}
                  transition={{
                    duration: 0.6,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: i * 0.15,
                  }}
                  className="w-1 bg-rose-500 rounded-full"
                  style={{ minHeight: '6px' }}
                />
              ))}
            </div>
          )}

          {/* Voice & Lang Controls */}
          <div className="flex items-center gap-0.5 bg-slate-50 border border-slate-100 rounded-xl p-0.5 shrink-0 transition-colors hover:border-slate-200">
            <select
              value={speechLang}
              onChange={(e) => setSpeechLang(e.target.value as 'en-US' | 'hi-IN')}
              className="text-[11px] font-bold bg-transparent border-none focus:ring-0 text-slate-600 hover:text-indigo-600 cursor-pointer pl-1.5 pr-1 py-1 appearance-none outline-none text-center"
              title="Dictation Language"
            >
              <option value="en-US">English</option>
              <option value="hi-IN">Hindi</option>
            </select>
            
            <button
              type="button"
              id="voice-mic-button"
              onClick={toggleVoiceInput}
              className={`p-1.5 rounded-lg transition-all ${
                isRecording
                  ? 'bg-rose-500 text-white animate-pulse shadow-xs'
                  : 'text-slate-500 hover:text-indigo-600 hover:bg-slate-200/60'
              }`}
              title={isRecording ? 'Stop Voice Recording' : 'Voice Input'}
            >
              {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          </div>

          {/* Send Button */}
          <button
            type="button"
            id="send-message-button"
            onClick={handleSubmit}
            disabled={(!inputText.trim() && !attachedImage) || isLoading}
            className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-30 disabled:hover:bg-indigo-600 text-white transition-all shadow-xs shrink-0 active:scale-95"
            title="Send Message (Enter)"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
