export type AccountGroup = 'Cash' | 'Debit Card' | 'Credit Card' | 'Savings';

export type Account = {
  id: string;
  name: string;
  group?: AccountGroup; // Account Grouping (Cash, Debit Card, Credit Card, Savings)
  initialBalance: number;
  currentBalance: number;
};

export type CategoryType = 'income' | 'expense';

export type Category = {
  id: string;
  name: string;
  type: CategoryType;
  color?: string;
  icon?: string;
  budget?: number; // Monthly budget limit in INR
  subcategories?: string[]; // Optional subcategories list
};

export type TransactionType = 'income' | 'expense' | 'transfer';

export type Transaction = {
  id: string;
  amount: number;
  date: string; // ISO string 
  type: TransactionType;
  categoryId?: string; // Optional for transfers
  subcategory?: string; // Optional subcategory name
  accountId?: string; // Standard income/expense
  fromAccountId?: string; // For transfers
  toAccountId?: string; // For transfers
  notes?: string;
};
