import { create } from 'zustand'

// Global UI state management
export const useUIStore = create((set) => ({
  // Toast notifications
  toasts: [],
  addToast: (message, type = 'info', duration = 3000) => set((state) => {
    const id = Date.now()
    const newToast = { id, message, type }

    if (duration > 0) {
      setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), duration)
    }

    return { toasts: [...state.toasts, newToast] }
  }),
  removeToast: (id) => set((state) => ({
    toasts: state.toasts.filter((t) => t.id !== id),
  })),
  clearToasts: () => set({ toasts: [] }),

  // Loading states
  loading: {},
  setLoading: (key, value) => set((state) => ({
    loading: { ...state.loading, [key]: value },
  })),

  // Error tracking
  errors: {},
  setError: (key, error) => set((state) => ({
    errors: { ...state.errors, [key]: error },
  })),
  clearError: (key) => set((state) => ({
    errors: Object.fromEntries(Object.entries(state.errors).filter(([k]) => k !== key)),
  })),
  clearAllErrors: () => set({ errors: {} }),

  // Modal states
  modals: {},
  openModal: (name, data = {}) => set((state) => ({
    modals: { ...state.modals, [name]: { open: true, data } },
  })),
  closeModal: (name) => set((state) => ({
    modals: { ...state.modals, [name]: { open: false, data: {} } },
  })),
}))
