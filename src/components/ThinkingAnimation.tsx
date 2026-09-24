import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Brain, Cpu, Zap, Search, Code2, Layers, Image as ImageIcon } from 'lucide-react';

interface ThinkingAnimationProps {
  mode?: string;
  isImageGen?: boolean;
}

const THINKING_STEPS = [
  { text: 'Analyzing context...', icon: <Brain className="w-3 h-3" /> },
  { text: 'Retrieving knowledge...', icon: <Search className="w-3 h-3" /> },
  { text: 'Processing logic...', icon: <Cpu className="w-3 h-3" /> },
  { text: 'Synthesizing response...', icon: <Zap className="w-3 h-3" /> },
];

const IMAGE_GEN_STEPS = [
  { text: 'Parsing visual intent...', icon: <Sparkles className="w-3 h-3" /> },
  { text: 'Framing composition...', icon: <Layers className="w-3 h-3" /> },
  { text: 'Diffusing textures...', icon: <Zap className="w-3 h-3" /> },
  { text: 'Finalizing render...', icon: <ImageIcon className="w-3 h-3" /> },
];

export const ThinkingAnimation: React.FC<ThinkingAnimationProps> = ({
  mode,
  isImageGen,
}) => {
  const [stepIndex, setStepIndex] = useState(0);
  const steps = isImageGen ? IMAGE_GEN_STEPS : THINKING_STEPS;

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % steps.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [steps.length]);

  return (
    <div
      id="thinking-animation-container"
      className="flex items-center gap-3 py-2.5 px-4 text-sm bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm border border-slate-200/60 dark:border-zinc-800/60 rounded-2xl w-fit shadow-xs animate-in fade-in slide-in-from-left-2 duration-300"
    >
      {/* Icon with Ring Animation */}
      <div className="relative flex items-center justify-center shrink-0">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 rounded-full border border-indigo-500/30 border-t-indigo-500"
        />
        <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 z-10">
          {isImageGen ? (
            <Sparkles className="w-4 h-4 animate-pulse" />
          ) : (
            <Brain className="w-4 h-4" />
          )}
        </div>
      </div>

      {/* Dynamic Text Steps */}
      <div className="flex flex-col min-w-[140px]">
        <div className="h-5 overflow-hidden relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={stepIndex}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -10, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-widest"
            >
              <span className="text-indigo-500 dark:text-indigo-400">
                {steps[stepIndex].icon}
              </span>
              <span>{steps[stepIndex].text}</span>
            </motion.div>
          </AnimatePresence>
        </div>
        
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[10px] font-medium text-slate-400 dark:text-zinc-500">
            {isImageGen ? 'Omnisym Creative Engine' : 'Omnisym Reasoning Path'}
          </span>
          <div className="flex gap-0.5">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={`thinking-${i}`}
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                className="w-1 h-1 rounded-full bg-indigo-500/50"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

