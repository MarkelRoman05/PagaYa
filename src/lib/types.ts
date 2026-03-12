export type DebtStatus = 'pending' | 'payment_requested' | 'paid';
export type DebtType = 'owed_to_me' | 'owed_by_me';
export type InvitationStatus = 'pending' | 'accepted' | 'rejected';

export interface Friend {
  id: string;
  userId?: string;
  otherUserId?: string;
  name: string;
  email: string;
  avatar?: string;
  createdAt?: string;
}

export interface FriendInvitation {
  id: string;
  fromUserId?: string;
  toEmail: string;
  toUserId?: string;
  inviterName: string;
  inviterEmail: string;
  status: InvitationStatus;
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
  paidAt?: string;
}

export interface AppState {
  friends: Friend[];
  invitations: FriendInvitation[];
  debts: Debt[];
}

export interface AuthCredentials {
  email: string;
  password: string;
}