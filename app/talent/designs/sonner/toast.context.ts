import { type ReactNode } from "react";
import { create } from "zustand";

type toastFormat = "default" | "message" | "success" | "error";

interface ToastOptions {
  description?: string;
  type?: toastFormat;
}

interface ToastMethods {
  (msg: string, options?: ToastOptions): void;
  message: (msg: string, options?: ToastOptions) => void;
  success: (msg: string, options?: ToastOptions) => void;
  error: (msg: string, options?: ToastOptions) => void;
}

interface ToastValuesTypes {
  id: string;
  message: string;
  description?: string;
  actions?: ReactNode;
  type: toastFormat;
}

interface toastTypes {
  toastValues: ToastValuesTypes[] | null;
  toast: ToastMethods;
}

export const useToastStore = create<toastTypes>((set) => ({
  toastValues: null,
  toast: ((msg: string, options?: ToastOptions) => {
    const newToast: ToastValuesTypes = {
      id: Math.random().toString(36).substring(7),
      message: msg,
      description: options?.description,
      type: options?.type || "default",
    };

    set((state) => ({
      toastValues: state.toastValues
        ? [...state.toastValues, newToast]
        : [newToast],
    }));
  }) as ToastMethods,
}));

// Define additional methods
useToastStore.getState().toast.error = (
  msg: string,
  options?: ToastOptions
) => {
  useToastStore.getState().toast(msg, { ...options, type: "error" });
};

useToastStore.getState().toast.success = (
  msg: string,
  options?: ToastOptions
) => {
  useToastStore.getState().toast(msg, { ...options, type: "success" });
};

useToastStore.getState().toast.message = (
  msg: string,
  options?: ToastOptions
) => {
  useToastStore.getState().toast(msg, { ...options, type: "message" });
};
