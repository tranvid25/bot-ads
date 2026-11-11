import React, { useEffect, useRef } from "react";

export default function Dialog({ title, children, onClose, error, className = "" }) {
  const dialogRef = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const previous = document.activeElement;
    const bodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const dialog = dialogRef.current;
    dialog?.focus();

    const keydown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeRef.current();
      }
      if (e.key === "Tab") {
        const nodes = [
          ...dialog.querySelectorAll(
            'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]',
          ),
        ].filter((n) => n.getClientRects().length);
        const first = nodes[0],
          last = nodes.at(-1);
        if (!first) {
          e.preventDefault();
          return;
        }
        if (
          e.shiftKey &&
          (document.activeElement === first || document.activeElement === dialog)
        ) {
          e.preventDefault();
          last.focus();
        } else if (
          !e.shiftKey &&
          (document.activeElement === last || document.activeElement === dialog)
        ) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    dialog?.addEventListener("keydown", keydown);
    return () => {
      dialog?.removeEventListener("keydown", keydown);
      document.body.style.overflow = bodyOverflow;
      previous?.focus();
    };
  }, []);

  return (
    <div
      className="mk-overlay buffer-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className={`mk-dialog buffer-modal-dialog ${className}`}
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {!className.includes("buffer-composer-dialog") && (
          <div className="section-title buffer-modal-header">
            <div className="buffer-modal-title-wrap">
              <h2>{title}</h2>
            </div>
            <button
              type="button"
              className="secondary buffer-modal-close"
              onClick={onClose}
              aria-label="Đóng"
            >
              Đóng
            </button>
          </div>
        )}
        {error && (
          <div className="alert error" role="alert">
            {error}
          </div>
        )}
        <div className="buffer-modal-content">{children}</div>
      </section>
    </div>
  );
}

