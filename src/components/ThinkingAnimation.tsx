import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles, Brain, Cpu } from 'lucide-react';

interface ThinkingAnimationProps {
  mode?: string;
  isImageGen?: boolean;
}

const THINKING_STEPS = [
  'Omnisym is synthesizing multi-modal context...',
  'Analyzing semantic structures & logic graph...',
  'Grounding citations & validating verified sources...',
  'Formulating optimal structured output...',
];

const IMAGE_STEPS = [
  'Refining neural prompt & visual composition...',
  'Calibrating lighting, geometry, and rendering pipeline...',
  'Generating high-resolution photorealistic pixels...',
  'Finalizing color grading and sharpening details...',
];

export const ThinkingAnimation: React.FC<ThinkingAnimationProps> = ({
  mode,
  isImageGen,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const steps = isImageGen ? IMAGE_STEPS : THINKING_STEPS;

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStepIndex((prev) => (prev + 1) % steps.length);
    }, 2200);
    return () => clearInterval(interval);
  }, [steps.length]);

  return (
    <div
      id="thinking-animation-container"
      className="my-3 p-4.5 rounded-2xl bg-gradient-to-b from-slate-50/90 to-slate-100/50 border border-slate-200/80 shadow-xs max-w-xl"
    >
      <div className="flex items-center gap-4">
        {/* Custom Glowing Fluid Orb / Gyroscope Lottie Simulation */}
        <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
          {/* Outer Pulsing Aura */}
          <motion.div
            animate={{
              scale: [1, 1.25, 1],
              opacity: [0.35, 0.7, 0.35],
            }}
            transition={{
              duration: 2.4,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className={`absolute inset-0 rounded-full blur-md ${
              isImageGen
                ? 'bg-gradient-to-tr from-sky-400 to-indigo-500'
                : mode === 'code'
                ? 'bg-gradient-to-tr from-emerald-400 to-teal-500'
                : 'bg-gradient-to-tr from-violet-500 to-indigo-500'
            }`}
          />

          {/* Rotating Orbital Ring 1 */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-1 rounded-full border-1.5 border-dashed border-indigo-400/60"
          />

          {/* Counter-Rotating Orbital Ring 2 */}
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-2.5 rounded-full border border-violet-400/80"
          />

          {/* Center Glowing Core */}
          <motion.div
            animate={{
              scale: [0.9, 1.1, 0.9],
            }}
            transition={{
              duration: 1.6,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className={`relative w-6 h-6 rounded-full flex items-center justify-center text-white shadow-sm ${
              isImageGen
                ? 'bg-gradient-to-br from-sky-500 to-indigo-600'
                : mode === 'code'
                ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
                : 'bg-gradient-to-br from-violet-600 to-indigo-700'
            }`}
          >
            {isImageGen ? (
              <Sparkles className="w-3 h-3 animate-spin" style={{ animationDuration: '3s' }} />
            ) : mode === 'code' ? (
              <Cpu className="w-3 h-3" />
            ) : (
              <Brain className="w-3 h-3" />
            )}
          </motion.div>
        </div>

        {/* Textual Feedback */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
              Omnisym Neural Thinking
            </span>
            {mode && mode !== 'default' && (
              <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                /{mode}
              </span>
            )}
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
          </div>

          <motion.p
            key={currentStepIndex}
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -3 }}
            transition={{ duration: 0.3 }}
            className="text-sm font-medium text-slate-700 mt-0.5 truncate"
          >
            {steps[currentStepIndex]}
          </motion.p>
        </div>
      </div>
    </div>
  );
};
