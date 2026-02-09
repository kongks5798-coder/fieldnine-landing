"use client";

import { useEffect, useState, useCallback } from "react";
import { X, Check, AlertCircle, Loader2, Copy } from "lucide-react";

export interface ToastItem {
  id: string;
  type: "success" | "error" | "loading" | "info";
  message: string;
  url?: string;
}

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-[360px]">
      {toasts.map((t) => (
        <ToastMessage key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastMessage({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: string) => void }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (toast.type === "loading") return;
    const timer = setTimeout(() => onDismiss(toast.id), 5000);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  const handleCopy = useCallback(() => {
    if (!toast.url) return;
    navigator.clipboard.writeText(toast.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [toast.url]);

  const iconMap = {
    success: <Check size={14} className="text-[#00b894]" />,
    error: <AlertCircle size={14} className="text-[#f87171]" />,
    loading: <Loader2 size={14} className="animate-spin text-[#0079f2]" />,
    info: <Check size={14} className="text-[#60a5fa]" />,
  };

  const borderMap = {
    success: "border-[#00b894]/30",
    error: "border-[#f87171]/30",
    loading: "border-[#0079f2]/30",
    info: "border-[#60a5fa]/30",
  };

  return (
    <div
      className={`flex items-start gap-2 px-3 py-2.5 bg-[var(--r-surface)] border ${borderMap[toast.type]} rounded-xl shadow-lg animate-in slide-in-from-right text-[12px]`}
    >
      <span className="mt-0.5 shrink-0">{iconMap[toast.type]}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[var(--r-text)] leading-relaxed">{toast.message}</p>
        {toast.url && (
          <div className="flex items-center gap-1.5 mt-1">
            <a
              href={toast.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#0079f2] hover:underline truncate text-[11px]"
            >
              {toast.url}
            </a>
            <button
              type="button"
              onClick={handleCopy}
              className="shrink-0 p-0.5 text-[var(--r-text-secondary)] hover:text-[var(--r-text)] rounded transition-colors"
            >
              {copied ? <Check size={10} className="text-[#00b894]" /> : <Copy size={10} />}
            </button>
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 p-0.5 text-[var(--r-text-muted)] hover:text-[var(--r-text)] rounded transition-colors"
      >
        <X size={12} />
      </button>
    </div>
  );
}

/** Hook for managing toasts */
export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((toast: Omit<ToastItem, "id">) => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    setToasts((prev) => [...prev, { ...toast, id }]);
    return id;
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const updateToast = useCallback((id: string, updates: Partial<Omit<ToastItem, "id">>) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  }, []);

  return { toasts, addToast, dismissToast, updateToast };
}
