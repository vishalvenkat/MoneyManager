import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Category } from '../types';
import { useAuth } from './AuthContext';
import { db } from '../services/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { expenseService } from '../services/expenseService';
import { v4 as uuidv4 } from 'uuid';

interface CategoryContextType {
  categories: Category[];
  addCategory: (category: Omit<Category, 'id'>) => Promise<void>;
  updateCategory: (id: string, category: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
}

const defaultCategories: Category[] = [
  { id: uuidv4(), name: 'Salary', type: 'income', color: '#10B981', icon: 'wallet' },
  { id: uuidv4(), name: 'Freelance', type: 'income', color: '#3B82F6', icon: 'briefcase' },
  { id: uuidv4(), name: 'Food', type: 'expense', color: '#F59E0B', icon: 'utensils' },
  { id: uuidv4(), name: 'Rent', type: 'expense', color: '#EF4444', icon: 'home' },
  { id: uuidv4(), name: 'Transport', type: 'expense', color: '#8B5CF6', icon: 'car' },
];

const CategoryContext = createContext<CategoryContextType | undefined>(undefined);

export const CategoryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [categories, setCategories] = useState<Category[]>(defaultCategories);
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser) {
      setCategories(defaultCategories);
      return;
    }

    const colRef = collection(db, 'users', currentUser.uid, 'categories');
    const unsubscribe = onSnapshot(colRef, (snapshot) => {
      const catList: Category[] = [];
      snapshot.forEach(docSnap => {
        catList.push(docSnap.data() as Category);
      });
      
      // If none in firestore, seed the defaults
      if (catList.length === 0) {
        defaultCategories.forEach(async c => {
          await expenseService.addCategory(currentUser.uid, c);
        });
      } else {
        setCategories(catList);
      }
    });

    return unsubscribe;
  }, [currentUser]);

  const addCategory = async (category: Omit<Category, 'id'>) => {
    if (!currentUser) return;
    const newCategory: Category = {
      ...category,
      id: uuidv4(),
    };
    await expenseService.addCategory(currentUser.uid, newCategory);
  };

  const updateCategory = async (id: string, updatedFields: Partial<Category>) => {
    if (!currentUser) return;
    await expenseService.updateCategory(currentUser.uid, id, updatedFields);
  };

  const deleteCategory = async (id: string) => {
    if (!currentUser) return;
    await expenseService.deleteCategory(currentUser.uid, id);
  };

  return (
    <CategoryContext.Provider value={{ categories, addCategory, updateCategory, deleteCategory }}>
      {children}
    </CategoryContext.Provider>
  );
};

export const useCategories = () => {
  const context = useContext(CategoryContext);
  if (!context) {
    throw new Error('useCategories must be used within a CategoryProvider');
  }
  return context;
};
