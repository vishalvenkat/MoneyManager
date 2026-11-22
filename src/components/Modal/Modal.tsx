import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import './Modal.css';

const activeModalStack: (() => void)[] = [];

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  layer?: 'base' | 'elevated' | 'alert';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  footer,
  size = 'md',
  className = '',
  layer = 'base',
}) => {
  useEffect(() => {
    if (!isOpen) return;

    activeModalStack.push(onClose);
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const topOnClose = activeModalStack[activeModalStack.length - 1];
        if (topOnClose === onClose) {
          e.stopPropagation();
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      const index = activeModalStack.lastIndexOf(onClose);
      if (index !== -1) {
        activeModalStack.splice(index, 1);
      }
      if (activeModalStack.length === 0) {
        document.body.style.overflow = 'unset';
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const layerClass = layer === 'alert'
    ? 'modal-layer-alert'
    : (layer === 'elevated' ? 'modal-layer-elevated' : '');

  const modalElement = (
    <div 
      className={`modal-overlay ${layerClass}`} 
      onClick={onClose} 
      role="dialog" 
      aria-modal="true" 
      aria-labelledby="modal-title"
    >
      <div 
        className={`modal-content modal-${size} ${className}`} 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-header-text">
            {icon && <span className="modal-header-icon">{icon}</span>}
            <div>
              <h3 id="modal-title">{title}</h3>
              {subtitle && <p className="modal-subtitle">{subtitle}</p>}
            </div>
          </div>
          <button className="icon-btn-small modal-close-btn" onClick={onClose} aria-label="Close dialog">
            <X size={20} />
          </button>
        </div>
        <div className="modal-body">
          {children}
        </div>
        {footer && (
          <div className="modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalElement, document.body)
    : modalElement;
};
