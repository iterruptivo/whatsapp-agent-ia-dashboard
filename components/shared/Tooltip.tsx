'use client';

import { useState, useRef, ReactNode } from 'react';

interface TooltipProps {
  children: ReactNode;
  text: string;
  delay?: number;
}

export default function Tooltip({ children, text, delay = 200 }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    setPosition({ x: e.clientX, y: e.clientY });
  };

  return (
    <div
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
    >
      {children}
      {isVisible && (
        <div
          className="fixed z-[9999] pointer-events-none"
          style={{
            left: position.x + 8,
            top: position.y - 40,
          }}
        >
          {/* Tooltip body */}
          <div
            className="px-3 py-1.5 text-xs font-medium text-white bg-gray-800 rounded-md shadow-lg whitespace-nowrap transition-all duration-150 ease-out"
            style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? 'scale(1)' : 'scale(0.95)',
            }}
          >
            {text}
          </div>
          {/* Arrow */}
          <div
            className="w-0 h-0 ml-3 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-gray-800"
          />
        </div>
      )}
    </div>
  );
}
