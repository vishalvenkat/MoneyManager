import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

export interface PrivacyContextType {
  isNumbersHidden: boolean;
  toggleHideNumbers: () => void;
  setHideNumbers: (hidden: boolean) => void;
  formatCurrency: (amount: number | string | undefined | null, compact?: boolean) => string;
  maskAmount: (val: number | string | undefined | null, originalFormatted?: string) => string;
}

const STORAGE_KEY = 'money_manager_privacy_hide_numbers';

const PrivacyContext = createContext<PrivacyContextType | undefined>(undefined);

export const PrivacyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isNumbersHidden, setIsNumbersHidden] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(isNumbersHidden));
    } catch {
      // Ignore storage errors in private browsing/sandboxes
    }
  }, [isNumbersHidden]);

  const toggleHideNumbers = () => {
    setIsNumbersHidden(prev => !prev);
  };

  const setHideNumbers = (hidden: boolean) => {
    setIsNumbersHidden(hidden);
  };

  const formatCurrency = (amount: number | string | undefined | null, compact: boolean = false): string => {
    if (isNumbersHidden) {
      return '***';
    }
    const num = typeof amount === 'number' ? amount : (parseFloat(String(amount)) || 0);

    if (compact && Math.abs(num) >= 1000) {
      return `₹${(num / 1000).toFixed(1)}k`;
    }

    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(num);
  };

  const maskAmount = (val: number | string | undefined | null, originalFormatted?: string): string => {
    if (isNumbersHidden) {
      return '***';
    }
    if (originalFormatted !== undefined) {
      return originalFormatted;
    }
    return formatCurrency(val);
  };

  return (
    <PrivacyContext.Provider
      value={{
        isNumbersHidden,
        toggleHideNumbers,
        setHideNumbers,
        formatCurrency,
        maskAmount,
      }}
    >
      {children}
    </PrivacyContext.Provider>
  );
};

export const usePrivacy = (): PrivacyContextType => {
  const context = useContext(PrivacyContext);
  if (!context) {
    throw new Error('usePrivacy must be used within a PrivacyProvider');
  }
  return context;
};

// Alias hook for convenience
export const usePrivacyMask = usePrivacy;

export interface MaskedValueProps {
  value: number | string;
  formatter?: (val: number | string) => string;
  compact?: boolean;
  className?: string;
}

export const MaskedValue: React.FC<MaskedValueProps> = ({
  value,
  formatter,
  compact = false,
  className = '',
}) => {
  const { isNumbersHidden, formatCurrency } = usePrivacy();

  if (isNumbersHidden) {
    return <span className={`masked-value ${className}`}>***</span>;
  }

  const display = formatter ? formatter(value) : formatCurrency(value, compact);
  return <span className={className}>{display}</span>;
};
