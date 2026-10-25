export interface AccountGroup {
  id: string;
  name: string;
  icon: string;
}

export type Account = {
  id: string;
  name: string;
  groupId?: string; // Links to AccountGroup.id
  group?: string; // Legacy field for backwards compatibility
  initialBalance: number;
  currentBalance: number;
  includeInNetWorth?: boolean; // Flag to include/exclude from net assets
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
  description?: string;
};

export type AvatarGender = 'male' | 'female';

export interface UserProfile {
  uid: string;
  fullName: string;
  dateOfBirth?: string; // YYYY-MM-DD
  mobileNumber: string; // Mandatory
  email: string; // Mandatory
  avatarGender?: AvatarGender;
  avatarId?: string;
  photoURL?: string;
  createdAt?: string;
  updatedAt?: string;
}
