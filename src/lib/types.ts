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
  | 'debt_payment_rejected'
  | 'group_invitation_received'
  | 'group_invitation_accepted'
  | 'group_invitation_rejected'
  | 'group_expense_created'
  | 'group_share_settled';

export type GroupRole = 'owner' | 'admin' | 'member';
export type GroupInvitationStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled';
export type GroupSplitMode = 'equal' | 'custom';
export type GroupInvitationChannel = 'email' | 'whatsapp';

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

export interface Group {
  id: string;
  createdById: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  role: GroupRole;
  displayName: string;
  username?: string;
  email: string;
  avatar?: string;
  joinedAt: string;
  updatedAt: string;
}

export interface GroupInvitation {
  id: string;
  groupId: string;
  fromUserId?: string;
  deliveryChannel: GroupInvitationChannel;
  deliveryTarget?: string;
  toUserName?: string;
  toEmail: string;
  toUserId?: string;
  invitedName: string;
  inviterName: string;
  inviterUserName?: string;
  inviterEmail: string;
  status: GroupInvitationStatus;
  createdAt: string;
}

export interface GroupExpense {
  id: string;
  groupId: string;
  createdById: string;
  description: string;
  amount: number;
  paidByMemberId: string;
  splitMode: GroupSplitMode;
  icon?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GroupExpenseSplit {
  id: string;
  expenseId: string;
  groupId: string;
  memberId: string;
  shareAmount: number;
  isSettled: boolean;
  settledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppState {
  friends: Friend[];
  invitations: FriendInvitation[];
  debts: Debt[];
  groups: Group[];
  groupMembers: GroupMember[];
  groupInvitations: GroupInvitation[];
  groupExpenses: GroupExpense[];
  groupExpenseSplits: GroupExpenseSplit[];
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