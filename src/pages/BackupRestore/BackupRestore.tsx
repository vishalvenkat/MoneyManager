import React, { useState, useMemo, useRef } from 'react';
import { useTransactions } from '../../context/TransactionContext';
import { useAccounts } from '../../context/AccountContext';
import { useCategories } from '../../context/CategoryContext';
import { useAuth } from '../../context/AuthContext';
import { excelService, type ImportSummary } from '../../services/excelService';
import { jsonBackupService, type ValidatedBackupData } from '../../services/jsonBackupService';
import { Modal } from '../../components/Modal/Modal';
import { Download, Upload, FileText, Database, FileSpreadsheet, CheckCircle2, AlertCircle, Filter, AlertTriangle, RefreshCw, FileCode } from 'lucide-react';
import { subMonths, format } from 'date-fns';
import { getAvailableYears } from '../../utils/reportUtils';
import './BackupRestore.css';

export type ExportRangeType = 'all' | 'monthly' | 'last6months' | 'last12months' | 'custom';

export const BackupRestore: React.FC = () => {
  const { transactions } = useTransactions();
  const { accounts } = useAccounts();
  const { categories } = useCategories();
  const { currentUser } = useAuth();

  // Export Filter State
  const [exportRange, setExportRange] = useState<ExportRangeType>('all');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  // Excel Import State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ processed: number; total: number }>({ processed: 0, total: 0 });
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // JSON Restore State
  const [jsonFile, setJsonFile] = useState<File | null>(null);
  const [validatedJsonData, setValidatedJsonData] = useState<ValidatedBackupData | null>(null);
  const [jsonParseError, setJsonParseError] = useState<string | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreStatusMessage, setRestoreStatusMessage] = useState<string>('');
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const jsonFileInputRef = useRef<HTMLInputElement>(null);

  // Dynamic list of available years for monthly export filter
  const availableYears = useMemo(() => getAvailableYears(transactions), [transactions]);

  // Filter transactions for export based on user selection
  const filteredExportTransactions = useMemo(() => {
    return transactions.filter(t => {
      const tDate = new Date(t.date);

      if (exportRange === 'all') {
        return true;
      }

      if (exportRange === 'monthly') {
        return tDate.getFullYear() === selectedYear && tDate.getMonth() === selectedMonth;
      }

      if (exportRange === 'last6months') {
        const sixMonthsAgo = subMonths(new Date(), 6);
        return tDate >= sixMonthsAgo;
      }

      if (exportRange === 'last12months') {
        const twelveMonthsAgo = subMonths(new Date(), 12);
        return tDate >= twelveMonthsAgo;
      }

      if (exportRange === 'custom') {
        if (customStartDate) {
          const start = new Date(`${customStartDate}T00:00:00Z`).getTime();
          if (tDate.getTime() < start) return false;
        }
        if (customEndDate) {
          const end = new Date(`${customEndDate}T23:59:59Z`).getTime();
          if (tDate.getTime() > end) return false;
        }
        return true;
      }

      return true;
    });
  }, [transactions, exportRange, selectedYear, selectedMonth, customStartDate, customEndDate]);

  // Download Template Handler
  const handleDownloadTemplate = () => {
    excelService.downloadExcelTemplate();
  };

  // Execute Excel Export
  const handleExportExcel = () => {
    let filename = 'MoneyManager_Export_AllTime.xlsx';

    if (exportRange === 'monthly') {
      const monthName = format(new Date(selectedYear, selectedMonth, 1), 'MMM_yyyy');
      filename = `MoneyManager_Export_${monthName}.xlsx`;
    } else if (exportRange === 'last6months') {
      filename = 'MoneyManager_Export_Last6Months.xlsx';
    } else if (exportRange === 'last12months') {
      filename = 'MoneyManager_Export_Last12Months.xlsx';
    } else if (exportRange === 'custom') {
      const startTag = customStartDate || 'start';
      const endTag = customEndDate || 'end';
      filename = `MoneyManager_Export_${startTag}_to_${endTag}.xlsx`;
    }

    excelService.exportTransactionsToExcel(filteredExportTransactions, accounts, categories, filename);
  };

  // JSON Export Handler
  const handleExportJSON = () => {
    const backupData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      accounts,
      categories,
      transactions,
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MoneyManager_FullBackup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Excel Import File Handler
  const handleOpenImportModal = () => {
    setSelectedFile(null);
    setIsImporting(false);
    setImportProgress({ processed: 0, total: 0 });
    setImportSummary(null);
    setImportError(null);
    setIsImportModalOpen(true);
  };

  const handleCloseImportModal = () => {
    if (isImporting) return;
    setIsImportModalOpen(false);
    setSelectedFile(null);
    setImportSummary(null);
    setImportError(null);
  };

  const handleExcelFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setImportError(null);
    }
  };

  // Execute Excel Import
  const handleExecuteImport = async () => {
    if (!selectedFile || !currentUser) return;

    setIsImporting(true);
    setImportError(null);
    setImportProgress({ processed: 0, total: 0 });

    try {
      const summary = await excelService.importTransactionsFromExcel(
        selectedFile,
        currentUser.uid,
        accounts,
        categories,
        (processed, total) => {
          setImportProgress({ processed, total });
        }
      );
      setImportSummary(summary);
    } catch (err: any) {
      console.error('Excel Import Error:', err);
      setImportError(err.message || 'Failed to parse and import Excel file.');
    } finally {
      setIsImporting(false);
    }
  };

  // --- JSON Restore Handlers ---
  const handleJsonFileSelect = (file: File) => {
    setJsonFile(file);
    setJsonParseError(null);
    setValidatedJsonData(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const validated = jsonBackupService.validateBackupJSON(text);
        setValidatedJsonData(validated);
      } catch (err: any) {
        setJsonParseError(err.message || 'Failed to parse JSON backup file.');
        setValidatedJsonData(null);
      }
    };
    reader.onerror = () => {
      setJsonParseError('Failed to read selected file.');
    };
    reader.readAsText(file);
  };

  const handleJsonInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleJsonFileSelect(e.target.files[0]);
    }
  };

  const handleOpenConfirmModal = () => {
    if (!validatedJsonData) return;
    setIsConfirmModalOpen(true);
  };

  const handleExecuteJsonRestore = async () => {
    if (!currentUser || !validatedJsonData) return;

    setIsRestoring(true);
    setRestoreStatusMessage('Initializing restoration...');

    try {
      await jsonBackupService.restoreFromJSON(
        currentUser.uid,
        validatedJsonData,
        (status) => setRestoreStatusMessage(status)
      );
      setIsConfirmModalOpen(false);
      setIsSuccessModalOpen(true);
    } catch (err: any) {
      console.error('JSON Restore Error:', err);
      setJsonParseError(err.message || 'Failed to restore data from JSON backup file.');
      setIsConfirmModalOpen(false);
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="backup-restore-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Backup & Restore</h1>
          <p className="page-subtitle">Export, import, and backup your financial data and transaction records.</p>
        </div>
      </div>

      <div className="backup-cards-grid">
        {/* Card 1: Enhanced Excel Export */}
        <div className="card backup-card">
          <div className="backup-card-header">
            <div className="icon-badge icon-badge-primary">
              <Download size={22} />
            </div>
            <div>
              <h2>Export to Excel</h2>
              <p>Download transaction records as a spreadsheet with customizable date range filters.</p>
            </div>
          </div>

          <div className="export-filter-section">
            <label className="filter-section-title">
              <Filter size={15} /> Select Export Range
            </label>
            <div className="range-tabs">
              <button
                type="button"
                className={`range-tab-btn ${exportRange === 'all' ? 'active' : ''}`}
                onClick={() => setExportRange('all')}
              >
                All Time
              </button>
              <button
                type="button"
                className={`range-tab-btn ${exportRange === 'monthly' ? 'active' : ''}`}
                onClick={() => setExportRange('monthly')}
              >
                Monthly Data
              </button>
              <button
                type="button"
                className={`range-tab-btn ${exportRange === 'last6months' ? 'active' : ''}`}
                onClick={() => setExportRange('last6months')}
              >
                Last 6 Months
              </button>
              <button
                type="button"
                className={`range-tab-btn ${exportRange === 'last12months' ? 'active' : ''}`}
                onClick={() => setExportRange('last12months')}
              >
                Last 12 Months
              </button>
              <button
                type="button"
                className={`range-tab-btn ${exportRange === 'custom' ? 'active' : ''}`}
                onClick={() => setExportRange('custom')}
              >
                Custom Range
              </button>
            </div>

            {/* Sub-controls based on selection */}
            {exportRange === 'monthly' && (
              <div className="export-sub-controls">
                <div className="control-group">
                  <label>Year</label>
                  <select
                    value={selectedYear}
                    onChange={e => setSelectedYear(Number(e.target.value))}
                    className="form-input"
                  >
                    {availableYears.map(yr => (
                      <option key={yr} value={yr}>{yr}</option>
                    ))}
                  </select>
                </div>
                <div className="control-group">
                  <label>Month</label>
                  <select
                    value={selectedMonth}
                    onChange={e => setSelectedMonth(Number(e.target.value))}
                    className="form-input"
                  >
                    {[
                      'January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'
                    ].map((mName, idx) => (
                      <option key={idx} value={idx}>{mName}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {exportRange === 'custom' && (
              <div className="export-sub-controls">
                <div className="control-group">
                  <label>From Date</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={e => setCustomStartDate(e.target.value)}
                    className="form-input"
                  />
                </div>
                <div className="control-group">
                  <label>To Date</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={e => setCustomEndDate(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>
            )}

            <div className="export-summary-row">
              <span className="summary-count">
                <strong>{filteredExportTransactions.length}</strong> matching transaction{filteredExportTransactions.length === 1 ? '' : 's'} ready for export
              </span>
              <button
                type="button"
                className="btn btn-primary btn-export"
                onClick={handleExportExcel}
                disabled={filteredExportTransactions.length === 0}
              >
                <Download size={16} /> Export to Excel
              </button>
            </div>
          </div>
        </div>

        {/* Card 2: Import from Excel */}
        <div className="card backup-card">
          <div className="backup-card-header">
            <div className="icon-badge icon-badge-success">
              <Upload size={22} />
            </div>
            <div>
              <h2>Excel Import & Migration</h2>
              <p>Upload Excel files to import multi-year historical data. Missing accounts & categories are created automatically.</p>
            </div>
          </div>

          <div className="import-action-buttons">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleDownloadTemplate}
              title="Download Excel Import Template"
            >
              <FileText size={16} /> Download Excel Template
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleOpenImportModal}
              title="Import from Excel"
            >
              <Upload size={16} /> Import from Excel
            </button>
          </div>
        </div>

        {/* Card 3: Full JSON Backup & Restore */}
        <div className="card backup-card">
          <div className="backup-card-header">
            <div className="icon-badge icon-badge-warning">
              <Database size={22} />
            </div>
            <div>
              <h2>Full JSON Backup & Restore</h2>
              <p>Export a complete offline snapshot or restore a previously saved JSON backup to replace existing profile data.</p>
            </div>
          </div>

          <div className="json-sections-grid">
            {/* JSON Export Action */}
            <div className="json-action-box">
              <div className="json-box-info">
                <h3>Export JSON Backup</h3>
                <p>Save all accounts, categories, and transactions into a single JSON document.</p>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleExportJSON}
              >
                <Database size={16} /> Export JSON Backup
              </button>
            </div>

            {/* JSON Restore Dropzone & Action */}
            <div className="json-action-box json-restore-box">
              <div className="json-box-info">
                <h3>Restore from JSON Backup</h3>
                <p>Upload a JSON backup file to overwrite current profile data.</p>
              </div>

              <div
                className="json-dropzone"
                onClick={() => jsonFileInputRef.current?.click()}
              >
                <FileCode size={36} className="dropzone-icon" />
                {jsonFile ? (
                  <div className="selected-json-details">
                    <span className="file-name">{jsonFile.name}</span>
                    {validatedJsonData && (
                      <div className="preview-badges">
                        <span className="badge">{validatedJsonData.accounts.length} Accounts</span>
                        <span className="badge">{validatedJsonData.categories.length} Categories</span>
                        <span className="badge">{validatedJsonData.transactions.length} Transactions</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p>Click or drag .json backup file here to select</p>
                )}
                <input
                  ref={jsonFileInputRef}
                  type="file"
                  accept=".json"
                  style={{ display: 'none' }}
                  onChange={handleJsonInputChange}
                />
              </div>

              {jsonParseError && (
                <div className="import-error-banner">
                  <AlertCircle size={18} />
                  <span>{jsonParseError}</span>
                </div>
              )}

              <div className="json-restore-btn-row">
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleOpenConfirmModal}
                  disabled={!validatedJsonData || isRestoring}
                >
                  <RefreshCw size={16} /> Restore from JSON Backup
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Excel Import Modal */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={handleCloseImportModal}
        title="Import Historical Transactions from Excel"
      >
        {!importSummary ? (
          <div>
            <p className="excel-import-description">
              Upload your Excel file (.xlsx, .xls) or CSV. MoneyManager will automatically parse columns for
              <strong> Date, Accounts, Category, Subcategory, Note, Amount, Income/Expense, Description</strong>,
              and auto-create any new accounts or categories missing from your profile.
              <button
                type="button"
                className="btn-link"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', marginLeft: '0.5rem', color: 'var(--accent-primary)', fontWeight: 600 }}
                onClick={handleDownloadTemplate}
              >
                <FileText size={14} /> Download Sample Template
              </button>
            </p>

            <div
              className="excel-dropzone"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileSpreadsheet size={40} className="dropzone-icon" />
              {selectedFile ? (
                <div className="selected-file-name">{selectedFile.name}</div>
              ) : (
                <p>Click or drag Excel file here to upload</p>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                style={{ display: 'none' }}
                onChange={handleExcelFileChange}
              />
            </div>

            {importError && (
              <div className="import-error-banner">
                <AlertCircle size={18} />
                <span>{importError}</span>
              </div>
            )}

            {isImporting && (
              <div className="import-progress-container">
                <div className="progress-status-text">
                  Processing row {importProgress.processed} of {importProgress.total}...
                </div>
                <div className="progress-bar-bg">
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: importProgress.total > 0 ? `${(importProgress.processed / importProgress.total) * 100}%` : '0%'
                    }}
                  />
                </div>
              </div>
            )}

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCloseImportModal}
                disabled={isImporting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleExecuteImport}
                disabled={!selectedFile || isImporting}
              >
                {isImporting ? 'Importing...' : 'Start Import'}
              </button>
            </div>
          </div>
        ) : (
          <div className="import-summary-view">
            <div className="summary-success-header">
              <CheckCircle2 size={48} className="success-icon" />
              <h3>Import Successfully Completed!</h3>
            </div>

            <div className="summary-metrics-grid">
              <div className="summary-metric">
                <span className="summary-val">{importSummary.totalImported}</span>
                <span className="summary-lbl">Transactions Imported</span>
              </div>
              <div className="summary-metric">
                <span className="summary-val">{importSummary.newAccountsCreated}</span>
                <span className="summary-lbl">New Accounts Created</span>
              </div>
              <div className="summary-metric">
                <span className="summary-val">{importSummary.newCategoriesCreated}</span>
                <span className="summary-lbl">New Categories Created</span>
              </div>
            </div>

            {importSummary.createdAccountNames.length > 0 && (
              <div className="summary-list-section">
                <strong>New Accounts Auto-Created:</strong>
                <div className="summary-tags">
                  {importSummary.createdAccountNames.map((name, idx) => (
                    <span key={idx} className="summary-tag">{name}</span>
                  ))}
                </div>
              </div>
            )}

            {importSummary.createdCategoryNames.length > 0 && (
              <div className="summary-list-section">
                <strong>New Categories Auto-Created:</strong>
                <div className="summary-tags">
                  {importSummary.createdCategoryNames.map((name, idx) => (
                    <span key={idx} className="summary-tag">{name}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleCloseImportModal}
              >
                Done
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* JSON Restore Destructive Confirmation Modal */}
      <Modal
        isOpen={isConfirmModalOpen}
        onClose={() => !isRestoring && setIsConfirmModalOpen(false)}
        title="Confirm Full Data Restoration"
      >
        <div className="restore-confirm-dialog">
          <div className="warning-callout-header">
            <AlertTriangle size={40} className="warning-icon-danger" />
            <div>
              <h3 className="warning-title-danger">Warning: Destructive Action</h3>
              <p className="warning-text-danger">
                Restoring from a JSON backup will <strong>permanently delete all your current transactions, accounts, categories, and settings</strong>, and replace them with the data from this backup file. This action cannot be undone.
              </p>
            </div>
          </div>

          {validatedJsonData && (
            <div className="restore-preview-summary">
              <h4>Backup Content to Restore:</h4>
              <div className="summary-metrics-grid">
                <div className="summary-metric">
                  <span className="summary-val">{validatedJsonData.accounts.length}</span>
                  <span className="summary-lbl">Accounts</span>
                </div>
                <div className="summary-metric">
                  <span className="summary-val">{validatedJsonData.categories.length}</span>
                  <span className="summary-lbl">Categories</span>
                </div>
                <div className="summary-metric">
                  <span className="summary-val">{validatedJsonData.transactions.length}</span>
                  <span className="summary-lbl">Transactions</span>
                </div>
              </div>
            </div>
          )}

          {isRestoring && (
            <div className="import-progress-container" style={{ marginTop: '1rem' }}>
              <div className="progress-status-text" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <RefreshCw size={16} className="spin-icon" />
                <span>{restoreStatusMessage} Please do not close this window.</span>
              </div>
            </div>
          )}

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsConfirmModalOpen(false)}
              disabled={isRestoring}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={handleExecuteJsonRestore}
              disabled={isRestoring}
            >
              {isRestoring ? 'Restoring Data...' : 'Confirm Restore'}
            </button>
          </div>
        </div>
      </Modal>

      {/* JSON Restore Success Modal */}
      <Modal
        isOpen={isSuccessModalOpen}
        onClose={() => window.location.reload()}
        title="Restoration Complete"
      >
        <div className="import-summary-view">
          <div className="summary-success-header">
            <CheckCircle2 size={48} className="success-icon" />
            <h3>Data Successfully Restored!</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Your database has been updated with the backup records. Click below to refresh your dashboard.
            </p>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => window.location.reload()}
            >
              Finish & Refresh Application
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
