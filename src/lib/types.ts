export type DebtStatus = 'pending' | 'payment_requested' | 'paid';
export type DebtType = 'owed_to_me' | 'owed_by_me';
export type InvitationStatus = 'pending' | 'accepted' | 'rejected';
export type Theme = 'light' | 'dark';

export interface Friend {
  id: string;
  userId?: string;
  otherUserId?: string;
  name: string;
  username?: string;
  email: string;
  avatar?: string;
  createdAt?: string;
}

export interface FriendInvitation {
  id: string;
  fromUserId?: string;
  toUserName?: string;
  toEmail: string;
  toUserId?: string;
  inviterName: string;
  inviterUserName?: string;
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
  paymentRequestRejectedAt?: string;
  paymentRequestRejectedByUserId?: string;
  paymentRequestRejectionCount: number;
}

export interface AppState {
  friends: Friend[];
  invitations: FriendInvitation[];
  debts: Debt[];
}

export interface DeviceSession {
  id: string;
  userId: string;
  sessionId: string;
  deviceLabel: string;
  browser: string;
  os: string;
  userAgent?: string;
  signedInAt: string;
  lastSeenAt: string;
  revokedAt?: string;
}

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials extends AuthCredentials {
  username: string;
}