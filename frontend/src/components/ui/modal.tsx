import { useCallback, useEffect, useRef } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function Modal({ open, onClose, children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dlg = ref.current;
    if (!dlg) return;
    if (open) {
      if (!dlg.open) dlg.showModal();
    } else if (dlg.open) {
      dlg.close();
    }
  }, [open]);

  const handleClose = useCallback(() => onClose(), [onClose]);

  const handleBackdrop = useCallback(
    (e: React.MouseEvent<HTMLDialogElement>) => {
      if (e.target === ref.current) onClose();
    },
    [onClose],
  );

  return (
    <dialog ref={ref} onClose={handleClose} onClick={handleBackdrop} className="modal-dialog">
      {open && children}
    </dialog>
  );
}

interface ModalHeaderProps {
  children: React.ReactNode;
  onClose: () => void;
  closeLabel?: string;
}

export function ModalHeader({ children, onClose, closeLabel = "Close" }: ModalHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4 pb-3 border-b border-parchment-200">
      {children}
      <button
        onClick={onClose}
        className="text-ink-soft hover:text-ink transition-colors p-1 -me-1"
        aria-label={closeLabel}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M5 5l10 10M15 5L5 15" />
        </svg>
      </button>
    </div>
  );
}
