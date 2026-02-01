import { toast as sonnerToast } from 'sonner';

export const toast = {
  success: (message: string) => {
    sonnerToast.success(message, {
      duration: 3000,
    });
  },
  error: (message: string) => {
    sonnerToast.error(message, {
      duration: 4000,
    });
  },
  info: (message: string) => {
    sonnerToast.info(message, {
      duration: 3000,
    });
  },
  warning: (message: string) => {
    sonnerToast.warning(message, {
      duration: 3000,
    });
  },
};

// Helper function để thay thế window.confirm với Sonner
// Sử dụng toast với action buttons
export const showConfirm = (message: string): Promise<boolean> => {
  return new Promise((resolve) => {
    const toastId = sonnerToast(message, {
      duration: Infinity,
      action: {
        label: 'Xác nhận',
        onClick: () => {
          sonnerToast.dismiss(toastId);
          resolve(true);
        },
      },
      cancel: {
        label: 'Hủy',
        onClick: () => {
          sonnerToast.dismiss(toastId);
          resolve(false);
        },
      },
    });
  });
};
