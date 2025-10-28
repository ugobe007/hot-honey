export default function HoneypotIcon({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      className={className}
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Pot body */}
      <ellipse cx="50" cy="70" rx="35" ry="25" fill="#F59E0B" stroke="#D97706" strokeWidth="2"/>
      <path d="M 15 70 Q 15 45, 50 45 Q 85 45, 85 70" fill="#FBBF24" stroke="#D97706" strokeWidth="2"/>
      
      {/* Honey drips */}
      <circle cx="45" cy="35" r="4" fill="#FBBF24"/>
      <path d="M 45 35 L 45 45" stroke="#FBBF24" strokeWidth="3" strokeLinecap="round"/>
      
      {/* Pot rim */}
      <ellipse cx="50" cy="45" rx="37" ry="8" fill="#F59E0B" stroke="#D97706" strokeWidth="2"/>
    </svg>
  );
}