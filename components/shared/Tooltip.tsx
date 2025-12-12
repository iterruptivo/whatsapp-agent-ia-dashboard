'use client';

import { useState, useRef, useEffect, ReactNode } from 'react';

interface TooltipProps {
  children: ReactNode;
  text: string;
  delay?: number;
  position?: 'auto' | 'left' | 'right';
}

export default function Tooltip({ children, text, delay = 200, position: preferredPosition = 'auto' }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [tooltipPosition, setTooltipPosition] = useState<'left' | 'right'>('right');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

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
    setMousePosition({ x: e.clientX, y: e.clientY });
  };

  // Calcular posición óptima del tooltip
  useEffect(() => {
    if (isVisible && preferredPosition === 'auto') {
      const tooltipWidth = 150; // Estimación del ancho del tooltip
      const screenWidth = window.innerWidth;
      const cursorX = mousePosition.x;

      // Si el tooltip se saldría por la derecha, posicionarlo a la izquierda
      if (cursorX + tooltipWidth + 20 > screenWidth) {
        setTooltipPosition('left');
      } else {
        setTooltipPosition('right');
      }
    } else if (preferredPosition !== 'auto') {
      setTooltipPosition(preferredPosition);
    }
  }, [isVisible, mousePosition.x, preferredPosition]);

  // Calcular left según la posición
  const getLeftPosition = () => {
    if (tooltipPosition === 'left') {
      return mousePosition.x - 8; // Se posicionará a la izquierda con transform
    }
    return mousePosition.x + 12;
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
          ref={tooltipRef}
          className="fixed z-[9999] pointer-events-none"
          style={{
            left: getLeftPosition(),
            top: mousePosition.y - 40,
            transform: tooltipPosition === 'left' ? 'translateX(-100%)' : 'none',
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
          {/* Arrow - posición según lado */}
          <div
            className={`w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-gray-800 ${
              tooltipPosition === 'left' ? 'ml-auto mr-3' : 'ml-3'
            }`}
          />
        </div>
      )}
    </div>
  );
}
