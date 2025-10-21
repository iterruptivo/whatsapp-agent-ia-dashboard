import { useState, useCallback } from 'react';
import { DialogType, DialogVariant } from '@/components/ui/ConfirmDialog';

interface DialogConfig {
  title: string;
  message: string;
  type?: DialogType;
  variant?: DialogVariant;
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
  onConfirm?: () => void;
}

export function useConfirmDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<DialogConfig>({
    title: '',
    message: '',
    type: 'confirm',
    variant: 'default',
    confirmText: 'Confirmar',
    cancelText: 'Cancelar',
    showCancel: true,
  });

  const showDialog = useCallback((dialogConfig: DialogConfig) => {
    setConfig({
      type: 'confirm',
      variant: 'default',
      confirmText: 'Confirmar',
      cancelText: 'Cancelar',
      showCancel: true,
      ...dialogConfig,
    });
    setIsOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Promise-based API for async/await usage
  const confirm = useCallback(
    (dialogConfig: Omit<DialogConfig, 'onConfirm'>): Promise<boolean> => {
      return new Promise((resolve) => {
        showDialog({
          ...dialogConfig,
          onConfirm: () => resolve(true),
        });

        // Resolve false if dialog is closed without confirm
        const timeoutId = setTimeout(() => {
          if (!isOpen) resolve(false);
        }, 100);

        return () => clearTimeout(timeoutId);
      });
    },
    [showDialog, isOpen]
  );

  return {
    isOpen,
    config,
    showDialog,
    closeDialog,
    confirm,
  };
}
