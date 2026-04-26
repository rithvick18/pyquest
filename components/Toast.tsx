import React, { useState, useEffect, useCallback } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
    id: string;
    type: ToastType;
    title: string;
    message?: string;
    duration?: number;
}

interface ToastProps {
    toast: ToastMessage;
    onDismiss: (id: string) => void;
}

const ToastItem: React.FC<ToastProps> = ({ toast, onDismiss }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onDismiss(toast.id);
        }, toast.duration || 4000);

        return () => clearTimeout(timer);
    }, [toast, onDismiss]);

    const icons: Record<ToastType, string> = {
        success: 'fa-circle-check',
        error: 'fa-circle-xmark',
        info: 'fa-circle-info',
        warning: 'fa-triangle-exclamation'
    };

    const colors: Record<ToastType, string> = {
        success: 'bg-emerald-500/10 border-emerald-500/50 text-emerald-500',
        error: 'bg-red-500/10 border-red-500/50 text-red-500',
        info: 'bg-blue-500/10 border-blue-500/50 text-blue-500',
        warning: 'bg-yellow-500/10 border-yellow-500/50 text-yellow-500'
    };

    return (
        <div
            className={`
        flex items-start gap-3 p-4 rounded-xl border backdrop-blur-md shadow-xl
        animate-in slide-in-from-right-5 duration-300
        ${colors[toast.type]}
      `}
        >
            <i className={`fa-solid ${icons[toast.type]} text-lg mt-0.5`}></i>
            <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-[var(--text-primary)]">{toast.title}</p>
                {toast.message && (
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">{toast.message}</p>
                )}
            </div>
            <button
                onClick={() => onDismiss(toast.id)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
                <i className="fa-solid fa-xmark"></i>
            </button>
        </div>
    );
};

// Toast container component
interface ToastContainerProps {
    toasts: ToastMessage[];
    onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
    if (toasts.length === 0) return null;

    return (
        <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
            {toasts.map(toast => (
                <div key={toast.id} className="pointer-events-auto">
                    <ToastItem toast={toast} onDismiss={onDismiss} />
                </div>
            ))}
        </div>
    );
};

// Custom hook for managing toasts
export function useToast() {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const addToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
        const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        setToasts(prev => [...prev, { ...toast, id }]);
        return id;
    }, []);

    const dismissToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const success = useCallback((title: string, message?: string) => {
        return addToast({ type: 'success', title, message });
    }, [addToast]);

    const error = useCallback((title: string, message?: string) => {
        return addToast({ type: 'error', title, message, duration: 6000 });
    }, [addToast]);

    const info = useCallback((title: string, message?: string) => {
        return addToast({ type: 'info', title, message });
    }, [addToast]);

    const warning = useCallback((title: string, message?: string) => {
        return addToast({ type: 'warning', title, message, duration: 5000 });
    }, [addToast]);

    return {
        toasts,
        addToast,
        dismissToast,
        success,
        error,
        info,
        warning
    };
}

export default ToastContainer;
