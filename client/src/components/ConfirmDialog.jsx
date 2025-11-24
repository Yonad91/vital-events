import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export default function ConfirmDialog({
  open,
  title = "Confirm Action",
  message = "Are you sure you want to proceed?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  loading = false,
  containerSelector,
}) {
  const [container, setContainer] = useState(null);

  useEffect(() => {
    if (!containerSelector || typeof document === "undefined") {
      setContainer(null);
      return;
    }
    const target = document.querySelector(containerSelector);
    setContainer(target);
  }, [containerSelector, open]);

  if (!open) return null;

  const overlayClass =
    containerSelector && container
      ? "absolute inset-0"
      : "fixed inset-0";

  const content = (
    <div
      className={`${overlayClass} z-[9999] flex items-start justify-center pt-4 sm:pt-6 pointer-events-none`}
    >
      <div
        className="bg-white rounded-xl shadow-lg min-w-[320px] max-w-full w-full max-w-md p-6 relative pointer-events-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialogTitle"
        aria-describedby="dialogDesc"
      >
        <h2 id="dialogTitle" className="text-lg font-bold mb-2">
          {title}
        </h2>
        <p id="dialogDesc" className="text-gray-700 mb-5">{message}</p>
        <div className="flex gap-2 justify-end">
          <button
            className="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 mr-2"
            onClick={onCancel}
            disabled={loading}
            autoFocus
          >
            {cancelText}
          </button>
          <button
            className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white disabled:opacity-60"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Processing..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );

  if (container) {
    return createPortal(content, container);
  }

  return createPortal(content, document.body);
}
