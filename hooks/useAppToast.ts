import { useToastStore } from '../store/toastStore';

export const useAppToast = () => {
  const toast = useToastStore();

  return {
    toast,
    showToast: toast.showToast,
    hideToast: toast.hideToast,
  };
};
