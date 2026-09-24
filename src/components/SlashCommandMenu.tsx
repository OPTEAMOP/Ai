import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Code2, Search, Box, HeartHandshake, ShieldAlert, Sparkles, Flame } from 'lucide-react';
import { SLASH_COMMANDS } from '../data/constants';
import { SlashCommandInfo } from '../types';

interface SlashCommandMenuProps {
  isOpen: boolean;
  filterText: string;
  selectedIndex: number;
  onSelect: (command: SlashCommandInfo) => void;
  onClose: () => void;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  Code2: <Code2 className="w-4 h-4 text-emerald-600" />,
  Search: <Search className="w-4 h-4 text-blue-600" />,
  Box: <Box className="w-4 h-4 text-purple-600" />,
  HeartHandshake: <HeartHandshake className="w-4 h-4 text-rose-600" />,
  Flame: <Flame className="w-4 h-4 text-orange-600" />,
  ShieldAlert: <ShieldAlert className="w-4 h-4 text-amber-600" />,
};

export const SlashCommandMenu: React.FC<SlashCommandMenuProps> = ({
  isOpen,
  filterText,
  selectedIndex,
  onSelect,
  onClose,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const cleanFilter = filterText.toLowerCase().replace('/', '');
  const filteredCommands = SLASH_COMMANDS.filter(
    (cmd) =>
      cmd.command.toLowerCase().includes(cleanFilter) ||
      cmd.title.toLowerCase().includes(cleanFilter) ||
      cmd.type.toLowerCase().includes(cleanFilter)
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen || filteredCommands.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={containerRef}
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
        transition={{ duration: 0.15 }}
        id="slash-command-menu"
        className="absolute bottom-full left-0 mb-3 w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200/80 p-2 z-40 overflow-hidden backdrop-blur-md"
      >
        <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>Omnisym Personas & Commands</span>
          </div>
          <span className="text-[10px] text-slate-400">↑↓ to navigate · Enter to select</span>
        </div>

        <div className="max-h-64 overflow-y-auto py-1 space-y-1">
          {filteredCommands.map((cmd, idx) => {
            const isSelected = idx === selectedIndex;
            return (
              <button
                key={`slash_cmd_${cmd.command}_${idx}`}
                type="button"
                id={`slash-cmd-${cmd.type}`}
                onClick={() => onSelect(cmd)}
                className={`w-full flex items-start gap-3 p-2.5 rounded-xl text-left transition-all ${
                  isSelected ? 'bg-slate-100/90 ring-1 ring-slate-200' : 'hover:bg-slate-50'
                }`}
              >
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 mt-0.5 shrink-0">
                  {ICON_MAP[cmd.iconName] || <Code2 className="w-4 h-4 text-indigo-600" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                      {cmd.command}
                    </span>
                    <span className="text-xs font-semibold text-slate-900 truncate">
                      {cmd.title}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{cmd.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
