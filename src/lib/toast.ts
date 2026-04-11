export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

let toastIdCounter = 0;

export function createToast(type: ToastType, message: string, duration?: number): ToastMessage {
  return {
    id: `toast-${++toastIdCounter}-${Date.now()}`,
    type,
    message,
    duration
  };
}
