import React from 'react';

import { Button } from '@/components/Button';
import { UI_Z_INDEX, getZIndexStyle } from '@/constants/zIndex';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ ...getZIndexStyle(UI_Z_INDEX.MODALS) }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-md" />

      <div className="mx-4 w-full max-w-md rounded-2xl border border-gray-600/50 bg-gray-900/95 p-8 shadow-xl backdrop-blur-md">
        <h2 className="mb-4 bg-gradient-to-r from-white to-slate-300 bg-clip-text text-xl font-bold text-transparent">
          {title}
        </h2>
        <p className="mb-6 text-gray-300">{message}</p>
        <div className="flex justify-end gap-3">
          <Button onClick={onClose} variant="secondary" size="md">
            Cancel
          </Button>
          <Button onClick={onConfirm} variant="warning" size="md">
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
};
