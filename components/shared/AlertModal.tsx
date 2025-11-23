// ============================================================================
// COMPONENT: AlertModal (Reutilizable)
// ============================================================================
// Descripción: Modal de alerta elegante y responsivo (solo botón OK)
// Uso: Reemplaza alert() del navegador
// Sesión: 54
// ============================================================================

'use client';

import { X, AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-react';

interface AlertModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  variant?: 'danger' | 'warning' | 'info' | 'success';
  okText?: string;
  onOk: () => void;
}

export default function AlertModal({
  isOpen,
  title,
  message,
  variant = 'info',
  okText = 'Aceptar',
  onOk,
}: AlertModalProps) {
  if (!isOpen) return null;

  // Colores según variante
  const variants = {
    danger: {
      icon: XCircle,
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      okBg: 'bg-red-600 hover:bg-red-700',
      borderColor: 'border-red-200',
    },
    warning: {
      icon: AlertTriangle,
      iconBg: 'bg-yellow-100',
      iconColor: 'text-yellow-600',
      okBg: 'bg-yellow-600 hover:bg-yellow-700',
      borderColor: 'border-yellow-200',
    },
    info: {
      icon: Info,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      okBg: 'bg-blue-600 hover:bg-blue-700',
      borderColor: 'border-blue-200',
    },
    success: {
      icon: CheckCircle,
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      okBg: 'bg-green-600 hover:bg-green-700',
      borderColor: 'border-green-200',
    },
  };

  const config = variants[variant];
  const Icon = config.icon;

  // ESC key handler
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' || e.key === 'Enter') {
      onOk();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50 transition-opacity"
        onClick={onOk}
      />

      {/* Modal */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onKeyDown={handleKeyDown}
      >
        <div className="bg-white rounded-lg shadow-2xl w-full max-w-md transform transition-all">
          {/* Header */}
          <div className="p-6">
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className={`flex-shrink-0 ${config.iconBg} rounded-full p-3`}>
                <Icon className={`w-6 h-6 ${config.iconColor}`} />
              </div>

              {/* Content */}
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {title}
                </h3>
                <p className="text-sm text-gray-600 whitespace-pre-line">
                  {message}
                </p>
              </div>

              {/* Close button */}
              <button
                onClick={onOk}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 rounded-b-lg flex gap-3 justify-end">
            <button
              onClick={onOk}
              className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${config.okBg}`}
            >
              {okText}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
