/**
 * REQUEST INTRO MODAL
 * ===================
 * Modal for requesting email introductions to investors
 * Color scheme: Light blue to violet
 */

import React, { useState } from 'react';
import { 
  X, 
  Mail, 
  Send,
  Loader2,
  CheckCircle,
  AlertCircle,
  User,
  Building2,
  FileText
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface RequestIntroModalProps {
  isOpen: boolean;
  onClose: () => void;
  investorId: string;
  investorName: string;
  investorFirm?: string;
  startupId: string;
  startupName: string;
  matchScore: number;
}

export default function RequestIntroModal({ 
  isOpen, 
  onClose, 
  investorId,
  investorName,
  investorFirm,
  startupId,
  startupName,
  matchScore
}: RequestIntroModalProps) {
  const [message, setMessage] = useState('');
  const [founderName, setFounderName] = useState('');
  const [founderEmail, setFounderEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Save intro request to database
      const { error: dbError } = await supabase.from('intro_requests').insert({
        investor_id: investorId,
        startup_id: startupId,
        founder_name: founderName,
        founder_email: founderEmail,
        message: message,
        match_score: matchScore,
        status: 'pending',
        created_at: new Date().toISOString()
      });

      if (dbError) throw dbError;

      // Log the request
      await supabase.from('ai_logs').insert({
        type: 'intro_request',
        action: 'submitted',
        input: { investorId, startupId, founderEmail },
        status: 'success'
      });

      setSubmitted(true);
    } catch (err: any) {
      console.error('Failed to submit intro request:', err);
      setError(err.message || 'Failed to submit request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSubmitted(false);
    setMessage('');
    setFounderName('');
    setFounderEmail('');
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-2xl w-full max-w-lg border border-slate-700 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-semibold text-white">Request Introduction</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {submitted ? (
          /* Success State */
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Request Submitted!</h3>
            <p className="text-slate-400 mb-6">
              We'll review your request and facilitate an introduction to {investorName} if there's a good fit.
            </p>
            <button
              onClick={handleClose}
              className="px-6 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg font-medium hover:from-cyan-500 hover:to-blue-500 transition-all"
            >
              Done
            </button>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {/* Investor Info */}
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">{investorName}</h3>
                  <p className="text-sm text-slate-400">{investorFirm || 'Investor'}</p>
                </div>
                <div className="ml-auto px-3 py-1 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold text-sm">
                  {matchScore}% match
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <span className="text-red-300 text-sm">{error}</span>
              </div>
            )}

            {/* Founder Name */}
            <div>
              <label className="text-sm text-slate-400 mb-1 block flex items-center gap-1">
                <User className="w-3 h-3" />
                Your Name
              </label>
              <input
                type="text"
                value={founderName}
                onChange={(e) => setFounderName(e.target.value)}
                placeholder="John Smith"
                required
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>

            {/* Founder Email */}
            <div>
              <label className="text-sm text-slate-400 mb-1 block flex items-center gap-1">
                <Mail className="w-3 h-3" />
                Your Email
              </label>
              <input
                type="email"
                value={founderEmail}
                onChange={(e) => setFounderEmail(e.target.value)}
                placeholder="john@startup.com"
                required
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>

            {/* Message */}
            <div>
              <label className="text-sm text-slate-400 mb-1 block flex items-center gap-1">
                <FileText className="w-3 h-3" />
                Introduction Message (Optional)
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Hi, I'm the founder of [startup]. I'd love to connect about..."
                rows={4}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 transition-colors resize-none"
              />
              <p className="text-xs text-slate-500 mt-1">
                A personalized message increases your chances of getting a response.
              </p>
            </div>

            {/* Startup Context */}
            <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-700">
              <p className="text-xs text-slate-400">
                This request is for: <span className="text-cyan-400">{startupName}</span>
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !founderName || !founderEmail}
              className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg font-semibold hover:from-cyan-500 hover:to-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Request Introduction
                </>
              )}
            </button>

            <p className="text-xs text-slate-500 text-center">
              By submitting, you agree to our terms of service and privacy policy.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}


