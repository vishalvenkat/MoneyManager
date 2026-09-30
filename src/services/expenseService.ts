import { db } from './firebase';
import { 
  collection, doc, setDoc, updateDoc, deleteDoc, getDocs, writeBatch
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

  // --- Account Groups ---
  addAccountGroup: async (uid: string, group: any) => {
    const docRef = doc(collection(db, 'users', uid, 'accountGroups'), group.id);
    await setDoc(docRef, group);
  },
  updateAccountGroup: async (uid: string, groupId: string, data: any) => {
    const docRef = doc(db, 'users', uid, 'accountGroups', groupId);
    await updateDoc(docRef, data);
  },
  deleteAccountGroup: async (uid: string, groupId: string) => {
    const docRef = doc(db, 'users', uid, 'accountGroups', groupId);
    await deleteDoc(docRef);
  },

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
  },

  // --- Reset User Data ---
  resetUserData: async (uid: string) => {
    const collectionsToDelete = ['transactions', 'accounts', 'categories', 'accountGroups'];
    for (const colName of collectionsToDelete) {
      const colRef = collection(db, 'users', uid, colName);
      const snapshot = await getDocs(colRef);
      if (!snapshot.empty) {
        const batch = writeBatch(db);
        snapshot.docs.forEach((docSnap) => {
          batch.delete(docSnap.ref);
        });
        await batch.commit();
      }
    }
  }
};
