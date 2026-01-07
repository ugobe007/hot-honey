import React, { useEffect, useRef } from 'react';

interface HowItWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const STEPS = [
  'AI scans your startup & investor profiles',
  'GOD Algorithm scores every startup 0-100',
  'Semantic AI matches you to best-fit investors',
  'See why you match (with explanations)',
  'Connect & start your fundraising journey!'
];

export default function HowItWorksModal({ isOpen, onClose }: HowItWorksModalProps) {
  const [step, setStep] = React.useState(0);
  const autoAdvanceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    autoAdvanceRef.current = setInterval(() => {
      setStep((prev) => (prev + 1) % STEPS.length);
    }, 2500);
    return () => {
      if (autoAdvanceRef.current) clearInterval(autoAdvanceRef.current);
    };
  }, [isOpen]);

  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 p-4">
      <div className="bg-gradient-to-br from-[#1a1a1a] via-[#222222] to-[#2a2a2a] rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-8 max-w-sm sm:max-w-lg w-full relative animate-fade-in border-2 border-cyan-500/50">
        <button
          className="absolute top-3 right-3 sm:top-4 sm:right-4 text-gray-400 hover:text-white text-2xl sm:text-3xl transition-colors"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 text-center bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">How HotMatch Works</h2>
        <div className="flex flex-col items-center">
          <div className="mb-4 sm:mb-6 min-h-[50px] sm:min-h-[60px] text-base sm:text-lg text-center text-white transition-all duration-300 px-2">
            {STEPS[step]}
          </div>
          <div className="flex gap-2 sm:gap-3 mb-4 sm:mb-6">
            {STEPS.map((_, i) => (
              <button
                key={i}
                className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full transition-all ${i === step ? 'bg-cyan-600 scale-125' : 'bg-gray-600 hover:bg-gray-500'}`}
                onClick={() => setStep(i)}
                aria-label={`Step ${i + 1}`}
              />
            ))}
          </div>
          <button
            className="mt-2 px-5 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-full font-semibold text-base sm:text-lg shadow-lg hover:scale-105 transition-transform"
            onClick={onClose}
          >
            Start Matching 🚀
          </button>
        </div>
      </div>
    </div>
  );
}
