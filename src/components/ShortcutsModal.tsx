import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Keyboard, Command, MousePointer2, Type, MessageSquare, Plus, Search, Settings, Shield, User, LogOut } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  keys: string[];
  description: string;
  icon?: React.ReactNode;
}

interface ShortcutCategory {
  title: string;
  shortcuts: ShortcutItem[];
}

const SHORTCUT_CATEGORIES: ShortcutCategory[] = [
  {
    title: 'General',
    shortcuts: [
      { keys: ['Ctrl', '/'], description: 'Show shortcuts', icon: <Keyboard className="w-3.5 h-3.5" /> },
      { keys: ['Ctrl', 'K'], description: 'Focus search/commands', icon: <Search className="w-3.5 h-3.5" /> },
      { keys: ['Ctrl', 'L'], description: 'Focus chat input', icon: <MessageSquare className="w-3.5 h-3.5" /> },
      { keys: ['Esc'], description: 'Close modals/menus', icon: <X className="w-3.5 h-3.5" /> },
    ]
  },
  {
    title: 'Chat & Actions',
    shortcuts: [
      { keys: ['Ctrl', 'N'], description: 'New chat session', icon: <Plus className="w-3.5 h-3.5" /> },
      { keys: ['Enter'], description: 'Send message', icon: <MessageSquare className="w-3.5 h-3.5" /> },
      { keys: ['Shift', 'Enter'], description: 'New line in input', icon: <Type className="w-3.5 h-3.5" /> },
      { keys: ['Ctrl', 'U'], description: 'Upload file/image', icon: <Plus className="w-3.5 h-3.5" /> },
    ]
  },
  {
    title: 'Navigation',
    shortcuts: [
      { keys: ['Ctrl', 'B'], description: 'Toggle sidebar', icon: <MousePointer2 className="w-3.5 h-3.5" /> },
      { keys: ['Ctrl', ','], description: 'Settings', icon: <Settings className="w-3.5 h-3.5" /> },
      { keys: ['Ctrl', 'Shift', 'A'], description: 'Admin dashboard', icon: <Shield className="w-3.5 h-3.5" /> },
    ]
  },
  {
    title: 'Account',
    shortcuts: [
      { keys: ['Ctrl', 'P'], description: 'User profile', icon: <User className="w-3.5 h-3.5" /> },
      { keys: ['Ctrl', 'Shift', 'L'], description: 'Log out', icon: <LogOut className="w-3.5 h-3.5" /> },
    ]
  }
];

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-zinc-800"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between bg-slate-50/50 dark:bg-zinc-800/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                  <Command className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">Keyboard Shortcuts</h2>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">Master your workflow with Omnisym keys</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              {SHORTCUT_CATEGORIES.map((category, catIdx) => (
                <div key={catIdx} className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                    {category.title}
                  </h3>
                  <div className="space-y-2">
                    {category.shortcuts.map((shortcut, sIdx) => (
                      <div 
                        key={sIdx} 
                        className="flex items-center justify-between group py-1.5 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-slate-400 group-hover:text-indigo-500 transition-colors">
                            {shortcut.icon}
                          </span>
                          <span className="text-sm text-slate-600 dark:text-zinc-300 font-medium">
                            {shortcut.description}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          {shortcut.keys.map((key, kIdx) => (
                            <React.Fragment key={kIdx}>
                              <kbd className="px-1.5 py-0.5 rounded border border-slate-200 dark:border-zinc-700 bg-slate-100 dark:bg-zinc-800 text-[10px] font-bold text-slate-500 dark:text-zinc-400 shadow-sm min-w-[24px] text-center">
                                {key === 'Ctrl' ? (navigator.platform.includes('Mac') ? '⌘' : 'Ctrl') : key}
                              </kbd>
                              {kIdx < shortcut.keys.length - 1 && (
                                <span className="text-[10px] text-slate-300 dark:text-zinc-600">+</span>
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/50 text-center">
              <p className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium">
                Press <span className="text-indigo-600 dark:text-indigo-400 font-bold underline">Esc</span> or click outside to dismiss this view
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
