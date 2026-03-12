export type DebtStatus = 'pending' | 'paid';
export type DebtType = 'owed_to_me' | 'owed_by_me';

export interface Friend {
  id: string;
  userId?: string;
  name: string;
  email: string;
  avatar?: string;
  createdAt?: string;
}

export interface Debt {
  id: string;
  userId?: string;
  friendId: string;
  amount: number;
  description: string;
  type: DebtType;
  status: DebtStatus;
  createdAt: string;
}

export interface AppState {
  friends: Friend[];
  debts: Debt[];
}

export interface AuthCredentials {
  email: string;
  password: string;
}