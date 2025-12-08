'use client';

import { useState, useRef, useEffect, ReactNode } from 'react';

interface TooltipProps {
  children: ReactNode;
  text: string;
  delay?: number;
}

export default function Tooltip({ children, text, delay = 200 }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [adjustedPosition, setAdjustedPosition] = useState({ x: 0, y: 0 });
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
    setPosition({ x: e.clientX, y: e.clientY });
  };

  // Calcular posición ajustada para no salir de la pantalla
  useEffect(() => {
    if (isVisible && tooltipRef.current) {
      const tooltip = tooltipRef.current;
      const rect = tooltip.getBoundingClientRect();
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;

      let newX = position.x + 8;
      let newY = position.y - rect.height - 10;

      // Si se sale por la derecha, mover a la izquierda del cursor
      if (newX + rect.width > windowWidth - 10) {
        newX = position.x - rect.width - 8;
      }

      // Si se sale por la izquierda, forzar al borde izquierdo
      if (newX < 10) {
        newX = 10;
      }

      // Si se sale por arriba, mostrar debajo del cursor
      if (newY < 10) {
        newY = position.y + 20;
      }

      // Si se sale por abajo
      if (newY + rect.height > windowHeight - 10) {
        newY = windowHeight - rect.height - 10;
      }

      setAdjustedPosition({ x: newX, y: newY });
    }
  }, [isVisible, position]);

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
            left: adjustedPosition.x,
            top: adjustedPosition.y,
          }}
        >
          {/* Tooltip body */}
          <div
            className="px-3 py-2 text-sm font-medium text-white bg-gray-800 rounded-lg shadow-lg max-w-xs transition-all duration-150 ease-out"
            style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? 'scale(1)' : 'scale(0.95)',
            }}
          >
            {text}
          </div>
        </div>
      )}
    </div>
  );
}
