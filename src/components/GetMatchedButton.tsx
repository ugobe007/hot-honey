import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';

interface GetMatchedButtonProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'outline' | 'ghost';
}

export default function GetMatchedButton({ 
  className = '', 
  size = 'md',
  variant = 'primary' 
}: GetMatchedButtonProps) {
  const navigate = useNavigate();

  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  const variantClasses = {
    primary: 'bg-gradient-to-r from-purple-500 via-violet-500 to-cyan-500 hover:from-purple-600 hover:via-violet-600 hover:to-cyan-600 text-white shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50',
    outline: 'bg-transparent border-2 border-purple-500 text-purple-400 hover:bg-purple-500/10',
    ghost: 'bg-purple-500/10 text-purple-400 hover:bg-purple-500/20',
  };

  return (
    <button
      onClick={() => navigate('/get-matched')}
      className={`
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        rounded-xl font-bold transition-all
        flex items-center gap-2
        animate-pulse hover:animate-none
        ${className}
      `}
    >
      <Sparkles className={size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'} />
      Get Matched!
    </button>
  );
}
