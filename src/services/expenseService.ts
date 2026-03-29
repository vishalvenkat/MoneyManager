import { db } from './firebase';
import { 
  collection, doc, setDoc, updateDoc, deleteDoc 
} from 'firebase/firestore';

export const expenseService = {
  // --- Accounts ---
  addAccount: async (uid: string, account: any) => {
    const docRef = doc(collection(db, 'users', uid, 'accounts'), account.id);
    await setDoc(docRef, account);
  },
  updateAccount: async (uid: string, accountId: string, data: any) => {
    const docRef = doc(db, 'users', uid, 'accounts', accountId);
    await updateDoc(docRef, data);
  },
  deleteAccount: async (uid: string, accountId: string) => {
    const docRef = doc(db, 'users', uid, 'accounts', accountId);
    await deleteDoc(docRef);
  },
  getAccountRef: (uid: string, accountId: string) => doc(db, 'users', uid, 'accounts', accountId),

  // --- Categories ---
  addCategory: async (uid: string, category: any) => {
    const docRef = doc(collection(db, 'users', uid, 'categories'), category.id);
    await setDoc(docRef, category);
  },
  updateCategory: async (uid: string, categoryId: string, data: any) => {
    const docRef = doc(db, 'users', uid, 'categories', categoryId);
    await updateDoc(docRef, data);
  },
  deleteCategory: async (uid: string, categoryId: string) => {
    const docRef = doc(db, 'users', uid, 'categories', categoryId);
    await deleteDoc(docRef);
  },

  // --- Transactions ---
  addTransaction: async (uid: string, transaction: any) => {
    const docRef = doc(collection(db, 'users', uid, 'transactions'), transaction.id);
    await setDoc(docRef, transaction);
  },
  updateTransaction: async (uid: string, transactionId: string, data: any) => {
    const docRef = doc(db, 'users', uid, 'transactions', transactionId);
    await updateDoc(docRef, data);
  },
  deleteTransaction: async (uid: string, transactionId: string) => {
    const docRef = doc(db, 'users', uid, 'transactions', transactionId);
    await deleteDoc(docRef);
  }
};
