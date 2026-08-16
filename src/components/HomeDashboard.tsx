import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, Image as ImageIcon, Code2, Search, Box, ArrowRight, Zap, Shield, Wand2 } from 'lucide-react';
import { QUICK_SUGGESTIONS } from '../data/constants';
import { UserProfile } from '../types';

interface HomeDashboardProps {
  user: UserProfile;
  onSelectPrompt: (prompt: string, isImageGen?: boolean) => void;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  Sparkles: <Sparkles className="w-4 h-4 text-violet-600" />,
  Image: <ImageIcon className="w-4 h-4 text-sky-600" />,
  Code2: <Code2 className="w-4 h-4 text-emerald-600" />,
  Search: <Search className="w-4 h-4 text-blue-600" />,
  Box: <Box className="w-4 h-4 text-purple-600" />,
};

export const HomeDashboard: React.FC<HomeDashboardProps> = ({ user, onSelectPrompt }) => {
  const userName = user.displayName || user.name || 'Prabhjot';
  const firstName = userName.includes(' ') ? userName.split(' ')[0] : userName;

  return (
    <div id="home-dashboard" className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 max-w-4xl mx-auto w-full text-center">
      {/* Animated Omnisym Logo Badge */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="mb-6 relative"
      >
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-xl shadow-indigo-500/25 mx-auto">
          <Sparkles className="w-8 h-8 animate-pulse" />
        </div>
        <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-1 rounded-full border-2 border-white shadow-xs">
          <Zap className="w-3 h-3" />
        </div>
      </motion.div>

      {/* Main Greeting Prompt */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Hi {firstName}, what's on your mind today?
        </h1>
        <p className="text-sm sm:text-base text-slate-500 mt-2 max-w-xl mx-auto font-normal">
          Omnisym is ready for deep reasoning, high-res image generation, full-stack code architecture, and live web research.
        </p>
      </motion.div>

      {/* Quick Action Suggestion Chips Grid */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl text-left"
      >
        {QUICK_SUGGESTIONS.map((chip) => (
          <button
            key={chip.id}
            type="button"
            id={`suggestion-chip-${chip.id}`}
            onClick={() => onSelectPrompt(chip.prompt, chip.isImageGen)}
            className={`p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-md transition-all flex items-start gap-3.5 group cursor-pointer ${chip.color}`}
          >
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 shrink-0 group-hover:scale-105 transition-transform">
              {ICON_MAP[chip.icon] || <Sparkles className="w-4 h-4 text-indigo-600" />}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">{chip.label}</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
              </div>
              <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                {chip.prompt}
              </p>
            </div>
          </button>
        ))}
      </motion.div>

      {/* Persona Badges / Slash command indicators */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="mt-8 flex flex-wrap items-center justify-center gap-2.5 text-xs"
      >
        <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 mr-1">Quick Personas:</span>
        <button onClick={() => onSelectPrompt('/code ')} className="font-mono px-3 py-1 rounded-full shadow-sm bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800/50 hover:shadow transition-all cursor-pointer">
          /code
        </button>
        <button onClick={() => onSelectPrompt('/research ')} className="font-mono px-3 py-1 rounded-full shadow-sm bg-blue-50 text-blue-600 border border-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800/50 hover:shadow transition-all cursor-pointer">
          /research
        </button>
        <button onClick={() => onSelectPrompt('/3d ')} className="font-mono px-3 py-1 rounded-full shadow-sm bg-purple-50 text-purple-600 border border-purple-100 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800/50 hover:shadow transition-all cursor-pointer">
          /3d
        </button>
        <button onClick={() => onSelectPrompt('/human ')} className="font-mono px-3 py-1 rounded-full shadow-sm bg-rose-50 text-rose-600 border border-rose-100 dark:bg-rose-900/20 dark:text-rose-300 dark:border-rose-800/50 hover:shadow transition-all cursor-pointer">
          /human
        </button>
        <button onClick={() => onSelectPrompt('/temp ')} className="font-mono px-3 py-1 rounded-full shadow-sm bg-amber-50 text-amber-600 border border-amber-100 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800/50 hover:shadow transition-all cursor-pointer">
          /temp
        </button>
      </motion.div>
    </div>
  );
};
