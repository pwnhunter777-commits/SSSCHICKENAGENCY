import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { LanguageCode } from '../types';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  itemDetails?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  language?: LanguageCode;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  title,
  message,
  itemDetails,
  confirmLabel,
  cancelLabel,
  language = 'en',
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const isTamil = language === 'ta';
  const defaultTitle = title || (isTamil ? 'நீக்க வேண்டுமா?' : 'Do you want to delete?');
  const defaultConfirm = confirmLabel || (isTamil ? 'ஆம், நீக்கு' : 'Yes, Delete');
  const defaultCancel = cancelLabel || (isTamil ? 'ரத்து' : 'Cancel');

  return (
    <div
      id="confirm-delete-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={onCancel}
    >
      <div
        id="confirm-delete-modal-card"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-red-100 overflow-hidden transform animate-in zoom-in-95 duration-150"
      >
        {/* Header Icon + Close */}
        <div className="bg-red-50/80 px-5 pt-5 pb-3 border-b border-red-100 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0 shadow-xs">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 leading-snug">
                {defaultTitle}
              </h3>
              <p className="text-[11px] font-bold text-red-700">
                {isTamil ? 'இந்த செயலை திரும்பப் பெற முடியாது' : 'This action cannot be undone'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-xl hover:bg-red-100/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4 space-y-2.5">
          <p className="text-xs sm:text-sm font-semibold text-slate-700 leading-relaxed">
            {message}
          </p>

          {itemDetails && (
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 break-words">
              {itemDetails}
            </div>
          )}
        </div>

        {/* Action Buttons: Cancel vs Delete */}
        <div className="px-5 pb-5 pt-1 grid grid-cols-2 gap-2.5">
          <button
            id="btn-confirm-delete-cancel"
            type="button"
            onClick={onCancel}
            className="py-2.5 px-4 bg-slate-700 hover:bg-slate-800 active:bg-slate-900 text-white rounded-xl font-black text-xs sm:text-sm shadow-md transition-all active:scale-95"
          >
            {defaultCancel}
          </button>
          <button
            id="btn-confirm-delete-yes"
            type="button"
            onClick={onConfirm}
            className="py-2.5 px-4 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-xl font-black text-xs sm:text-sm shadow-md shadow-red-600/25 transition-all active:scale-95 flex items-center justify-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{defaultConfirm}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
