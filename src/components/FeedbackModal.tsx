import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, AlertTriangle, CheckCircle2, Mail, ShieldCheck } from 'lucide-react';
import { FEEDBACK_CATEGORIES } from '../data/constants';
import confetti from 'canvas-confetti';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  messageId: string;
  promptSnippet: string;
  aiResponseSnippet: string;
  userEmail?: string;
  onSubmitSuccess: (messageId: string) => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  messageId,
  promptSnippet,
  aiResponseSnippet,
  userEmail = 'user@omnisym.ai',
  onSubmitSuccess,
}) => {
  const [category, setCategory] = useState(FEEDBACK_CATEGORIES[0]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [feedbackId, setFeedbackId] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          category,
          notes,
          messageId,
          promptSnippet,
          aiResponseSnippet,
          userEmail,
        }),
      });

      if (!res.ok) {
        throw new Error(`Feedback submission returned status ${res.status}`);
      }

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('Invalid response received from feedback service');
      }

      const data = await res.json();
      if (data.success) {
        setFeedbackId(data.feedbackId || 'fb_ok');
        setIsSubmitted(true);
        onSubmitSuccess(messageId);
        confetti({
          particleCount: 45,
          spread: 60,
          origin: { y: 0.7 },
        });

        setTimeout(() => {
          setIsSubmitted(false);
          setNotes('');
          onClose();
        }, 1800);
      }
    } catch (err) {
      console.error('Feedback submission error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
          id="feedback-modal"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">Report Issue & Send Feedback</h3>
                <p className="text-xs text-slate-500">Help train and refine Omnisym's intelligence</p>
              </div>
            </div>
            <button
              id="close-feedback-btn"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {isSubmitted ? (
            <div className="p-8 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-semibold text-slate-900">Feedback Dispatched</h4>
              <p className="text-sm text-slate-600 mt-1">
                Your report #{feedbackId} has been successfully sent to{' '}
                <span className="font-semibold text-slate-900">opopteamop@gmail.com</span>.
              </p>
              <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                Thank you for making Omnisym better!
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Receiver Notice */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-50/80 border border-indigo-100 text-xs text-indigo-800">
                <Mail className="w-4 h-4 shrink-0 text-indigo-600" />
                <span>
                  This report will be forwarded directly to engineering at{' '}
                  <span className="font-semibold">opopteamop@gmail.com</span>.
                </span>
              </div>

              {/* Category Picker */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  What went wrong?
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {FEEDBACK_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        category === cat
                          ? 'bg-rose-500 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Additional Details (Optional)
                </label>
                <textarea
                  id="feedback-notes-input"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Describe what you expected or why this response was unsatisfactory..."
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-slate-800 placeholder:text-slate-400 resize-none"
                />
              </div>

              {/* Context preview */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5 text-xs text-slate-600">
                <div className="truncate">
                  <span className="font-semibold text-slate-700">Prompt:</span> {promptSnippet || 'Image query'}
                </div>
                <div className="truncate text-slate-500">
                  <span className="font-semibold text-slate-700">Response snippet:</span> {aiResponseSnippet.slice(0, 100)}...
                </div>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="submit-feedback-btn"
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium shadow-sm transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    'Sending...'
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      Send to opopteamop@gmail.com
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
