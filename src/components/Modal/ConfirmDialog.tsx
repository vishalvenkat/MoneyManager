import React from 'react';
import { Modal } from './Modal';
import { AlertTriangle, AlertCircle, Info, CheckCircle2, Loader2 } from 'lucide-react';
import './ConfirmDialog.css';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  showCancel?: boolean;
  variant?: 'danger' | 'warning' | 'info' | 'success';
  isLoading?: boolean;
}

/**
 * Standardized Alert / Confirmation Dialog component used uniformly across all pages.
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  showCancel = true,
  variant = 'danger',
  isLoading = false,
}) => {
  const getIcon = () => {
    switch (variant) {
      case 'danger':
        return <AlertTriangle size={24} className="confirm-icon-danger" />;
      case 'warning':
        return <AlertCircle size={24} className="confirm-icon-warning" />;
      case 'success':
        return <CheckCircle2 size={24} className="confirm-icon-success" />;
      default:
        return <Info size={24} className="confirm-icon-info" />;
    }
  };

  const getButtonClass = () => {
    switch (variant) {
      case 'danger':
        return 'btn btn-danger';
      case 'warning':
        return 'btn btn-warning';
      case 'success':
        return 'btn btn-success';
      default:
        return 'btn btn-primary';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={isLoading ? () => {} : onClose}
      title={title}
      size="sm"
      className="confirm-dialog-modal"
    >
      <div className="confirm-dialog-body">
        <div className={`confirm-icon-wrapper confirm-variant-${variant}`}>
          {getIcon()}
        </div>
        <div className="confirm-content">
          <p className="confirm-message">{message}</p>
        </div>
      </div>
      <div className="modal-footer confirm-footer">
        {showCancel && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelLabel}
          </button>
        )}
        <button
          type="button"
          className={getButtonClass()}
          onClick={onConfirm}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 size={16} className="btn-spinner" />
              <span>Processing...</span>
            </>
          ) : (
            confirmLabel
          )}
        </button>
      </div>
    </Modal>
  );
};
