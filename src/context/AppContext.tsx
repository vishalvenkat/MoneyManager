import React from 'react';
import type { ReactNode } from 'react';
import { AccountProvider } from './AccountContext';
import { CategoryProvider } from './CategoryContext';
import { TransactionProvider } from './TransactionContext';
import { AuthProvider } from './AuthContext';
import { PrivacyProvider } from './PrivacyContext';

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <AuthProvider>
      <PrivacyProvider>
        <AccountProvider>
          <CategoryProvider>
            <TransactionProvider>
              {children}
            </TransactionProvider>
          </CategoryProvider>
        </AccountProvider>
      </PrivacyProvider>
    </AuthProvider>
  );
};
