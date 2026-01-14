/**
 * PasswordStrength Component
 *
 * Barra visual de fortaleza de contraseña.
 * Muestra indicadores de requisitos cumplidos.
 */

'use client';

import { useMemo } from 'react';
import { Check, X } from 'lucide-react';

interface PasswordStrengthProps {
  password: string;
  showRequirements?: boolean;
}

interface Requirement {
  label: string;
  met: boolean;
}

export default function PasswordStrength({
  password,
  showRequirements = true,
}: PasswordStrengthProps) {
  const requirements = useMemo((): Requirement[] => {
    return [
      { label: 'Al menos 8 caracteres', met: password.length >= 8 },
      { label: 'Una letra mayúscula', met: /[A-Z]/.test(password) },
      { label: 'Un número', met: /[0-9]/.test(password) },
    ];
  }, [password]);

  const strength = useMemo(() => {
    const metCount = requirements.filter((r) => r.met).length;
    if (metCount === 0) return { level: 0, label: '', color: 'bg-gray-200' };
    if (metCount === 1) return { level: 1, label: 'Débil', color: 'bg-red-500' };
    if (metCount === 2) return { level: 2, label: 'Media', color: 'bg-yellow-500' };
    return { level: 3, label: 'Fuerte', color: 'bg-green-500' };
  }, [requirements]);

  if (!password) return null;

  return (
    <div className="space-y-2">
      {/* Barra de fortaleza */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden flex gap-0.5">
          {[1, 2, 3].map((level) => (
            <div
              key={level}
              className={`flex-1 h-full transition-all duration-300 ${
                strength.level >= level ? strength.color : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
        {strength.label && (
          <span
            className={`text-xs font-medium ${
              strength.level === 1
                ? 'text-red-600'
                : strength.level === 2
                ? 'text-yellow-600'
                : 'text-green-600'
            }`}
          >
            {strength.label}
          </span>
        )}
      </div>

      {/* Lista de requisitos */}
      {showRequirements && (
        <ul className="space-y-1">
          {requirements.map((req, index) => (
            <li
              key={index}
              className={`flex items-center gap-2 text-xs transition-colors ${
                req.met ? 'text-green-600' : 'text-gray-500'
              }`}
            >
              {req.met ? (
                <Check className="w-3 h-3" />
              ) : (
                <X className="w-3 h-3" />
              )}
              {req.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
