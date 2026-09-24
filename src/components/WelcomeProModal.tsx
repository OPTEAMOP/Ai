import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  CheckCircle2,
  Crown,
  Zap,
  GraduationCap,
  HardDrive,
  ArrowRight,
  X,
  FileCode,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { UserSubscription } from '../types';

interface WelcomeProModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscription: UserSubscription;
  onOpenLiveSandbox?: () => void;
}

export const WelcomeProModal: React.FC<WelcomeProModalProps> = ({
  isOpen,
  onClose,
  subscription,
  onOpenLiveSandbox,
}) => {
  useEffect(() => {
    if (isOpen) {
      // Fire confetti bursts
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.5 },
        colors: ['#6366f1', '#a855f7', '#06b6d4', '#10b981', '#fbbf24', '#f43f5e'],
      });

      const timer = setTimeout(() => {
        confetti({
          particleCount: 60,
          angle: 60,
          spread: 60,
          origin: { x: 0, y: 0.7 },
        });
        confetti({
          particleCount: 60,
          angle: 120,
          spread: 60,
          origin: { x: 1, y: 0.7 },
        });
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isCreator = subscription.tier === 'creator';
  const isStudent = subscription.tier === 'student';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0"
        />

        {/* Modal Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', duration: 0.5, bounce: 0.2 }}
          className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white border border-slate-200 p-6 sm:p-8 shadow-2xl text-slate-900 z-10"
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="relative text-center space-y-5">
            {/* Celebration Icon Header */}
            <div className="inline-flex p-4 rounded-3xl bg-indigo-50 border border-indigo-100 shadow-sm">
              {isCreator ? (
                <Crown className="w-10 h-10 text-purple-600 animate-bounce" />
              ) : isStudent ? (
                <GraduationCap className="w-10 h-10 text-blue-600 animate-bounce" />
              ) : (
                <Zap className="w-10 h-10 text-indigo-600 animate-bounce" />
              )}
            </div>

            {/* Title & Badge */}
            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold uppercase tracking-wider">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Payment Verified & Activated
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                Welcome to Omnisym {subscription.tier.toUpperCase()}!
              </h2>
              <p className="text-sm text-slate-600 max-w-sm mx-auto">
                Your account is upgraded to <strong className="text-slate-900">{subscription.planName}</strong>. All pro intelligence models and cloud vaults are fully unlocked.
              </p>
            </div>

            {/* Perks Highlight Grid */}
            <div className="grid grid-cols-2 gap-3 text-left">
              <div className="p-3.5 rounded-2xl bg-[#F9FAFB] border border-slate-200 space-y-1 shadow-2xs">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-700">
                  <HardDrive className="w-4 h-4" />
                  <span>Cloud Vault</span>
                </div>
                <p className="text-lg font-bold text-slate-900">
                  {subscription.storageLimitGB} GB
                </p>
                <p className="text-[11px] text-slate-500">Permanent cloud vault storage</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#F9FAFB] border border-slate-200 space-y-1 shadow-2xs">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-700">
                  <Sparkles className="w-4 h-4" />
                  <span>Engine Speed</span>
                </div>
                <p className="text-lg font-bold text-slate-900">Turbo Flash</p>
                <p className="text-[11px] text-slate-500">Priority high-speed queue</p>
              </div>
            </div>

            {/* Unlocked List */}
            <div className="p-4 rounded-2xl bg-[#F9FAFB] border border-slate-200 text-left space-y-2 text-xs shadow-2xs">
              <p className="font-bold text-indigo-800 uppercase tracking-wider text-[10px]">
                Instant Pro Capabilities Active:
              </p>
              <div className="space-y-1.5 text-slate-700">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Zero Watermark 8K Image Generation & Prompt Enhancement</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Continuous Cross-Chat Persona & Avatar Memory</span>
                </div>
                {isCreator && (
                  <div className="flex items-center gap-2 text-purple-800 font-semibold">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                    <span>In-App Live Sandbox Runner & 1-Click ZIP Exports</span>
                  </div>
                )}
                {isStudent && (
                  <div className="flex items-center gap-2 text-blue-800 font-semibold">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    <span>Step-by-step LaTeX Math & Physics Doubt Solver</span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              {isCreator && onOpenLiveSandbox ? (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenLiveSandbox();
                  }}
                  className="flex-1 py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xs transition-transform active:scale-98"
                >
                  <FileCode className="w-4 h-4" />
                  <span>Open Live Sandbox</span>
                </button>
              ) : null}

              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xs transition-colors"
              >
                <span>Start Creating</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
