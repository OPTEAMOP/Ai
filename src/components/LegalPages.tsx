import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Shield, FileText, Scale } from 'lucide-react';

interface LegalLayoutProps {
  title: string;
  lastUpdated: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  onClose: () => void;
}

const LegalLayout: React.FC<LegalLayoutProps> = ({ title, lastUpdated, icon, children, onClose }) => (
  <motion.div 
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-50 overflow-y-auto bg-white text-black font-serif selection:bg-black selection:text-white"
  >
    <div className="max-w-3xl mx-auto px-6 py-12 md:py-24">
      <button 
        onClick={onClose}
        className="flex items-center gap-2 text-sm font-sans mb-12 hover:underline transition-all group cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Return to Omnisym
      </button>

      <header className="mb-16 space-y-4">
        <div className="flex items-center gap-3 text-black">
          {icon}
          <h1 className="text-4xl md:text-5xl font-bold tracking-tighter">{title}</h1>
        </div>
        <p className="text-sm font-sans uppercase tracking-widest text-slate-500">
          Last Updated: {lastUpdated}
        </p>
        <div className="w-24 h-1 bg-black" />
      </header>

      <article className="prose prose-slate max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-black prose-p:text-slate-800 prose-p:leading-relaxed text-lg">
        {children}
      </article>

      <footer className="mt-24 pt-12 border-t border-slate-200 text-sm font-sans text-slate-400 text-center">
        <p>© 2026 Omnisym AI. All rights reserved. Professional Grade Intelligence.</p>
      </footer>
    </div>
  </motion.div>
);

export const PrivacyPolicy: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <LegalLayout 
    title="Privacy Policy" 
    lastUpdated="August 21, 2026"
    onClose={onClose}
    icon={<Shield className="w-8 h-8" />}
  >
    <section>
      <h2>1. Information We Process</h2>
      <p>
        Omnisym AI is designed to facilitate high-level content generation. We process user prompts, 
        queries, and uploaded assets strictly for the purpose of generating AI responses. This includes:
      </p>
      <ul>
        <li>Textual prompts for code, music lyrics, and architectural planning.</li>
        <li>System metadata required for secure session management.</li>
        <li>Authentication details synchronized via secure cloud protocols.</li>
      </ul>
    </section>

    <section>
      <h2>2. Data Usage & AI Processing</h2>
      <p>
        Your queries are processed through advanced large language models. We do not sell your personal 
        data or prompt history to third parties. Data is used exclusively to:
      </p>
      <ul>
        <li>Provide real-time AI generation services.</li>
        <li>Improve local model relevance through secure memory features (opt-in).</li>
        <li>Synchronize your Pro status and tool preferences across devices.</li>
      </ul>
    </section>

    <section>
      <h2>3. Security Standards</h2>
      <p>
        We utilize industry-standard encryption for data in transit and at rest. Your database records 
        are protected by strict Firebase Security Rules, ensuring that only authenticated owners can 
        access their respective prompt histories and profiles.
      </p>
    </section>
  </LegalLayout>
);

export const TermsConditions: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <LegalLayout 
    title="Terms of Service" 
    lastUpdated="August 21, 2026"
    onClose={onClose}
    icon={<Scale className="w-8 h-8" />}
  >
    <section>
      <h2>1. The Pro Pass (₹29 Tier)</h2>
      <p>
        The "Pro Pass" is a paid subscription service priced at ₹29. By purchasing this tier, 
        users gain immediate access to high-value professional toolkits including:
      </p>
      <ul>
        <li>The Urban Music Studio (Lyric & Cover Art Generation)</li>
        <li>One-Click Gaming Scripter (Lua & Directory Architecture)</li>
        <li>Community Server Architect (JSON & Role Hierarchies)</li>
      </ul>
    </section>

    <section>
      <h2>2. Payment & Refunds</h2>
      <p>
        Payments are processed securely through our authorized payment gateways. Due to the 
        instant delivery of digital assets and AI processing power, all ₹29 transactions are 
        non-refundable once the Pro features are unlocked.
      </p>
    </section>

    <section>
      <h2>3. Acceptable Use</h2>
      <p>
        Users agree not to use Omnisym AI to generate harmful, illegal, or malicious content. 
        Violations of these terms may result in immediate account suspension without refund.
      </p>
    </section>
  </LegalLayout>
);
