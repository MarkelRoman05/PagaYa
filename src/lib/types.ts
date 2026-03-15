export type DebtStatus = 'pending' | 'payment_requested' | 'paid';
export type DebtType = 'owed_to_me' | 'owed_by_me';
export type InvitationStatus = 'pending' | 'accepted' | 'rejected';
export type Theme = 'light' | 'dark';
export type NotificationType =
  | 'invitation_received'
  | 'invitation_accepted'
  | 'invitation_rejected'
  | 'debt_created'
  | 'debt_payment_requested'
  | 'debt_paid'
  | 'debt_payment_rejected';

export type NotificationChannel = 'web' | 'app';

export type NotificationPreference = {
  web: boolean;
  app: boolean;
};

export type NotificationPreferences = Record<NotificationType, NotificationPreference>;

export type NotificationChannelSettings = {
  web: boolean;
  app: boolean;
};

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
  notifications: AppNotification[];
}

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
  readAt?: string;
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