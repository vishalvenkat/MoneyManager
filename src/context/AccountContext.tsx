import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Account } from '../types';
import { useAuth } from './AuthContext';
import { db } from '../services/firebase';
import { collection, onSnapshot, runTransaction } from 'firebase/firestore';
import { expenseService } from '../services/expenseService';

interface AccountContextType {
  accounts: Account[];
  addAccount: (account: Omit<Account, 'id'>) => Promise<void>;
  updateAccount: (id: string, account: Partial<Account>) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  updateAccountBalance: (id: string, amountChange: number) => Promise<void>;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

export const AccountProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser) {
      setAccounts([]);
      return;
    }

    const colRef = collection(db, 'users', currentUser.uid, 'accounts');
    const unsubscribe = onSnapshot(colRef, (snapshot) => {
      const accList: Account[] = [];
      snapshot.forEach(docSnap => {
        accList.push(docSnap.data() as Account);
      });
      setAccounts(accList);
    });

    return unsubscribe;
  }, [currentUser]);

  const addAccount = async (account: Omit<Account, 'id'>) => {
    if (!currentUser) return;
    const newAccount: Account = {
      ...account,
      id: crypto.randomUUID(),
    };
    await expenseService.addAccount(currentUser.uid, newAccount);
  };

  const updateAccount = async (id: string, updatedFields: Partial<Account>) => {
    if (!currentUser) return;
    await expenseService.updateAccount(currentUser.uid, id, updatedFields);
  };

  const deleteAccount = async (id: string) => {
    if (!currentUser) return;
    await expenseService.deleteAccount(currentUser.uid, id);
  };

  const updateAccountBalance = async (id: string, amountChange: number) => {
    if (!currentUser) return;
    const accountRef = expenseService.getAccountRef(currentUser.uid, id);
    try {
      await runTransaction(db, async (transaction) => {
        const docSnap = await transaction.get(accountRef);
        if (!docSnap.exists()) throw new Error("Account does not exist!");
        const currentData = docSnap.data() as Account;
        const newBalance = currentData.currentBalance + amountChange;
        transaction.update(accountRef, { currentBalance: newBalance });
      });
    } catch(err) {
      console.error('Failed to update balance', err);
    }
  };

  return (
    <AccountContext.Provider value={{ accounts, addAccount, updateAccount, deleteAccount, updateAccountBalance }}>
      {children}
    </AccountContext.Provider>
  );
};

export const useAccounts = () => {
  const context = useContext(AccountContext);
  if (!context) {
    throw new Error('useAccounts must be used within an AccountProvider');
  }
  return context;
};
