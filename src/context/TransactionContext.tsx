import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Transaction } from '../types';
import { useAuth } from './AuthContext';
import { db } from '../services/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { expenseService } from '../services/expenseService';
import { v4 as uuidv4 } from 'uuid';
import { useAccounts } from './AccountContext';

interface TransactionContextType {
  transactions: Transaction[];
  addTransaction: (transaction: Omit<Transaction, 'id'>) => Promise<void>;
  updateTransaction: (id: string, transaction: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
}

const TransactionContext = createContext<TransactionContextType | undefined>(undefined);

export const TransactionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const { currentUser } = useAuth();
  const { updateAccountBalance } = useAccounts();

  useEffect(() => {
    if (!currentUser) {
      setTransactions([]);
      return;
    }

    const colRef = collection(db, 'users', currentUser.uid, 'transactions');
    const unsubscribe = onSnapshot(colRef, (snapshot) => {
      const txList: Transaction[] = [];
      snapshot.forEach(docSnap => {
        txList.push(docSnap.data() as Transaction);
      });
      setTransactions(txList);
    });

    return unsubscribe;
  }, [currentUser]);

  const handleBalanceChange = async (transaction: Omit<Transaction, 'id'>, multiplier: 1 | -1) => {
    if (transaction.type === 'income' && transaction.accountId) {
      await updateAccountBalance(transaction.accountId, transaction.amount * multiplier);
    } else if (transaction.type === 'expense' && transaction.accountId) {
      await updateAccountBalance(transaction.accountId, -transaction.amount * multiplier);
    } else if (transaction.type === 'transfer' && transaction.fromAccountId && transaction.toAccountId) {
      // For transfer, subtract from fromAccount and add to toAccount
      await updateAccountBalance(transaction.fromAccountId, -transaction.amount * multiplier);
      await updateAccountBalance(transaction.toAccountId, transaction.amount * multiplier);
    }
  };

  const addTransaction = async (transaction: Omit<Transaction, 'id'>) => {
    if (!currentUser) return;
    const newTransaction: Transaction = {
      ...transaction,
      id: uuidv4(),
    };
    
    // Write to firestore
    await expenseService.addTransaction(currentUser.uid, newTransaction);
    // Update balances
    await handleBalanceChange(newTransaction, 1);
  };

  const updateTransaction = async (id: string, updatedFields: Partial<Transaction>) => {
    if (!currentUser) return;
    
    // Find existing directly from state
    const existing = transactions.find(t => t.id === id);
    if (existing) {
      await handleBalanceChange(existing, -1); // Revert old
    }

    const updated = { ...existing, ...updatedFields } as Transaction;
    await expenseService.updateTransaction(currentUser.uid, id, updatedFields);
    
    if (existing) {
      await handleBalanceChange(updated, 1); // Apply new
    }
  };

  const deleteTransaction = async (id: string) => {
    if (!currentUser) return;
    
    const existing = transactions.find(t => t.id === id);
    if (existing) {
      await handleBalanceChange(existing, -1); // Revert old
    }

    await expenseService.deleteTransaction(currentUser.uid, id);
  };

  return (
    <TransactionContext.Provider value={{ transactions, addTransaction, updateTransaction, deleteTransaction }}>
      {children}
    </TransactionContext.Provider>
  );
};

export const useTransactions = () => {
  const context = useContext(TransactionContext);
  if (!context) {
    throw new Error('useTransactions must be used within a TransactionProvider');
  }
  return context;
};
