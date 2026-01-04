'use client';

import { useState } from 'react';
import { FileText, Download, Loader2 } from 'lucide-react';
import AlertModal from '@/components/shared/AlertModal';
import {
  getConstanciaSeparacionDataForDownload,
  getConstanciaAbonoDataForDownload,
  getConstanciaCancelacionDataForDownload,
} from '@/lib/actions-constancias';

interface GenerarConstanciaButtonProps {
  controlPagoId: string;
  tipo: 'separacion' | 'abono' | 'cancelacion';
  abonoId?: string; // Solo para tipo 'abono'
  disabled?: boolean;
  className?: string;
}

export default function GenerarConstanciaButton({
  controlPagoId,
  tipo,
  abonoId,
  disabled = false,
  className = '',
}: GenerarConstanciaButtonProps) {
  const [loading, setLoading] = useState(false);
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant: 'success' | 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    variant: 'info',
  });

  const handleGenerar = async () => {
    setLoading(true);
    try {
      let result: { success: boolean; base64?: string; fileName?: string; error?: string };

      if (tipo === 'separacion') {
        result = await getConstanciaSeparacionDataForDownload(controlPagoId);
      } else if (tipo === 'abono' && abonoId) {
        result = await getConstanciaAbonoDataForDownload(abonoId);
      } else if (tipo === 'cancelacion') {
        result = await getConstanciaCancelacionDataForDownload(controlPagoId);
      } else {
        throw new Error('Tipo de constancia no válido');
      }

      if (!result.success || !result.base64) {
        throw new Error(result.error || 'No se pudo generar la constancia');
      }

      // Convertir base64 a blob y descargar
      const binaryString = atob(result.base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.fileName || `constancia-${tipo}-${Date.now()}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setAlertModal({
        isOpen: true,
        title: 'Constancia Generada',
        message: 'El documento se descargó correctamente',
        variant: 'success',
      });
    } catch (error) {
      console.error('Error generando constancia:', error);
      setAlertModal({
        isOpen: true,
        title: 'Error al Generar',
        message: error instanceof Error ? error.message : 'No se pudo generar la constancia',
        variant: 'danger',
      });
    } finally {
      setLoading(false);
    }
  };

  const getButtonStyles = () => {
    const baseStyles =
      'flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed';

    switch (tipo) {
      case 'separacion':
        return `${baseStyles} bg-teal-600 text-white hover:bg-teal-700 focus:ring-2 focus:ring-teal-500 focus:ring-offset-2`;
      case 'abono':
        return `${baseStyles} bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`;
      case 'cancelacion':
        return `${baseStyles} bg-green-700 text-white hover:bg-green-800 focus:ring-2 focus:ring-green-600 focus:ring-offset-2`;
      default:
        return baseStyles;
    }
  };

  const getButtonLabel = () => {
    switch (tipo) {
      case 'separacion':
        return 'Constancia de Separación';
      case 'abono':
        return 'Constancia de Abono';
      case 'cancelacion':
        return 'Constancia de Cancelación';
      default:
        return 'Generar Constancia';
    }
  };

  const getAriaLabel = () => {
    switch (tipo) {
      case 'separacion':
        return 'Generar constancia de separación';
      case 'abono':
        return 'Generar constancia de abono';
      case 'cancelacion':
        return 'Generar constancia de cancelación total';
      default:
        return 'Generar constancia';
    }
  };

  return (
    <>
      <button
        onClick={handleGenerar}
        disabled={disabled || loading}
        aria-label={getAriaLabel()}
        className={`${getButtonStyles()} ${className}`}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Generando...</span>
          </>
        ) : (
          <>
            <FileText className="w-4 h-4" />
            <span>{getButtonLabel()}</span>
            <Download className="w-4 h-4" />
          </>
        )}
      </button>

      <AlertModal
        isOpen={alertModal.isOpen}
        title={alertModal.title}
        message={alertModal.message}
        variant={alertModal.variant}
        onOk={() => setAlertModal({ ...alertModal, isOpen: false })}
      />
    </>
  );
}
