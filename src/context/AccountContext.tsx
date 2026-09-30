import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Account, AccountGroup } from '../types';
import { useAuth } from './AuthContext';
import { db } from '../services/firebase';
import { collection, onSnapshot, runTransaction, writeBatch, doc } from 'firebase/firestore';
import { expenseService } from '../services/expenseService';

interface AccountContextType {
  accounts: Account[];
  accountGroups: AccountGroup[];
  addAccount: (account: Omit<Account, 'id'>) => Promise<void>;
  updateAccount: (id: string, account: Partial<Account>) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  updateAccountBalance: (id: string, amountChange: number) => Promise<void>;
  addAccountGroup: (group: Omit<AccountGroup, 'id'>) => Promise<void>;
  updateAccountGroup: (id: string, group: Partial<AccountGroup>) => Promise<void>;
  deleteAccountGroup: (id: string) => Promise<{ movedCount: number; targetGroupName: string } | null>;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

const DEFAULT_GROUPS: Omit<AccountGroup, 'id'>[] = [
  { name: 'Cash', icon: 'Wallet' },
  { name: 'Debit Card', icon: 'CreditCard' },
  { name: 'Credit Card', icon: 'CreditCard' },
  { name: 'Savings', icon: 'Landmark' },
];

export const AccountProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountGroups, setAccountGroups] = useState<AccountGroup[]>([]);
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser) {
      setAccounts([]);
      setAccountGroups([]);
      return;
    }

    const accountsRef = collection(db, 'users', currentUser.uid, 'accounts');
    const unsubscribeAccounts = onSnapshot(accountsRef, (snapshot) => {
      const accList: Account[] = [];
      snapshot.forEach(docSnap => {
        accList.push(docSnap.data() as Account);
      });
      setAccounts(accList);
    });

    const groupsRef = collection(db, 'users', currentUser.uid, 'accountGroups');
    const unsubscribeGroups = onSnapshot(groupsRef, async (snapshot) => {
      if (snapshot.empty) {
        // Initialize default groups if none exist
        const batch = writeBatch(db);
        const newGroups: AccountGroup[] = [];
        DEFAULT_GROUPS.forEach(g => {
          const id = crypto.randomUUID();
          const docRef = doc(db, 'users', currentUser.uid, 'accountGroups', id);
          const newGroup = { ...g, id };
          batch.set(docRef, newGroup);
          newGroups.push(newGroup);
        });
        await batch.commit();
        setAccountGroups(newGroups);
      } else {
        const grpList: AccountGroup[] = [];
        snapshot.forEach(docSnap => {
          grpList.push(docSnap.data() as AccountGroup);
        });
        setAccountGroups(grpList);
      }
    });

    return () => {
      unsubscribeAccounts();
      unsubscribeGroups();
    };
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

  const addAccountGroup = async (group: Omit<AccountGroup, 'id'>) => {
    if (!currentUser) return;
    const newGroup: AccountGroup = {
      ...group,
      id: crypto.randomUUID(),
    };
    await expenseService.addAccountGroup(currentUser.uid, newGroup);
  };

  const updateAccountGroup = async (id: string, updatedFields: Partial<AccountGroup>) => {
    if (!currentUser) return;
    await expenseService.updateAccountGroup(currentUser.uid, id, updatedFields);
  };

  const deleteAccountGroup = async (id: string) => {
    if (!currentUser) return null;
    
    // Fallback logic: move accounts to first available group
    const remainingGroups = accountGroups.filter(g => g.id !== id);
    if (remainingGroups.length === 0) {
      throw new Error("Cannot delete the last account group.");
    }
    
    const targetGroup = remainingGroups[0];
    
    // Find affected accounts
    const affectedAccounts = accounts.filter(a => a.groupId === id || a.group === accountGroups.find(g => g.id === id)?.name);
    
    if (affectedAccounts.length > 0) {
      const batch = writeBatch(db);
      
      // Update each affected account
      affectedAccounts.forEach(acc => {
        const accRef = doc(db, 'users', currentUser.uid, 'accounts', acc.id);
        batch.update(accRef, { groupId: targetGroup.id, group: targetGroup.name });
      });
      
      // Delete the group
      const groupRef = doc(db, 'users', currentUser.uid, 'accountGroups', id);
      batch.delete(groupRef);
      
      await batch.commit();
      
      return { movedCount: affectedAccounts.length, targetGroupName: targetGroup.name };
    } else {
      await expenseService.deleteAccountGroup(currentUser.uid, id);
      return { movedCount: 0, targetGroupName: targetGroup.name };
    }
  };

  return (
    <AccountContext.Provider value={{ 
      accounts, accountGroups, 
      addAccount, updateAccount, deleteAccount, updateAccountBalance,
      addAccountGroup, updateAccountGroup, deleteAccountGroup
    }}>
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
