import React from 'react';
import type { ReactNode } from 'react';
import { AccountProvider } from './AccountContext';
import { CategoryProvider } from './CategoryContext';
import { TransactionProvider } from './TransactionContext';
import { AuthProvider } from './AuthContext';

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <AuthProvider>
      <AccountProvider>
        <CategoryProvider>
          <TransactionProvider>
            {children}
          </TransactionProvider>
        </CategoryProvider>
      </AccountProvider>
    </AuthProvider>
  );
};
