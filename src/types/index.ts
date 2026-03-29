export type Account = {
  id: string;
  name: string;
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
};

export type TransactionType = 'income' | 'expense' | 'transfer';

export type Transaction = {
  id: string;
  amount: number;
  date: string; // ISO string 
  type: TransactionType;
  categoryId?: string; // Optional for transfers
  accountId?: string; // Standard income/expense
  fromAccountId?: string; // For transfers
  toAccountId?: string; // For transfers
  notes?: string;
};
