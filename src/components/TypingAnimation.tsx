import React from 'react';
import { motion } from 'motion/react';

export const TypingAnimation: React.FC = () => {
  return (
    <div
      id="typing-indicator"
      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100/80 border border-slate-200/70 text-slate-500"
    >
      <span className="text-xs font-medium text-slate-500 mr-1">Omnisym is writing</span>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-indigo-500"
          animate={{
            y: [0, -5, 0],
            opacity: [0.4, 1, 0.4],
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: i * 0.18,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
};
