/**
 * Toast Context
 * 
 * Manages toast notifications for user feedback.
 * Provides functions to show success, error, and info messages.
 * 
 * @context ToastContext
 */

import React, { createContext, useContext, useState, useCallback } from 'react';

/**
 * Toast context object
 * @type {React.Context<Object|null>}
 */
const ToastContext = createContext(null);

/**
 * Toast context provider component
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @returns {React.ReactNode} Provider with toast state
 */
export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);

  const showToast = useCallback((text, type = 'success') => {
    setToast({ text, type, id: Date.now() });
    setTimeout(() => setToast(null), 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && <div className={`toast ${toast.type}`}>{toast.text}</div>}
    </ToastContext.Provider>
  );
}

/**
 * Hook to access toast context
 * 
 * @returns {Object} Toast context value with showToast function
 * @throws {Error} If used outside ToastProvider
 */
export function useToast() {
  return useContext(ToastContext);
}
