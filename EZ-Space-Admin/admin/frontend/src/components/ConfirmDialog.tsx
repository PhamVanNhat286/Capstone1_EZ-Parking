'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Pill } from './Pill';

export interface ConfirmDialogOptions {
  title: string;
  targetName: string;
  targetSub?: string;
  statusTone?: string;
  statusLabel?: string;
  description?: string;
  withReason?: boolean;
  requireReason?: boolean;
  reasonLabel?: string;
  reasonPlaceholder?: string;
  suggestions?: string[];
  confirmText?: string;
  confirmStyle?: string;
}

interface ConfirmDialogProps {
  options: ConfirmDialogOptions;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}

export function ConfirmDialog({ options, onCancel, onConfirm }: ConfirmDialogProps) {
  const [reason, setReason] = useState('');
  const [showError, setShowError] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const submitRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (options.withReason) textareaRef.current?.focus();
      else submitRef.current?.focus();
    }, 20);
    return () => clearTimeout(timer);
  }, [options.withReason]);

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    const trimmed = reason.trim();
    if (options.requireReason && trimmed.length < 3) {
      setShowError(true);
      textareaRef.current?.focus();
      return;
    }
    onConfirm(trimmed);
  }

  return (
    <form className="flex flex-col gap-3.5" noValidate onSubmit={handleSubmit}>
      <div className="flex items-center justify-between gap-3 rounded-[11px] border border-blue-200 bg-brand-tint px-3.5 py-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <b className="text-sm text-slate-900">{options.targetName}</b>
          {options.targetSub ? (
            <small className="text-xs text-slate-500">{options.targetSub}</small>
          ) : null}
        </div>
        {options.statusTone ? (
          <Pill tone={options.statusTone} label={options.statusLabel} />
        ) : null}
      </div>

      {options.description ? (
        <p className="text-[13px] leading-[1.55] text-slate-600">{options.description}</p>
      ) : null}

      {options.withReason ? (
        <div className="flex flex-col gap-2">
          <label htmlFor="dialog-reason" className="text-[12.5px] font-bold text-slate-900">
            {options.reasonLabel || 'Lý do thực hiện'}{' '}
            {options.requireReason ? (
              <span className="text-red-600">*</span>
            ) : (
              <span className="text-xs font-normal text-slate-500">(Tùy chọn)</span>
            )}
          </label>
          {options.suggestions && options.suggestions.length > 0 ? (
            <div className="flex flex-wrap gap-1.5" aria-label="Gợi ý nhanh">
              {options.suggestions.map(text => (
                <button
                  key={text}
                  type="button"
                  className="rounded-full border border-blue-200 bg-slate-50 px-2.5 py-[5px] text-[11.5px] font-semibold text-slate-600 transition-colors hover:border-blue-300 hover:bg-brand-tint hover:text-brand"
                  onClick={() => {
                    setReason(text);
                    setShowError(false);
                    textareaRef.current?.focus();
                  }}
                >
                  {text}
                </button>
              ))}
            </div>
          ) : null}
          <textarea
            ref={textareaRef}
            id="dialog-reason"
            className="w-full resize-y rounded-[10px] border border-slate-300 bg-white px-3 py-2.5 text-[13px] leading-normal text-slate-900 transition hover:border-blue-300 focus-visible:border-brand focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand/15"
            rows={3}
            maxLength={250}
            placeholder={options.reasonPlaceholder || 'Nhập lý do...'}
            value={reason}
            onChange={e => {
              setReason(e.target.value);
              if (e.target.value.trim().length >= 3) setShowError(false);
            }}
          />
          {showError ? (
            <div className="text-xs font-semibold text-red-600">
              Vui lòng nhập lý do tối thiểu 3 ký tự.
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="flex justify-end gap-2.5 pt-1.5">
        <button type="button" className="btn" onClick={onCancel}>
          Hủy bỏ
        </button>
        <button
          ref={submitRef}
          type="submit"
          className={`btn ${options.confirmStyle || 'btn-primary'}`}
        >
          {options.confirmText || 'Xác nhận'}
        </button>
      </div>
    </form>
  );
}
