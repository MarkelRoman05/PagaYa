"use client"

import { ReactNode, createContext, createElement, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { App, type URLOpenListenerEvent } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { PushNotifications } from '@capacitor/push-notifications';
import { AppNotification, AppState, AuthCredentials, Debt, DebtStatus, DebtType, DeviceSession, Friend, FriendInvitation, Group, GroupExpense, GroupExpenseSplit, GroupInvitation, GroupInvitationChannel, GroupInvitationStatus, GroupMember, GroupRole, GroupSplitMode, InvitationStatus, NotificationChannel, NotificationChannelSettings, NotificationPreference, NotificationPreferences, NotificationType, RegisterCredentials, Theme } from '@/lib/types';
import { getSupabaseBrowserClient, isSupabaseConfigured } from '@/lib/supabase';

type AddFriendInput = Pick<Friend, 'name' | 'email' | 'avatar'>;
type AddDebtInput = Pick<Debt, 'friendId' | 'amount' | 'description' | 'type'>;
type UpdateDebtInput = Partial<Pick<Debt, 'friendId' | 'amount' | 'description' | 'type'>>;
type UpdateProfileInput = {
  username: string;
  avatarFile: File | null;
};
type SendInvitationInput = {
  username: string;
};
type CreateGroupInput = {
  name: string;
  description?: string;
};
type SendGroupInvitationInput = {
  groupId: string;
  deliveryChannel: GroupInvitationChannel;
  targetContact: string;
};
type CreateGroupExpenseInput = {
  groupId: string;
  description: string;
  amount: number;
  paidByMemberId: string;
  expenseDate?: string;
  splitMode?: GroupSplitMode;
  participantMemberIds?: string[];
  customShares?: Array<{
    memberId: string;
    amount: number;
  }>;
};
type UpdateGroupExpenseInput = {
  expenseId: string;
  description: string;
  amount: number;
  paidByMemberId: string;
  splitMode?: GroupSplitMode;
  participantMemberIds?: string[];
  customShares?: Array<{
    memberId: string;
    amount: number;
  }>;
};
type UpdateGroupMemberRoleInput = {
  memberId: string;
  role: GroupRole;
};
type SettleGroupExpenseShareInput = {
  splitId: string;
};

const AVATAR_BUCKET = 'avatars';
const NATIVE_OAUTH_NEXT_PATH_KEY = 'pagaya.nativeOAuth.nextPath';

interface FriendRow {
  id: string;
  user_id: string;
  other_user_id: string;
  name: string;
  username: string | null;
  email: string;
  avatar: string | null;
  created_at: string;
}

interface InvitationRow {
  id: string;
  from_user_id: string;
  to_username: string | null;
  to_email: string;
  to_user_id: string | null;
  invited_name: string | null;
  inviter_name: string;
  inviter_username: string | null;
  inviter_email: string;
  status: InvitationStatus;
  created_at: string;
  updated_at: string;
}

interface DebtRow {
  id: string;
  user_id: string;
  friend_id: string;
  other_user_id: string | null;
  amount: number;
  description: string;
  type: DebtType;
  status: DebtStatus;
  created_at: string;
  paid_at: string | null;
  payment_request_rejected_at: string | null;
  payment_request_rejected_by: string | null;
  payment_request_rejection_count: number | null;
}

interface DeviceSessionRow {
  id: string;
  user_id: string;
  session_id: string;
  device_label: string;
  browser: string;
  os: string;
  user_agent: string | null;
  signed_in_at: string;
  last_seen_at: string;
  revoked_at: string | null;
}

interface NotificationRow {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
}

interface GroupRow {
  id: string;
  created_by_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

interface GroupMemberRow {
  id: string;
  group_id: string;
  user_id: string;
  role: GroupRole;
  display_name: string;
  username: string | null;
  email: string;
  avatar: string | null;
  joined_at: string;
  updated_at: string;
}

interface GroupInvitationRow {
  id: string;
  group_id: string;
  from_user_id: string;
  delivery_channel: GroupInvitationChannel;
  delivery_target: string | null;
  to_username: string | null;
  to_email: string;
  to_user_id: string | null;
  invited_name: string;
  inviter_name: string;
  inviter_username: string | null;
  inviter_email: string;
  status: GroupInvitationStatus;
  created_at: string;
}

interface GroupExpenseRow {
  id: string;
  group_id: string;
  created_by_id: string;
  description: string;
  amount: number;
  paid_by_member_id: string;
  split_mode: GroupSplitMode;
  icon: string | null;
  created_at: string;
  updated_at: string;
}

interface GroupExpenseSplitRow {
  id: string;
  expense_id: string;
  group_id: string;
  member_id: string;
  share_amount: number;
  is_settled: boolean;
  settled_at: string | null;
  created_at: string;
  updated_at: string;
}

type RealtimeRow = {
  user_id?: string;
  other_user_id?: string | null;
  from_user_id?: string;
  to_username?: string;
  to_user_id?: string | null;
  to_email?: string;
};

type RefreshDataOptions = {
  silent?: boolean;
};

interface PagaYaContextValue extends AppState {
  isReady: boolean;
  isConfigured: boolean;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  isLoadingData: boolean;
  session: Session | null;
  user: User | null;
  deviceSessions: DeviceSession[];
  currentSessionId: string | null;
  theme: Theme;
  setTheme: (theme: Theme) => Promise<void>;
  signIn: (credentials: AuthCredentials) => Promise<void>;
  signInWithGoogle: (nextPath?: string, authIntent?: 'login' | 'register') => Promise<void>;
  connectGoogleIdentity: (nextPath?: string) => Promise<void>;
  disconnectGoogleIdentity: () => Promise<void>;
  signUp: (credentials: RegisterCredentials) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshData: (options?: RefreshDataOptions) => Promise<void>;
  refreshDeviceSessions: () => Promise<void>;
  sendInvitation: (invitation: SendInvitationInput) => Promise<FriendInvitation>;
  createGroup: (group: CreateGroupInput) => Promise<Group>;
  sendGroupInvitation: (invitation: SendGroupInvitationInput) => Promise<GroupInvitation>;
  acceptGroupInvitation: (invitationId: string) => Promise<GroupMember>;
  rejectGroupInvitation: (invitationId: string) => Promise<void>;
  updateGroupMemberRole: (input: UpdateGroupMemberRoleInput) => Promise<void>;
  addGroupExpense: (expense: CreateGroupExpenseInput) => Promise<GroupExpense>;
  updateGroupExpense: (expense: UpdateGroupExpenseInput) => Promise<GroupExpense>;
  deleteGroupExpense: (expenseId: string) => Promise<void>;
  settleGroupExpenseShare: (input: SettleGroupExpenseShareInput) => Promise<GroupExpenseSplit>;
  acceptInvitation: (invitationId: string) => Promise<Friend>;
  rejectInvitation: (invitationId: string) => Promise<void>;
  removeFriend: (friendId: string) => Promise<void>;
  addDebt: (debt: AddDebtInput) => Promise<Debt>;
  updateDebt: (debtId: string, debt: UpdateDebtInput) => Promise<Debt>;
  markAsPaid: (debtId: string) => Promise<void>;
  rejectDebtPaymentRequest: (debtId: string) => Promise<void>;
  removeDebt: (debtId: string) => Promise<void>;
  updateUserProfile: (profile: UpdateProfileInput) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  setNotificationRead: (notificationId: string, read: boolean) => Promise<void>;
  removeNotification: (notificationId: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  notificationPreferences: NotificationPreferences;
  notificationChannelsEnabled: NotificationChannelSettings;
  updateNotificationPreference: (type: NotificationType, channel: NotificationChannel, enabled: boolean) => Promise<void>;
  updateNotificationChannelEnabled: (channel: NotificationChannel, enabled: boolean) => Promise<void>;
}

const PagaYaContext = createContext<PagaYaContextValue | null>(null);

const NOTIFICATION_TYPES: NotificationType[] = [
  'invitation_received',
  'invitation_accepted',
  'invitation_rejected',
  'debt_created',
  'debt_payment_requested',
  'debt_paid',
  'debt_payment_rejected',
  'group_invitation_received',
  'group_invitation_accepted',
  'group_invitation_rejected',
  'group_expense_created',
  'group_share_settled',
];

const DEFAULT_NOTIFICATION_PREFERENCE: NotificationPreference = {
  web: true,
  app: true,
};

const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  invitation_received: { ...DEFAULT_NOTIFICATION_PREFERENCE },
  invitation_accepted: { ...DEFAULT_NOTIFICATION_PREFERENCE },
  invitation_rejected: { ...DEFAULT_NOTIFICATION_PREFERENCE },
  debt_created: { ...DEFAULT_NOTIFICATION_PREFERENCE },
  debt_payment_requested: { ...DEFAULT_NOTIFICATION_PREFERENCE },
  debt_paid: { ...DEFAULT_NOTIFICATION_PREFERENCE },
  debt_payment_rejected: { ...DEFAULT_NOTIFICATION_PREFERENCE },
  group_invitation_received: { ...DEFAULT_NOTIFICATION_PREFERENCE },
  group_invitation_accepted: { ...DEFAULT_NOTIFICATION_PREFERENCE },
  group_invitation_rejected: { ...DEFAULT_NOTIFICATION_PREFERENCE },
  group_expense_created: { ...DEFAULT_NOTIFICATION_PREFERENCE },
  group_share_settled: { ...DEFAULT_NOTIFICATION_PREFERENCE },
};

const DEFAULT_NOTIFICATION_CHANNEL_SETTINGS: NotificationChannelSettings = {
  web: true,
  app: true,
};

const EMPTY_STATE: AppState = {
  friends: [],
  invitations: [],
  debts: [],
  groups: [],
  groupMembers: [],
  groupInvitations: [],
  groupExpenses: [],
  groupExpenseSplits: [],
  notifications: [],
};

function normalizeNotificationPreferences(value: unknown): NotificationPreferences {
  if (!value || typeof value !== 'object') {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }

  const rawValue = value as Record<string, unknown>;
  const normalized = { ...DEFAULT_NOTIFICATION_PREFERENCES } as NotificationPreferences;

  for (const type of NOTIFICATION_TYPES) {
    const candidate = rawValue[type];

    if (!candidate || typeof candidate !== 'object') {
      continue;
    }

    const candidateObject = candidate as Record<string, unknown>;

    normalized[type] = {
      web: typeof candidateObject.web === 'boolean' ? candidateObject.web : DEFAULT_NOTIFICATION_PREFERENCE.web,
      app: typeof candidateObject.app === 'boolean' ? candidateObject.app : DEFAULT_NOTIFICATION_PREFERENCE.app,
    };
  }

  return normalized;
}

function mapFriendRow(row: FriendRow): Friend {
  return {
    id: row.id,
    userId: row.user_id,
    otherUserId: row.other_user_id,
    name: row.name,
    username: row.username ?? undefined,
    email: row.email,
    avatar: row.avatar ?? undefined,
    createdAt: row.created_at,
  };
}

function mapInvitationRow(row: InvitationRow): FriendInvitation {
  return {
    id: row.id,
    fromUserId: row.from_user_id,
    toUserName: row.to_username ?? undefined,
    toEmail: row.to_email,
    toUserId: row.to_user_id ?? undefined,
    inviterName: row.inviter_name,
    inviterUserName: row.inviter_username ?? undefined,
    inviterEmail: row.inviter_email,
    status: row.status,
    createdAt: row.created_at,
  };
}

function mapDebtRow(row: DebtRow): Debt {
  return {
    id: row.id,
    userId: row.user_id,
    friendId: row.friend_id,
    amount: row.amount,
    description: row.description,
    type: row.type,
    status: row.status,
    createdAt: row.created_at,
    paidAt: row.paid_at ?? undefined,
    paymentRequestRejectedAt: row.payment_request_rejected_at ?? undefined,
    paymentRequestRejectedByUserId: row.payment_request_rejected_by ?? undefined,
    paymentRequestRejectionCount: row.payment_request_rejection_count ?? 0,
  };
}

function mapGroupRow(row: GroupRow): Group {
  return {
    id: row.id,
    createdById: row.created_by_id,
    name: row.name,
    description: row.description ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapGroupMemberRow(row: GroupMemberRow): GroupMember {
  return {
    id: row.id,
    groupId: row.group_id,
    userId: row.user_id,
    role: row.role,
    displayName: row.display_name,
    username: row.username ?? undefined,
    email: row.email,
    avatar: row.avatar ?? undefined,
    joinedAt: row.joined_at,
    updatedAt: row.updated_at,
  };
}

function mapGroupInvitationRow(row: GroupInvitationRow): GroupInvitation {
  return {
    id: row.id,
    groupId: row.group_id,
    fromUserId: row.from_user_id,
    deliveryChannel: row.delivery_channel,
    deliveryTarget: row.delivery_target ?? undefined,
    toUserName: row.to_username ?? undefined,
    toEmail: row.to_email,
    toUserId: row.to_user_id ?? undefined,
    invitedName: row.invited_name,
    inviterName: row.inviter_name,
    inviterUserName: row.inviter_username ?? undefined,
    inviterEmail: row.inviter_email,
    status: row.status,
    createdAt: row.created_at,
  };
}

function mapGroupExpenseRow(row: GroupExpenseRow): GroupExpense {
  return {
    id: row.id,
    groupId: row.group_id,
    createdById: row.created_by_id,
    description: row.description,
    amount: row.amount,
    paidByMemberId: row.paid_by_member_id,
    splitMode: row.split_mode,
    icon: row.icon ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapGroupExpenseSplitRow(row: GroupExpenseSplitRow): GroupExpenseSplit {
  return {
    id: row.id,
    expenseId: row.expense_id,
    groupId: row.group_id,
    memberId: row.member_id,
    shareAmount: row.share_amount,
    isSettled: row.is_settled,
    settledAt: row.settled_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDeviceSessionRow(row: DeviceSessionRow): DeviceSession {
  const userAgent = row.user_agent ?? '';
  const browser = row.browser?.trim() ? row.browser : getBrowserName(userAgent);
  const os = row.os?.trim() ? row.os : getOsName(userAgent);

  return {
    id: row.id,
    userId: row.user_id,
    sessionId: row.session_id,
    deviceLabel: getDeviceLabel(browser, os, userAgent, row.device_label),
    browser,
    os,
    userAgent: row.user_agent ?? undefined,
    signedInAt: row.signed_in_at,
    lastSeenAt: row.last_seen_at,
    revokedAt: row.revoked_at ?? undefined,
  };
}

function mapNotificationRow(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    message: row.message,
    metadata: row.metadata ?? undefined,
    isRead: row.is_read,
    createdAt: row.created_at,
    readAt: row.read_at ?? undefined,
  };
}

function decodeJwtPayload(token: string) {
  try {
    const [, payload] = token.split('.');

    if (!payload) {
      return null;
    }

    const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
    const paddedPayload = normalizedPayload.padEnd(Math.ceil(normalizedPayload.length / 4) * 4, '=');
    const decodedPayload = atob(paddedPayload);

    return JSON.parse(decodedPayload) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function getSessionIdentifier(session: Session | null) {
  if (!session?.access_token) {
    return null;
  }

  const payload = decodeJwtPayload(session.access_token);
  const candidateKeys = ['session_id', 'sid', 'jti'] as const;

  for (const key of candidateKeys) {
    const value = payload?.[key];

    if (typeof value === 'string' && value.trim()) {
      return value;
    }
  }

  if (typeof session.refresh_token === 'string' && session.refresh_token.trim()) {
    return `${session.user.id}:${session.refresh_token.slice(0, 24)}`;
  }

  return null;
}

function getBrowserName(userAgent: string) {
  const normalizedUserAgent = userAgent.toLowerCase();

  if (normalizedUserAgent.includes('edgios/') || normalizedUserAgent.includes('edga/') || normalizedUserAgent.includes('edg/')) {
    return 'Microsoft Edge';
  }

  if (normalizedUserAgent.includes('opios/') || normalizedUserAgent.includes('opr/') || normalizedUserAgent.includes('opera')) {
    return 'Opera';
  }

  if (normalizedUserAgent.includes('samsungbrowser/')) {
    return 'Samsung Internet';
  }

  if (normalizedUserAgent.includes('crios/') || (normalizedUserAgent.includes('chrome/') && !normalizedUserAgent.includes('edg/'))) {
    return 'Chrome';
  }

  if (normalizedUserAgent.includes('fxios/') || normalizedUserAgent.includes('firefox/')) {
    return 'Firefox';
  }

  if (
    normalizedUserAgent.includes('safari/')
    && !normalizedUserAgent.includes('chrome/')
    && !normalizedUserAgent.includes('crios/')
  ) {
    return 'Safari';
  }

  return 'Navegador';
}

function getOsName(userAgent: string) {
  const normalizedUserAgent = userAgent.toLowerCase();

  if (normalizedUserAgent.includes('android')) {
    return 'Android';
  }

  if (normalizedUserAgent.includes('iphone') || normalizedUserAgent.includes('ipad') || normalizedUserAgent.includes('ipod') || normalizedUserAgent.includes('ios')) {
    return 'iOS';
  }

  // iPadOS 13+ puede reportarse como "Macintosh" pero con token "Mobile".
  if (normalizedUserAgent.includes('macintosh') && normalizedUserAgent.includes('mobile')) {
    return 'iOS';
  }

  if (normalizedUserAgent.includes('mac os x') || normalizedUserAgent.includes('macintosh')) {
    return 'macOS';
  }

  if (normalizedUserAgent.includes('windows')) {
    return 'Windows';
  }

  if (normalizedUserAgent.includes('linux')) {
    return 'Linux';
  }

  return 'Sistema desconocido';
}

function getDeviceLabel(browser: string, os: string, userAgent: string, fallbackLabel?: string) {
  const normalizedUserAgent = userAgent.toLowerCase();
  const isTablet = normalizedUserAgent.includes('ipad')
    || normalizedUserAgent.includes('tablet')
    || (normalizedUserAgent.includes('android') && !normalizedUserAgent.includes('mobile'));
  const isPhoneLike = normalizedUserAgent.includes('mobile')
    || normalizedUserAgent.includes('iphone')
    || normalizedUserAgent.includes('ipod')
    || normalizedUserAgent.includes('android');

  if (os === 'Android' || os === 'iOS') {
    // Detecta WebView nativo (app Capacitor).
    // Android WebView añade "; wv)" y/o "Version/4.0" al UA; iOS WKWebView no incluye CriOS ni FxiOS.
    const isNativeApp = normalizedUserAgent.includes('; wv)')
      || (normalizedUserAgent.includes('version/4.0') && normalizedUserAgent.includes('android'));
    if (isNativeApp) {
      return isTablet ? `Tablet ${os}` : os;
    }
    return isTablet ? `Tablet ${os} · ${browser}` : `${os} · ${browser}`;
  }

  if (isTablet) {
    return os === 'Sistema desconocido' ? `Tablet · ${browser}` : `Tablet · ${browser} en ${os}`;
  }

  if (isPhoneLike) {
    return `Móvil · ${browser}`;
  }

  if (os === 'Sistema desconocido') {
    return fallbackLabel?.trim() || `Ordenador · ${browser}`;
  }

  return `Ordenador · ${browser} en ${os}`;
}

function getFriendlyErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    const normalizedMessage = error.message.trim();
    const lowerCaseMessage = normalizedMessage.toLowerCase();

    if (lowerCaseMessage.includes('email rate limit exceeded') || lowerCaseMessage.includes('rate limit exceeded')) {
      return 'Has solicitado demasiados correos de recuperación. Espera 60 segundos y vuelve a intentarlo.';
    }

    return normalizedMessage;
  }

  return fallback;
}

function isMissingRelationError(error: unknown) {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const code = 'code' in error && typeof error.code === 'string' ? error.code : '';
  const message = 'message' in error && typeof error.message === 'string' ? error.message : '';
  const details = 'details' in error && typeof error.details === 'string' ? error.details : '';
  const hint = 'hint' in error && typeof error.hint === 'string' ? error.hint : '';
  const normalized = `${message} ${details} ${hint}`.toLowerCase();

  if (code === '42P01' || code === 'PGRST204' || code === 'PGRST205') {
    return true;
  }

  return normalized.includes('relation')
    && (normalized.includes('does not exist') || normalized.includes('not exist'));
}

function logOptionalSchemaWarning(scope: string, error: unknown) {
  console.warn(`Se omite la carga opcional de ${scope} porque faltan objetos en la base de datos.`, error);
}

function buildAuthRedirectUrl(nextPath: string, authProvider: string, authIntent?: string) {
  if (Capacitor.isNativePlatform()) {
    // Use exact deep link to maximize compatibility with Supabase allowlist matching.
    return 'com.markel.pagaya://auth/callback';
  }

  const normalizedNextPath = nextPath.startsWith('/') ? nextPath : `/${nextPath}`;
  const params = new URLSearchParams();

  params.set('next', normalizedNextPath);
  params.set('authProvider', authProvider);

  if (authIntent) {
    params.set('authIntent', authIntent);
  }

  return `${window.location.origin}/auth?${params.toString()}`;
}

async function ensureAuthenticatedUser() {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    throw new Error('Configura Supabase para activar autenticación y persistencia real.');
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Necesitas iniciar sesión para acceder a tus datos.');
  }

  return { supabase, user };
}

export function PagaYaProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(EMPTY_STATE);
  const [isReady, setIsReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [deviceSessions, setDeviceSessions] = useState<DeviceSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [theme, setThemeState] = useState<Theme>('dark');
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES);
  const [notificationChannelsEnabled, setNotificationChannelsEnabled] = useState<NotificationChannelSettings>(DEFAULT_NOTIFICATION_CHANNEL_SETTINGS);
  const configured = useMemo(() => isSupabaseConfigured(), []);
  const pendingRealtimeRefreshRef = useRef<number | null>(null);
  const pushTokenRef = useRef<string | null>(null);

  const refreshDeviceSessions = useCallback(async () => {
    const { supabase, user: activeUser } = await ensureAuthenticatedUser();
    const { data, error } = await supabase
      .from('user_device_sessions')
      .select('*')
      .eq('user_id', activeUser.id)
      .is('revoked_at', null)
      .order('last_seen_at', { ascending: false });

    if (error) {
      throw new Error(getFriendlyErrorMessage(error, 'No se pudo cargar la lista de dispositivos.'));
    }

    setDeviceSessions((data ?? []).map((row) => mapDeviceSessionRow(row as DeviceSessionRow)));
  }, []);

  const syncCurrentDeviceSession = useCallback(async (activeSession: Session | null) => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase || !activeSession?.user) {
      setCurrentSessionId(null);
      return;
    }

    const sessionId = getSessionIdentifier(activeSession);

    if (!sessionId) {
      setCurrentSessionId(null);
      return;
    }

    setCurrentSessionId(sessionId);

    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const browser = getBrowserName(userAgent);
    const os = getOsName(userAgent);
    const deviceLabel = getDeviceLabel(browser, os, userAgent);
    const now = new Date().toISOString();

    const { data: existingSession, error: existingSessionError } = await supabase
      .from('user_device_sessions')
      .select('id')
      .eq('user_id', activeSession.user.id)
      .eq('session_id', sessionId)
      .maybeSingle();

    if (existingSessionError) {
      throw new Error(getFriendlyErrorMessage(existingSessionError, 'No se pudo sincronizar el dispositivo actual.'));
    }

    if (existingSession) {
      const { error: updateError } = await supabase
        .from('user_device_sessions')
        .update({
          device_label: deviceLabel,
          browser,
          os,
          user_agent: userAgent || null,
          last_seen_at: now,
          revoked_at: null,
        })
        .eq('id', existingSession.id);

      if (updateError) {
        throw new Error(getFriendlyErrorMessage(updateError, 'No se pudo actualizar la sesión del dispositivo.'));
      }

      return;
    }

    const { error: insertError } = await supabase.from('user_device_sessions').insert({
      user_id: activeSession.user.id,
      session_id: sessionId,
      device_label: deviceLabel,
      browser,
      os,
      user_agent: userAgent || null,
      signed_in_at: now,
      last_seen_at: now,
    });

    if (insertError) {
      throw new Error(getFriendlyErrorMessage(insertError, 'No se pudo registrar la sesión del dispositivo.'));
    }
  }, []);

  const markCurrentSessionAsRevoked = useCallback(async (activeSession: Session | null) => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase || !activeSession?.user) {
      return;
    }

    const sessionId = getSessionIdentifier(activeSession);

    if (!sessionId) {
      return;
    }

    const { error } = await supabase
      .from('user_device_sessions')
      .update({
        revoked_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
      })
      .eq('user_id', activeSession.user.id)
      .eq('session_id', sessionId);

    if (error) {
      console.error('No se pudo marcar la sesión actual como cerrada', error);
    }
  }, []);

  const upsertAndroidPushToken = useCallback(async (token: string, activeSession: Session | null) => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase || !activeSession?.user) {
      return;
    }

    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const browser = getBrowserName(userAgent);
    const os = getOsName(userAgent);
    const deviceLabel = getDeviceLabel(browser, os, userAgent);

    const { error } = await supabase
      .from('user_push_tokens')
      .upsert(
        {
          user_id: activeSession.user.id,
          token,
          platform: 'android',
          session_id: getSessionIdentifier(activeSession),
          device_label: deviceLabel,
          is_active: true,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,token' },
      );

    if (error) {
      console.error('No se pudo registrar el token push de Android', error);
      return;
    }

    // Keep only the current token active for this user/platform to avoid stale-token fan-out.
    const { error: deactivateOthersError } = await supabase
      .from('user_push_tokens')
      .update({
        is_active: false,
        last_seen_at: new Date().toISOString(),
      })
      .eq('user_id', activeSession.user.id)
      .eq('platform', 'android')
      .neq('token', token)
      .eq('is_active', true);

    if (deactivateOthersError) {
      console.error('No se pudieron desactivar tokens Android antiguos', deactivateOthersError);
    }
  }, []);

  const deactivateAndroidPushToken = useCallback(async (activeSession: Session | null) => {
    const supabase = getSupabaseBrowserClient();
    const token = pushTokenRef.current;

    if (!supabase || !activeSession?.user || !token) {
      return;
    }

    const { error } = await supabase
      .from('user_push_tokens')
      .update({
        is_active: false,
        last_seen_at: new Date().toISOString(),
      })
      .eq('user_id', activeSession.user.id)
      .eq('token', token);

    if (error) {
      console.error('No se pudo desactivar el token push de Android', error);
    }
  }, []);

  // Apply theme class to <html> whenever theme changes
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const refreshData = useCallback(async (options?: RefreshDataOptions) => {
    const { supabase, user: activeUser } = await ensureAuthenticatedUser();
    const silent = options?.silent ?? false;

    if (!silent) {
      setIsLoadingData(true);
    }

    try {
      const { data: myGroupMemberships, error: myGroupMembershipsError } = await supabase
        .from('group_members')
        .select('*')
        .eq('user_id', activeUser.id)
        .order('joined_at', { ascending: false });

      const groupsSchemaUnavailable = Boolean(myGroupMembershipsError && isMissingRelationError(myGroupMembershipsError));

      if (groupsSchemaUnavailable) {
        logOptionalSchemaWarning('grupos (group_members)', myGroupMembershipsError);
      } else if (myGroupMembershipsError) {
        throw myGroupMembershipsError;
      }

      const groupIds = Array.from(new Set((groupsSchemaUnavailable ? [] : (myGroupMemberships ?? [])).map((row) => row.group_id)));

      let groupInvitationsQueryData: GroupInvitationRow[] = [];

      if (!groupsSchemaUnavailable) {
        const { data, error: groupInvitationsError } = await supabase
          .from('group_invitations')
          .select('*')
          .or(`from_user_id.eq.${activeUser.id},to_user_id.eq.${activeUser.id},to_email.eq.${activeUser.email}`)
          .order('created_at', { ascending: false });

        if (groupInvitationsError && isMissingRelationError(groupInvitationsError)) {
          logOptionalSchemaWarning('grupos (group_invitations)', groupInvitationsError);
        } else if (groupInvitationsError) {
          throw groupInvitationsError;
        } else {
          groupInvitationsQueryData = (data ?? []) as GroupInvitationRow[];
        }
      }

      const [
        { data: friendsData, error: friendsError },
        { data: invitationsData, error: invitationsError },
        { data: debtsData, error: debtsError },
        { data: notificationsData, error: notificationsError },
        { data: settingsData, error: settingsError },
        { data: devicesData, error: devicesError },
      ] = await Promise.all([
        supabase.from('friends').select('*').eq('user_id', activeUser.id).order('created_at', { ascending: false }),
        supabase.from('friend_invitations').select('*').or(`from_user_id.eq.${activeUser.id},to_user_id.eq.${activeUser.id},to_email.eq.${activeUser.email}`).order('created_at', { ascending: false }),
        supabase.from('debts').select('*').or(`user_id.eq.${activeUser.id},other_user_id.eq.${activeUser.id}`).order('created_at', { ascending: false }),
        supabase.from('user_notifications').select('*').eq('user_id', activeUser.id).order('created_at', { ascending: false }).limit(100),
        supabase
          .from('user_settings')
          .select('theme, notification_preferences, notifications_enabled_web, notifications_enabled_app')
          .eq('user_id', activeUser.id)
          .maybeSingle(),
        supabase.from('user_device_sessions').select('*').eq('user_id', activeUser.id).is('revoked_at', null).order('last_seen_at', { ascending: false }),
      ]);

      let groupsData: GroupRow[] = [];
      let groupMembersData: GroupMemberRow[] = [];
      let groupInvitationsData: GroupInvitationRow[] = groupInvitationsQueryData;
      let groupExpensesData: GroupExpenseRow[] = [];
      let groupExpenseSplitsData: GroupExpenseSplitRow[] = [];

      if (groupIds.length > 0) {
        const [
          { data: groupsQueryData, error: groupsError },
          { data: groupMembersQueryData, error: groupMembersError },
          { data: groupExpensesQueryData, error: groupExpensesError },
          { data: groupExpenseSplitsQueryData, error: groupExpenseSplitsError },
        ] = await Promise.all([
          supabase.from('groups').select('*').in('id', groupIds).order('created_at', { ascending: false }),
          supabase.from('group_members').select('*').in('group_id', groupIds).order('joined_at', { ascending: false }),
          supabase.from('group_expenses').select('*').in('group_id', groupIds).order('created_at', { ascending: false }),
          supabase.from('group_expense_splits').select('*').in('group_id', groupIds).order('created_at', { ascending: false }),
        ]);

        if (groupsError && isMissingRelationError(groupsError)) {
          logOptionalSchemaWarning('grupos (groups)', groupsError);
          groupInvitationsData = [];
        } else if (groupsError) {
          throw groupsError;
        }

        if (groupMembersError && isMissingRelationError(groupMembersError)) {
          logOptionalSchemaWarning('grupos (group_members)', groupMembersError);
          groupInvitationsData = [];
        } else if (groupMembersError) {
          throw groupMembersError;
        }

        if (groupExpensesError && isMissingRelationError(groupExpensesError)) {
          logOptionalSchemaWarning('grupos (group_expenses)', groupExpensesError);
          groupInvitationsData = [];
        } else if (groupExpensesError) {
          throw groupExpensesError;
        }

        if (groupExpenseSplitsError && isMissingRelationError(groupExpenseSplitsError)) {
          logOptionalSchemaWarning('grupos (group_expense_splits)', groupExpenseSplitsError);
          groupInvitationsData = [];
        } else if (groupExpenseSplitsError) {
          throw groupExpenseSplitsError;
        }

        if (!groupsError && !groupMembersError && !groupExpensesError && !groupExpenseSplitsError) {
          groupsData = (groupsQueryData ?? []) as GroupRow[];
          groupMembersData = (groupMembersQueryData ?? []) as GroupMemberRow[];
          groupExpensesData = (groupExpensesQueryData ?? []) as GroupExpenseRow[];
          groupExpenseSplitsData = (groupExpenseSplitsQueryData ?? []) as GroupExpenseSplitRow[];
        }
      }

      if (friendsError) {
        throw friendsError;
      }

      if (invitationsError) {
        throw invitationsError;
      }

      if (debtsError) {
        throw debtsError;
      }

      const notificationsUnavailable = Boolean(notificationsError && isMissingRelationError(notificationsError));
      if (notificationsUnavailable) {
        logOptionalSchemaWarning('notificaciones (user_notifications)', notificationsError);
      } else if (notificationsError) {
        throw notificationsError;
      }

      const settingsUnavailable = Boolean(settingsError && isMissingRelationError(settingsError));
      if (settingsUnavailable) {
        logOptionalSchemaWarning('ajustes (user_settings)', settingsError);
      } else if (settingsError) {
        throw settingsError;
      }

      const devicesUnavailable = Boolean(devicesError && isMissingRelationError(devicesError));
      if (devicesUnavailable) {
        logOptionalSchemaWarning('dispositivos (user_device_sessions)', devicesError);
      } else if (devicesError) {
        throw devicesError;
      }

      // Map invitations and filter only relevant ones
      const mappedInvitations = (invitationsData ?? [])
        .filter(row => (row.status === 'pending' && (row.to_user_id === activeUser.id || row.to_email === activeUser.email)) || row.from_user_id === activeUser.id)
        .map((row) => mapInvitationRow(row as InvitationRow));

      // Build an index to resolve the receiver-side friend_id for shared debts.
      const friendsByOtherUserId = new Map<string, string>();
      for (const friendRow of friendsData ?? []) {
        friendsByOtherUserId.set(friendRow.other_user_id, friendRow.id);
      }

      // Map debts and invert type if user is not the debt creator
      const mappedDebts = (debtsData ?? []).map((row) => {
        const debt = mapDebtRow(row as DebtRow);
        // If current user is the other_user_id, invert the type
        if (row.other_user_id && row.other_user_id === activeUser.id) {
          debt.type = debt.type === 'owed_to_me' ? 'owed_by_me' : 'owed_to_me';
          debt.friendId = friendsByOtherUserId.get(row.user_id) ?? debt.friendId;
        }
        return debt;
      });

      setState({
        friends: (friendsData ?? []).map((row) => mapFriendRow(row as FriendRow)),
        invitations: mappedInvitations,
        debts: mappedDebts,
        groups: groupsData.map((row) => mapGroupRow(row)),
        groupMembers: groupMembersData.map((row) => mapGroupMemberRow(row)),
        groupInvitations: groupInvitationsData.map((row) => mapGroupInvitationRow(row)),
        groupExpenses: groupExpensesData.map((row) => mapGroupExpenseRow(row)),
        groupExpenseSplits: groupExpenseSplitsData.map((row) => mapGroupExpenseSplitRow(row)),
        notifications: (notificationsUnavailable ? [] : (notificationsData ?? [])).map((row) => mapNotificationRow(row as NotificationRow)),
      });

      setDeviceSessions((devicesUnavailable ? [] : (devicesData ?? [])).map((row) => mapDeviceSessionRow(row as DeviceSessionRow)));

      setNotificationPreferences(
        normalizeNotificationPreferences(settingsUnavailable ? null : settingsData?.notification_preferences),
      );
      setNotificationChannelsEnabled({
        web: !settingsUnavailable && typeof settingsData?.notifications_enabled_web === 'boolean'
          ? settingsData.notifications_enabled_web
          : DEFAULT_NOTIFICATION_CHANNEL_SETTINGS.web,
        app: !settingsUnavailable && typeof settingsData?.notifications_enabled_app === 'boolean'
          ? settingsData.notifications_enabled_app
          : DEFAULT_NOTIFICATION_CHANNEL_SETTINGS.app,
      });

      // Apply stored theme (only on first load, not on silent refresh polling)
      if (!silent) {
        if (!settingsUnavailable && settingsData && typeof settingsData.theme === 'string') {
          setThemeState(settingsData.theme as Theme);
        } else {
          setThemeState('dark');
        }
      }
    } finally {
      if (!silent) {
        setIsLoadingData(false);
      }
    }
  }, []);

  const scheduleRealtimeRefresh = useCallback(() => {
    if (pendingRealtimeRefreshRef.current) {
      clearTimeout(pendingRealtimeRefreshRef.current);
    }

    pendingRealtimeRefreshRef.current = window.setTimeout(() => {
      pendingRealtimeRefreshRef.current = null;
      void refreshData({ silent: true }).catch((error) => {
        console.error('No se pudieron refrescar los datos tras un cambio en tiempo real', error);
      });
    }, 250);
  }, [refreshData]);

  useEffect(() => {
    if (!configured) {
      setIsLoadingAuth(false);
      setIsReady(true);
      return;
    }

    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      setIsLoadingAuth(false);
      setIsReady(true);
      return;
    }

    let mounted = true;

    const initialize = async () => {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();

      if (!mounted) {
        return;
      }

      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setCurrentSessionId(getSessionIdentifier(currentSession));

      if (currentSession?.user) {
        try {
          await syncCurrentDeviceSession(currentSession);
          await refreshData();
        } catch (error) {
          console.warn('No se pudieron cargar los datos iniciales', error);
        }
      } else {
        setState(EMPTY_STATE);
        setThemeState('dark');
      }

      setIsLoadingAuth(false);
      setIsReady(true);
    };

    initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setCurrentSessionId(getSessionIdentifier(nextSession));

      if (!nextSession?.user) {
        setState(EMPTY_STATE);
        setDeviceSessions([]);
        setThemeState('dark');
        setNotificationPreferences(DEFAULT_NOTIFICATION_PREFERENCES);
        setNotificationChannelsEnabled(DEFAULT_NOTIFICATION_CHANNEL_SETTINGS);
        setIsLoadingAuth(false);
        setIsReady(true);
        return;
      }

      void (async () => {
        try {
          await syncCurrentDeviceSession(nextSession);
          await refreshData();
        } catch (error) {
          console.warn('No se pudieron refrescar los datos del usuario', error);
        }
      })();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [configured, refreshData, syncCurrentDeviceSession]);

  useEffect(() => {
    if (!configured || !Capacitor.isNativePlatform()) {
      return;
    }

    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return;
    }

    const listenerPromise: Promise<PluginListenerHandle> = App.addListener('appUrlOpen', async ({ url }: URLOpenListenerEvent) => {
      if (!url || !url.startsWith('com.markel.pagaya://')) {
        return;
      }

      const parsedUrl = new URL(url);

      if (parsedUrl.host !== 'auth') {
        return;
      }

      const queryParams = parsedUrl.searchParams;
      const hashParams = new URLSearchParams(parsedUrl.hash.replace(/^#/, ''));
      const code = queryParams.get('code');
      const accessToken = hashParams.get('access_token') ?? queryParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token') ?? queryParams.get('refresh_token');
      const storedNextPath = typeof window !== 'undefined'
        ? window.sessionStorage.getItem(NATIVE_OAUTH_NEXT_PATH_KEY)
        : null;
      const nextPath = queryParams.get('next') || storedNextPath || '/auth';

      try {
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);

          if (error) {
            throw error;
          }
        } else if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            throw error;
          }
        }

        if (typeof window !== 'undefined') {
          window.sessionStorage.removeItem(NATIVE_OAUTH_NEXT_PATH_KEY);
          window.location.href = nextPath;
        }
      } catch (error) {
        console.error('No se pudo completar el callback OAuth nativo', error);
      } finally {
        try {
          await Browser.close();
        } catch {
          // Ignore close errors when browser is already closed.
        }
      }
    });

    return () => {
      void listenerPromise.then((listener: PluginListenerHandle) => listener.remove());
    };
  }, [configured]);

  useEffect(() => {
    if (!configured || !user) {
      return;
    }

    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return;
    }

    const channel = supabase.channel(`pagaya-live-sync-${user.id}`);

    channel.on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'friends',
    }, (payload) => {
      const nextRow = payload.new as RealtimeRow;
      const prevRow = payload.old as RealtimeRow;
      const ownerId = nextRow.user_id ?? prevRow.user_id;
      const otherUserId = nextRow.other_user_id ?? prevRow.other_user_id;

      if (ownerId === user.id || otherUserId === user.id) {
        scheduleRealtimeRefresh();
      }
    });

    channel.on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'friend_invitations',
    }, (payload) => {
      const nextRow = payload.new as RealtimeRow;
      const prevRow = payload.old as RealtimeRow;
      const fromUserId = nextRow.from_user_id ?? prevRow.from_user_id;
      const toUserId = nextRow.to_user_id ?? prevRow.to_user_id;
      const toEmail = (nextRow.to_email ?? prevRow.to_email)?.toLowerCase();

      if (fromUserId === user.id || toUserId === user.id || (user.email && toEmail === user.email.toLowerCase())) {
        scheduleRealtimeRefresh();
      }
    });

    channel.on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'debts',
    }, scheduleRealtimeRefresh);

    channel.on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'user_device_sessions',
    }, (payload) => {
      const nextRow = payload.new as RealtimeRow;
      const prevRow = payload.old as RealtimeRow;
      const ownerId = nextRow.user_id ?? prevRow.user_id;

      if (ownerId === user.id) {
        scheduleRealtimeRefresh();
      }
    });

    channel.on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'user_notifications',
    }, (payload) => {
      const nextRow = payload.new as RealtimeRow;
      const prevRow = payload.old as RealtimeRow;
      const ownerId = nextRow.user_id ?? prevRow.user_id;

      if (ownerId === user.id) {
        scheduleRealtimeRefresh();
      }
    });

    void channel.subscribe();

    return () => {
      if (pendingRealtimeRefreshRef.current) {
        clearTimeout(pendingRealtimeRefreshRef.current);
        pendingRealtimeRefreshRef.current = null;
      }

      void supabase.removeChannel(channel);
    };
  }, [configured, scheduleRealtimeRefresh, user]);

  useEffect(() => {
    if (!configured || !user || !session) {
      return;
    }

    const refreshSilently = () => {
      void (async () => {
        try {
          await syncCurrentDeviceSession(session);
          await refreshData({ silent: true });
        } catch (error) {
          console.warn('No se pudieron refrescar los datos de sincronizacion', error);
        }
      })();
    };

    const onFocus = () => {
      refreshSilently();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshSilently();
      }
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);

    const pollInterval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        refreshSilently();
      }
    }, 4000);

    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      clearInterval(pollInterval);
    };
  }, [configured, refreshData, session, syncCurrentDeviceSession, user]);

  useEffect(() => {
    if (!configured || !session?.user) {
      pushTokenRef.current = null;
      return;
    }

    const isAndroidNative = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

    if (!isAndroidNative) {
      return;
    }

    let cancelled = false;

    const cleanupListeners = async () => {
      try {
        await PushNotifications.removeAllListeners();
      } catch (error) {
        console.error('No se pudieron limpiar los listeners push', error);
      }
    };

    const setupPushNotifications = async () => {
      if (!notificationChannelsEnabled.app) {
        await deactivateAndroidPushToken(session);
        await cleanupListeners();
        return;
      }

      try {
        const permissionStatus = await PushNotifications.checkPermissions();
        let receivePermission = permissionStatus.receive;

        if (receivePermission === 'prompt') {
          const requestedPermissions = await PushNotifications.requestPermissions();
          receivePermission = requestedPermissions.receive;
        }

        if (receivePermission !== 'granted') {
          return;
        }

        await cleanupListeners();

        await PushNotifications.addListener('registration', async (token) => {
          if (cancelled) {
            return;
          }

          pushTokenRef.current = token.value;
          await upsertAndroidPushToken(token.value, session);
        });

        await PushNotifications.addListener('registrationError', (error) => {
          console.error('Error registrando push notifications en Android', error);
        });

        await PushNotifications.addListener('pushNotificationReceived', () => {
          if (!cancelled) {
            scheduleRealtimeRefresh();
          }
        });

        await PushNotifications.addListener('pushNotificationActionPerformed', () => {
          if (!cancelled) {
            scheduleRealtimeRefresh();
          }
        });

        await PushNotifications.register();
      } catch (error) {
        console.error('No se pudo inicializar Android Push Notifications', error);
      }
    };

    void setupPushNotifications();

    return () => {
      cancelled = true;
      void cleanupListeners();
    };
  }, [configured, deactivateAndroidPushToken, notificationChannelsEnabled.app, scheduleRealtimeRefresh, session, upsertAndroidPushToken]);

  const signIn = async ({ email, password }: AuthCredentials) => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      throw new Error('Faltan las variables NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.');
    }

    const normalizedEmail = email.trim().toLowerCase();

    const { error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });

    if (error) {
      const normalizedErrorMessage = error.message.toLowerCase();
      const hasInvalidCredentials = normalizedErrorMessage.includes('invalid login credentials');

      if (hasInvalidCredentials && normalizedEmail) {
        const { data: isEmailRegistered, error: emailCheckError } = await supabase.rpc('is_email_registered', {
          email_input: normalizedEmail,
        });

        if (!emailCheckError && isEmailRegistered) {
          throw new Error('Esta cuenta no tiene contraseña activa para entrar por email. Si te registraste con Google, usa "¿Olvidaste tu contraseña?" para crear una y poder iniciar sesión con email/contraseña.');
        }
      }

      throw new Error(getFriendlyErrorMessage(error, 'No se pudo iniciar sesión.'));
    }
  };

  const signInWithGoogle = async (nextPath = '/debts', authIntent: 'login' | 'register' = 'login') => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      throw new Error('Faltan las variables NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.');
    }

    const redirectTo = typeof window !== 'undefined'
      ? buildAuthRedirectUrl(nextPath, 'google', authIntent)
      : undefined;

    const isNative = Capacitor.isNativePlatform();

    if (isNative && typeof window !== 'undefined') {
      const normalizedNextPath = nextPath.startsWith('/') ? nextPath : `/${nextPath}`;
      window.sessionStorage.setItem(NATIVE_OAUTH_NEXT_PATH_KEY, normalizedNextPath);
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: isNative,
        queryParams: {
          prompt: 'select_account',
        },
      },
    });

    if (error) {
      throw new Error(getFriendlyErrorMessage(error, 'No se pudo iniciar sesión con Google.'));
    }

    if (isNative && data?.url) {
      await Browser.open({
        url: data.url,
        presentationStyle: 'popover',
      });
    }
  };

  const connectGoogleIdentity = async (nextPath = '/profile') => {
    const { supabase } = await ensureAuthenticatedUser();

    const redirectTo = typeof window !== 'undefined'
      ? buildAuthRedirectUrl(nextPath, 'google-link')
      : undefined;

    const isNative = Capacitor.isNativePlatform();

    if (isNative && typeof window !== 'undefined') {
      const normalizedNextPath = nextPath.startsWith('/') ? nextPath : `/${nextPath}`;
      window.sessionStorage.setItem(NATIVE_OAUTH_NEXT_PATH_KEY, normalizedNextPath);
    }

    const { data, error } = await supabase.auth.linkIdentity({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: isNative,
        queryParams: {
          prompt: 'select_account',
        },
      },
    });

    if (error) {
      throw new Error(getFriendlyErrorMessage(error, 'No se pudo conectar tu cuenta de Google.'));
    }

    if (isNative && data?.url) {
      await Browser.open({
        url: data.url,
        presentationStyle: 'popover',
      });
    }
  };

  const disconnectGoogleIdentity = async () => {
    const { supabase } = await ensureAuthenticatedUser();

    const { data, error } = await supabase.auth.getUserIdentities();

    if (error) {
      throw new Error(getFriendlyErrorMessage(error, 'No se pudo comprobar las cuentas conectadas.'));
    }

    const identities = data.identities ?? [];
    const googleIdentity = identities.find((identity) => identity.provider.toLowerCase() === 'google');

    if (!googleIdentity) {
      return;
    }

    const hasAlternativeProvider = identities.some(
      (identity) => identity.id !== googleIdentity.id && identity.provider.toLowerCase() !== 'google'
    );

    if (!hasAlternativeProvider) {
      throw new Error('No puedes desconectar Google porque es tu único método de acceso. Añade antes otro método de inicio de sesión.');
    }

    const { error: unlinkError } = await supabase.auth.unlinkIdentity(googleIdentity);

    if (unlinkError) {
      throw new Error(getFriendlyErrorMessage(unlinkError, 'No se pudo desconectar la cuenta de Google.'));
    }

    const {
      data: { user: refreshedUser },
      error: refreshedUserError,
    } = await supabase.auth.getUser();

    if (refreshedUserError) {
      throw new Error(getFriendlyErrorMessage(refreshedUserError, 'Google se desconectó, pero no se pudo refrescar el estado de la sesión.'));
    }

    setUser(refreshedUser ?? null);
  };

  const signUp = async ({ email, password, username }: RegisterCredentials) => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      throw new Error('Faltan las variables NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedUsername = username.trim().toLowerCase();

    if (!normalizedEmail) {
      throw new Error('Debes introducir un email válido para registrarte.');
    }

    if (!/^[a-z0-9_]{3,24}$/.test(normalizedUsername)) {
      throw new Error('El nombre de usuario debe tener entre 3 y 24 caracteres y solo puede incluir letras, números y guiones bajos.');
    }

    const { data: isEmailRegistered, error: emailCheckError } = await supabase.rpc('is_email_registered', {
      email_input: normalizedEmail,
    });

    if (emailCheckError) {
      const normalizedCheckMessage = emailCheckError.message.toLowerCase();
      const missingFunction = emailCheckError.code === '42883' || normalizedCheckMessage.includes('is_email_registered');

      if (!missingFunction) {
        throw new Error(getFriendlyErrorMessage(emailCheckError, 'No se pudo validar si el email ya existe.'));
      }
    } else if (isEmailRegistered) {
      throw new Error('Este email ya está registrado. Inicia sesión o recupera tu contraseña.');
    }

    const { data: isAvailable, error: usernameCheckError } = await supabase.rpc('is_username_available', {
      username_input: normalizedUsername,
    });

    if (usernameCheckError) {
      throw new Error(getFriendlyErrorMessage(usernameCheckError, 'No se pudo validar el nombre de usuario.'));
    }

    if (!isAvailable) {
      throw new Error('Este nombre de usuario ya está en uso. Elige otro distinto.');
    }

    const { data: signUpData, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          username: normalizedUsername,
        },
      },
    });

    if (error) {
      const friendlyMessage = getFriendlyErrorMessage(error, 'No se pudo crear la cuenta.');
      const normalizedMessage = friendlyMessage.toLowerCase();

      if (normalizedMessage.includes('database error saving new user')) {
        const { data: isStillAvailable, error: recheckError } = await supabase.rpc('is_username_available', {
          username_input: normalizedUsername,
        });

        if (!recheckError && isStillAvailable === false) {
          throw new Error('Este nombre de usuario ya está en uso. Elige otro distinto.');
        }

        throw new Error('No se pudo crear la cuenta porque la base de datos rechazó el registro. Aplica de nuevo el schema de Supabase y vuelve a intentarlo.');
      }

      if (normalizedMessage.includes('already registered')) {
        throw new Error('Este email ya está registrado. Inicia sesión o recupera tu contraseña.');
      }

      throw new Error(friendlyMessage);
    }

    // If signup returns an active session, enforce username assignment via RPC as a second step.
    if (signUpData?.session) {
      const { error: updateUsernameError } = await supabase.rpc('update_my_username', {
        username_input: normalizedUsername,
      });

      if (updateUsernameError) {
        throw new Error(getFriendlyErrorMessage(updateUsernameError, 'La cuenta se creó, pero no se pudo terminar de guardar tu nombre de usuario.'));
      }
    }
  };

  const requestPasswordReset = async (email: string) => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      throw new Error('Faltan las variables NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.');
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      throw new Error('Introduce un email válido para recuperar tu contraseña.');
    }

    const { data: isEmailRegistered, error: emailCheckError } = await supabase.rpc('is_email_registered', {
      email_input: normalizedEmail,
    });

    if (emailCheckError) {
      throw new Error(getFriendlyErrorMessage(emailCheckError, 'No se pudo comprobar si el email existe.'));
    }

    if (!isEmailRegistered) {
      throw new Error('No existe ninguna cuenta registrada con ese email.');
    }

    const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/auth?mode=reset` : undefined;

    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo,
    });

    if (error) {
      throw new Error(getFriendlyErrorMessage(error, 'No se pudo enviar el correo de recuperación.'));
    }
  };

  const signOut = async () => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return;
    }

    await deactivateAndroidPushToken(session);

    try {
      await PushNotifications.unregister();
    } catch (error) {
      console.error('No se pudo desregistrar Android Push Notifications al cerrar sesion', error);
    }

    await markCurrentSessionAsRevoked(session);

    const { error } = await supabase.auth.signOut({ scope: 'local' });

    if (error) {
      throw new Error(getFriendlyErrorMessage(error, 'No se pudo cerrar sesión.'));
    }

    setDeviceSessions((currentState) => currentState.filter((deviceSession) => deviceSession.sessionId !== currentSessionId));
    setCurrentSessionId(null);
  };

  const sendInvitation = async (invitation: SendInvitationInput) => {
    const { supabase, user: activeUser } = await ensureAuthenticatedUser();
    const targetUsername = invitation.username.trim().toLowerCase();

    if (!/^[a-z0-9_]{3,24}$/.test(targetUsername)) {
      throw new Error('El nombre de usuario no es válido. Usa entre 3 y 24 caracteres (letras, números o _).');
    }

    const currentUsername = typeof activeUser.user_metadata?.username === 'string'
      ? activeUser.user_metadata.username.trim().toLowerCase()
      : '';

    if (currentUsername && currentUsername === targetUsername) {
      throw new Error('No puedes enviarte una invitación a ti mismo.');
    }

    const { data: targetUserData, error: targetUserError } = await supabase.rpc('get_user_by_username', {
      username_input: targetUsername,
    });

    if (targetUserError) {
      throw new Error(getFriendlyErrorMessage(targetUserError, 'No se pudo buscar el usuario por nombre de usuario.'));
    }

    const targetUser = Array.isArray(targetUserData) ? targetUserData[0] : null;

    if (!targetUser?.user_id || !targetUser?.email) {
      throw new Error('No existe ninguna cuenta con ese nombre de usuario.');
    }

    if (targetUser.user_id === activeUser.id) {
      throw new Error('No puedes enviarte una invitación a ti mismo.');
    }

    if (state.friends.some((friend) => friend.otherUserId === targetUser.user_id)) {
      throw new Error('Ese usuario ya está en tu lista de amigos.');
    }

    const { data: existingInvitation } = await supabase
      .from('friend_invitations')
      .select('*')
      .eq('from_user_id', activeUser.id)
      .eq('to_user_id', targetUser.user_id)
      .eq('status', 'pending')
      .single();

    if (existingInvitation) {
      throw new Error('Ya tienes una invitación pendiente con este usuario.');
    }

    const { data, error } = await supabase
      .from('friend_invitations')
      .insert({
        from_user_id: activeUser.id,
        to_email: targetUser.email,
        to_username: targetUsername,
        to_user_id: targetUser.user_id,
        invited_name: targetUser.username ?? targetUsername,
        inviter_name: currentUsername || activeUser.email?.split('@')[0] || 'Un amigo',
        inviter_username: currentUsername || null,
        inviter_email: activeUser.email || '',
        status: 'pending',
      })
      .select('*')
      .single();

    if (error) {
      throw new Error(getFriendlyErrorMessage(error, 'No se pudo enviar la invitación.'));
    }

    const createdInvitation = mapInvitationRow(data as InvitationRow);

    setState((currentState) => ({
      ...currentState,
      invitations: [createdInvitation, ...currentState.invitations],
    }));

    return createdInvitation;
  };

  const createGroup = async (group: CreateGroupInput) => {
    const { supabase } = await ensureAuthenticatedUser();
    const normalizedName = group.name.trim();
    const normalizedDescription = group.description?.trim() || null;

    if (!normalizedName) {
      throw new Error('El nombre del grupo no puede estar vacío.');
    }

    const { data, error } = await supabase.rpc('create_group', {
      name_input: normalizedName,
      description_input: normalizedDescription,
    });

    if (error) {
      throw new Error(getFriendlyErrorMessage(error, 'No se pudo crear el grupo.'));
    }

    const createdGroup = mapGroupRow(Array.isArray(data) ? data[0] as GroupRow : data as GroupRow);

    setState((currentState) => ({
      ...currentState,
      groups: [createdGroup, ...currentState.groups],
    }));

    scheduleRealtimeRefresh();

    return createdGroup;
  };

  const sendGroupInvitation = async (invitation: SendGroupInvitationInput) => {
    const { supabase, user: activeUser } = await ensureAuthenticatedUser();
    const deliveryChannel = invitation.deliveryChannel;
    const targetContact = invitation.targetContact.trim();

    if (deliveryChannel !== 'email' && deliveryChannel !== 'whatsapp') {
      throw new Error('Selecciona un canal de invitación válido.');
    }

    if (!targetContact) {
      throw new Error('Indica un email, usuario o teléfono para enviar la invitación.');
    }

    const targetGroup = state.groups.find((item) => item.id === invitation.groupId);

    if (!targetGroup) {
      throw new Error('No se encontró el grupo seleccionado.');
    }

    const currentMember = state.groupMembers.find((item) => item.groupId === invitation.groupId && item.userId === activeUser.id);

    if (!currentMember) {
      throw new Error('No formas parte de este grupo.');
    }

    if (currentMember.role === 'member') {
      throw new Error('Solo los administradores del grupo pueden invitar a nuevos miembros.');
    }

    const normalizedContact = targetContact.toLowerCase();
    const looksLikeEmail = normalizedContact.includes('@');
    const looksLikeUsername = /^[a-z0-9_]{3,24}$/.test(normalizedContact);

    const { data: targetUserData, error: targetUserError } = looksLikeUsername
      ? await supabase.rpc('get_user_by_username', {
          username_input: normalizedContact,
        })
      : { data: null, error: null };

    if (targetUserError) {
      throw new Error(getFriendlyErrorMessage(targetUserError, 'No se pudo buscar el usuario por nombre de usuario.'));
    }

    const targetUser = Array.isArray(targetUserData) ? targetUserData[0] : null;
    const targetEmail = deliveryChannel === 'email'
      ? (looksLikeEmail ? normalizedContact : targetUser?.email ?? '')
      : targetUser?.email ?? '';

    if (deliveryChannel === 'email' && !targetEmail) {
      throw new Error('Introduce un email válido o un nombre de usuario existente para invitar por email.');
    }

    if (targetUser?.user_id === activeUser.id) {
      throw new Error('No puedes invitarte a ti mismo.');
    }

    if (targetUser?.user_id && state.groupMembers.some((item) => item.groupId === invitation.groupId && item.userId === targetUser.user_id)) {
      throw new Error('Ese usuario ya pertenece al grupo.');
    }

    const alreadyPending = state.groupInvitations.some((item) => {
      if (item.groupId !== invitation.groupId || item.status !== 'pending') {
        return false;
      }

      const sameResolvedUser = Boolean(targetUser?.user_id) && item.toUserId === targetUser?.user_id;
      const sameDeliveryTarget = item.deliveryTarget?.toLowerCase() === normalizedContact;

      return sameResolvedUser || sameDeliveryTarget;
    });

    if (alreadyPending) {
      throw new Error('Ya existe una invitación pendiente para este usuario.');
    }

    const { data, error } = await supabase
      .from('group_invitations')
      .insert({
        group_id: invitation.groupId,
        from_user_id: activeUser.id,
        delivery_channel: deliveryChannel,
        delivery_target: normalizedContact,
        to_username: looksLikeUsername ? normalizedContact : null,
        to_email: targetEmail,
        to_user_id: targetUser?.user_id ?? null,
        invited_name: targetUser?.username ?? normalizedContact,
        inviter_name: currentMember.displayName || activeUser.email?.split('@')[0] || 'Un usuario',
        inviter_username: currentMember.username || null,
        inviter_email: activeUser.email || '',
        status: 'pending',
      })
      .select('*')
      .single();

    if (error) {
      throw new Error(getFriendlyErrorMessage(error, 'No se pudo enviar la invitación al grupo.'));
    }

    const createdInvitation = mapGroupInvitationRow(data as GroupInvitationRow);

    setState((currentState) => ({
      ...currentState,
      groupInvitations: [createdInvitation, ...currentState.groupInvitations],
    }));

    scheduleRealtimeRefresh();

    return createdInvitation;
  };

  const acceptGroupInvitation = async (invitationId: string) => {
    const { supabase } = await ensureAuthenticatedUser();

    const { data, error } = await supabase.rpc('accept_group_invitation', {
      invitation_id: invitationId,
    });

    if (error) {
      throw new Error(getFriendlyErrorMessage(error, 'No se pudo aceptar la invitación al grupo.'));
    }

    const createdMember = mapGroupMemberRow(Array.isArray(data) ? data[0] as GroupMemberRow : data as GroupMemberRow);

    setState((currentState) => ({
      ...currentState,
      groupMembers: [createdMember, ...currentState.groupMembers],
      groupInvitations: currentState.groupInvitations.map((item) =>
        item.id === invitationId ? { ...item, status: 'accepted' } : item,
      ),
    }));

    scheduleRealtimeRefresh();

    return createdMember;
  };

  const rejectGroupInvitation = async (invitationId: string) => {
    const { supabase } = await ensureAuthenticatedUser();

    const { error } = await supabase
      .from('group_invitations')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('id', invitationId);

    if (error) {
      throw new Error(getFriendlyErrorMessage(error, 'No se pudo rechazar la invitación al grupo.'));
    }

    setState((currentState) => ({
      ...currentState,
      groupInvitations: currentState.groupInvitations.map((item) =>
        item.id === invitationId ? { ...item, status: 'rejected' } : item,
      ),
    }));

    scheduleRealtimeRefresh();
  };

  const updateGroupMemberRole = async ({ memberId, role }: UpdateGroupMemberRoleInput) => {
    const { supabase, user: activeUser } = await ensureAuthenticatedUser();

    const member = state.groupMembers.find((item) => item.id === memberId);

    if (!member) {
      throw new Error('No se encontró el miembro seleccionado.');
    }

    const myMembership = state.groupMembers.find((item) => item.groupId === member.groupId && item.userId === activeUser.id);

    if (!myMembership || !['owner', 'admin'].includes(myMembership.role)) {
      throw new Error('Solo los administradores del grupo pueden cambiar roles.');
    }

    if (!['owner', 'admin', 'member'].includes(role)) {
      throw new Error('El rol seleccionado no es válido.');
    }

    const { error } = await supabase
      .from('group_members')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', memberId);

    if (error) {
      throw new Error(getFriendlyErrorMessage(error, 'No se pudo actualizar el rol del miembro.'));
    }

    setState((currentState) => ({
      ...currentState,
      groupMembers: currentState.groupMembers.map((item) =>
        item.id === memberId ? { ...item, role } : item,
      ),
    }));

    scheduleRealtimeRefresh();
  };

  const addGroupExpense = async (expense: CreateGroupExpenseInput) => {
    const { supabase, user: activeUser } = await ensureAuthenticatedUser();
    const normalizedDescription = expense.description.trim();

    if (!normalizedDescription) {
      throw new Error('La descripción del gasto no puede estar vacía.');
    }

    if (!Number.isFinite(expense.amount) || expense.amount <= 0) {
      throw new Error('La cantidad del gasto debe ser mayor que cero.');
    }

    const currentMember = state.groupMembers.find((item) => item.groupId === expense.groupId && item.userId === activeUser.id);

    if (!currentMember) {
      throw new Error('No formas parte de este grupo.');
    }

    const payerMember = state.groupMembers.find((item) => item.id === expense.paidByMemberId && item.groupId === expense.groupId);

    if (!payerMember) {
      throw new Error('Selecciona un pagador válido del grupo.');
    }

    const participantMemberIds = Array.from(new Set((expense.participantMemberIds ?? []).filter(Boolean)));

    if ((expense.splitMode ?? 'equal') === 'equal' && participantMemberIds.length === 0) {
      throw new Error('Selecciona al menos un miembro para repartir el gasto.');
    }

    if ((expense.splitMode ?? 'equal') === 'custom') {
      const customShares = expense.customShares ?? [];
      const validCustomShares = customShares.filter(
        (item) => item.memberId && Number.isFinite(item.amount) && item.amount >= 0,
      );

      if (validCustomShares.length === 0) {
        throw new Error('Define al menos una cuota para el reparto personalizado.');
      }

      const customTotal = validCustomShares.reduce((sum, item) => sum + item.amount, 0);
      const roundedCustomTotal = Math.round(customTotal * 100) / 100;
      const roundedExpenseAmount = Math.round(expense.amount * 100) / 100;

      if (Math.abs(roundedCustomTotal - roundedExpenseAmount) > 0.01) {
        throw new Error('La suma de las cuotas debe coincidir con el importe total del gasto.');
      }
    }

    let expenseDateIso: string | null = null;

    if (expense.expenseDate) {
      const normalizedDate = expense.expenseDate.trim();

      if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) {
        throw new Error('La fecha del gasto no tiene un formato válido.');
      }

      const [year, month, day] = normalizedDate.split('-').map((value) => Number.parseInt(value, 10));
      const localNoonDate = new Date(year, month - 1, day, 12, 0, 0, 0);

      if (Number.isNaN(localNoonDate.getTime())) {
        throw new Error('La fecha del gasto no es válida.');
      }

      expenseDateIso = localNoonDate.toISOString();
    }

    const rpcPayload = {
      group_id_input: expense.groupId,
      description_input: normalizedDescription,
      amount_input: expense.amount,
      paid_by_member_id_input: expense.paidByMemberId,
      split_mode_input: expense.splitMode ?? 'equal',
      selected_member_ids_input: participantMemberIds,
      custom_shares_input: (expense.customShares ?? []).map((item) => ({
        member_id: item.memberId,
        amount: item.amount,
      })),
    };

    let rpcResponse = await supabase.rpc('create_group_expense', {
      ...rpcPayload,
      expense_date_input: expenseDateIso,
    });

    // Backward compatibility for environments where the new RPC signature is not deployed yet.
    if (
      rpcResponse.error &&
      (
        rpcResponse.error.code === '42883' ||
        (rpcResponse.error.message.toLowerCase().includes('function public.create_group_expense') &&
          rpcResponse.error.message.toLowerCase().includes('does not exist'))
      )
    ) {
      rpcResponse = await supabase.rpc('create_group_expense', rpcPayload);
    }

    const { data, error } = rpcResponse;

    if (error) {
      throw new Error(getFriendlyErrorMessage(error, 'No se pudo registrar el gasto del grupo.'));
    }

    const createdExpense = mapGroupExpenseRow(Array.isArray(data) ? data[0] as GroupExpenseRow : data as GroupExpenseRow);
    const expenseWithSelectedDate = expenseDateIso
      ? { ...createdExpense, createdAt: expenseDateIso }
      : createdExpense;

    if (expenseDateIso) {
      const { error: updateDateError } = await supabase
        .from('group_expenses')
        .update({ created_at: expenseDateIso })
        .eq('id', createdExpense.id);

      if (updateDateError) {
        console.warn('No se pudo persistir la fecha seleccionada del gasto', updateDateError);
      }
    }

    setState((currentState) => ({
      ...currentState,
      groupExpenses: [expenseWithSelectedDate, ...currentState.groupExpenses],
    }));

    scheduleRealtimeRefresh();

    return expenseWithSelectedDate;
  };

  const updateGroupExpense = async (expense: UpdateGroupExpenseInput) => {
    const { supabase, user: activeUser } = await ensureAuthenticatedUser();
    const normalizedDescription = expense.description.trim();

    if (!normalizedDescription) {
      throw new Error('La descripción del gasto no puede estar vacía.');
    }

    if (!Number.isFinite(expense.amount) || expense.amount <= 0) {
      throw new Error('La cantidad del gasto debe ser mayor que cero.');
    }

    const existingExpense = state.groupExpenses.find((item) => item.id === expense.expenseId);

    if (!existingExpense) {
      throw new Error('No se encontró el gasto seleccionado.');
    }

    const myMembership = state.groupMembers.find(
      (item) => item.groupId === existingExpense.groupId && item.userId === activeUser.id,
    );

    if (!myMembership) {
      throw new Error('No formas parte de este grupo.');
    }

    const canEditExpense =
      existingExpense.createdById === activeUser.id || ['owner', 'admin'].includes(myMembership.role);

    if (!canEditExpense) {
      throw new Error('No tienes permisos para editar este gasto.');
    }

    const payerMember = state.groupMembers.find(
      (item) => item.id === expense.paidByMemberId && item.groupId === existingExpense.groupId,
    );

    if (!payerMember) {
      throw new Error('Selecciona un pagador válido del grupo.');
    }

    const participantMemberIds = Array.from(new Set((expense.participantMemberIds ?? []).filter(Boolean)));

    if ((expense.splitMode ?? 'equal') === 'equal' && participantMemberIds.length === 0) {
      throw new Error('Selecciona al menos un miembro para repartir el gasto.');
    }

    if ((expense.splitMode ?? 'equal') === 'custom') {
      const customShares = expense.customShares ?? [];
      const validCustomShares = customShares.filter(
        (item) => item.memberId && Number.isFinite(item.amount) && item.amount >= 0,
      );

      if (validCustomShares.length === 0) {
        throw new Error('Define al menos una cuota para el reparto personalizado.');
      }

      const customTotal = validCustomShares.reduce((sum, item) => sum + item.amount, 0);
      const roundedCustomTotal = Math.round(customTotal * 100) / 100;
      const roundedExpenseAmount = Math.round(expense.amount * 100) / 100;

      if (Math.abs(roundedCustomTotal - roundedExpenseAmount) > 0.01) {
        throw new Error('La suma de las cuotas debe coincidir con el importe total del gasto.');
      }
    }

    const { data, error } = await supabase.rpc('update_group_expense', {
      expense_id_input: expense.expenseId,
      description_input: normalizedDescription,
      amount_input: expense.amount,
      paid_by_member_id_input: expense.paidByMemberId,
      split_mode_input: expense.splitMode ?? 'equal',
      selected_member_ids_input: participantMemberIds,
      custom_shares_input: (expense.customShares ?? []).map((item) => ({
        member_id: item.memberId,
        amount: item.amount,
      })),
    });

    if (error) {
      throw new Error(getFriendlyErrorMessage(error, 'No se pudo actualizar el gasto del grupo.'));
    }

    const updatedExpense = mapGroupExpenseRow(Array.isArray(data) ? data[0] as GroupExpenseRow : data as GroupExpenseRow);

    setState((currentState) => ({
      ...currentState,
      groupExpenses: currentState.groupExpenses.map((item) =>
        item.id === updatedExpense.id ? updatedExpense : item,
      ),
    }));

    await refreshData({ silent: true });

    return updatedExpense;
  };

  const deleteGroupExpense = async (expenseId: string) => {
    const { supabase, user: activeUser } = await ensureAuthenticatedUser();

    const existingExpense = state.groupExpenses.find((item) => item.id === expenseId);

    if (!existingExpense) {
      throw new Error('No se encontró el gasto seleccionado.');
    }

    const myMembership = state.groupMembers.find(
      (item) => item.groupId === existingExpense.groupId && item.userId === activeUser.id,
    );

    if (!myMembership) {
      throw new Error('No formas parte de este grupo.');
    }

    const canDeleteExpense =
      existingExpense.createdById === activeUser.id || ['owner', 'admin'].includes(myMembership.role);

    if (!canDeleteExpense) {
      throw new Error('No tienes permisos para eliminar este gasto.');
    }

    const { error } = await supabase
      .from('group_expenses')
      .delete()
      .eq('id', expenseId);

    if (error) {
      throw new Error(getFriendlyErrorMessage(error, 'No se pudo eliminar el gasto del grupo.'));
    }

    setState((currentState) => ({
      ...currentState,
      groupExpenses: currentState.groupExpenses.filter((item) => item.id !== expenseId),
      groupExpenseSplits: currentState.groupExpenseSplits.filter((item) => item.expenseId !== expenseId),
    }));

    scheduleRealtimeRefresh();
  };

  const settleGroupExpenseShare = async ({ splitId }: SettleGroupExpenseShareInput) => {
    const { supabase } = await ensureAuthenticatedUser();

    const split = state.groupExpenseSplits.find((item) => item.id === splitId);

    if (!split) {
      throw new Error('No se encontró la cuota seleccionada.');
    }

    const { data, error } = await supabase.rpc('settle_group_expense_share', {
      split_id_input: splitId,
    });

    if (error) {
      throw new Error(getFriendlyErrorMessage(error, 'No se pudo marcar la cuota como pagada.'));
    }

    const settledSplit = mapGroupExpenseSplitRow(Array.isArray(data) ? data[0] as GroupExpenseSplitRow : data as GroupExpenseSplitRow);

    setState((currentState) => ({
      ...currentState,
      groupExpenseSplits: currentState.groupExpenseSplits.map((item) =>
        item.id === splitId ? settledSplit : item,
      ),
    }));

    scheduleRealtimeRefresh();

    return settledSplit;
  };

  const acceptInvitation = async (invitationId: string) => {
    const { supabase, user: activeUser } = await ensureAuthenticatedUser();

    // Call the RPC function to accept invitation and create bilateral friendship
    const { data, error } = await supabase
      .rpc('accept_friend_invitation', { invitation_id: invitationId });

    if (error) {
      throw new Error(getFriendlyErrorMessage(error, 'No se pudo aceptar la invitación.'));
    }

    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('La invitación no existe, no está pendiente o no te pertenece.');
    }

    // Get the invitation to show the correct message
    const { data: invitation } = await supabase
      .from('friend_invitations')
      .select('*')
      .eq('id', invitationId)
      .single();

    // Create a friend object to add to state
    const createdFriend: Friend = {
      id: data[0]?.friend_id || '',
      userId: activeUser.id,
      otherUserId: invitation?.from_user_id,
      name: data[0]?.friend_name || invitation?.inviter_name || 'Amigo',
      username: invitation?.inviter_username || undefined,
      email: invitation?.inviter_email || '',
      avatar: undefined,
      createdAt: new Date().toISOString(),
    };

    setState((currentState) => ({
      ...currentState,
      friends: [...currentState.friends, createdFriend],
      invitations: currentState.invitations.filter((inv) => inv.id !== invitationId),
    }));

    return createdFriend;
  };

  const rejectInvitation = async (invitationId: string) => {
    const { supabase } = await ensureAuthenticatedUser();

    const { error } = await supabase
      .from('friend_invitations')
      .update({ status: 'rejected' })
      .eq('id', invitationId);

    if (error) {
      throw new Error(getFriendlyErrorMessage(error, 'No se pudo rechazar la invitación.'));
    }

    setState((currentState) => ({
      ...currentState,
      invitations: currentState.invitations.filter((inv) => inv.id !== invitationId),
    }));
  };

  const removeFriend = async (friendId: string) => {
    const { supabase } = await ensureAuthenticatedUser();

    const { error } = await supabase.from('friends').delete().eq('id', friendId);

    if (error) {
      throw new Error(getFriendlyErrorMessage(error, 'No se pudo eliminar el amigo.'));
    }

    setState((currentState) => ({
      ...currentState,
      friends: currentState.friends.filter((friend) => friend.id !== friendId),
      debts: currentState.debts.filter((debt) => debt.friendId !== friendId),
    }));
  };

  const addDebt = async (debt: AddDebtInput) => {
    const { supabase, user: activeUser } = await ensureAuthenticatedUser();

    // Find the friend to get the other_user_id
    const friend = state.friends.find(f => f.id === debt.friendId);
    const otherUserId = friend?.otherUserId || null;

    const { data, error } = await supabase
      .from('debts')
      .insert({
        user_id: activeUser.id,
        friend_id: debt.friendId,
        other_user_id: otherUserId,
        amount: debt.amount,
        description: debt.description,
        type: debt.type,
        status: 'pending',
      })
      .select('*')
      .single();

    if (error) {
      throw new Error(getFriendlyErrorMessage(error, 'No se pudo registrar la deuda.'));
    }

    const createdDebt = mapDebtRow(data as DebtRow);

    setState((currentState) => ({
      ...currentState,
      debts: [createdDebt, ...currentState.debts],
    }));

    scheduleRealtimeRefresh();

    return createdDebt;
  };

  const updateDebt = async (debtId: string, debt: UpdateDebtInput) => {
    const { supabase, user: activeUser } = await ensureAuthenticatedUser();

    const currentDebt = state.debts.find((item) => item.id === debtId);

    if (!currentDebt) {
      throw new Error('No se encontró la deuda seleccionada.');
    }

    if (!currentDebt.userId || currentDebt.userId !== activeUser.id) {
      throw new Error('Solo la persona que creó esta deuda puede editarla.');
    }

    const payload: Partial<DebtRow> = {};

    if (debt.description !== undefined) {
      const normalizedDescription = debt.description.trim();

      if (!normalizedDescription) {
        throw new Error('La descripción no puede estar vacía.');
      }

      payload.description = normalizedDescription;
    }

    if (debt.amount !== undefined) {
      if (!Number.isFinite(debt.amount) || debt.amount <= 0) {
        throw new Error('La cantidad debe ser mayor que cero.');
      }

      payload.amount = debt.amount;
    }

    if (debt.type !== undefined) {
      payload.type = debt.type;
    }

    if (debt.friendId !== undefined) {
      const selectedFriend = state.friends.find((item) => item.id === debt.friendId);

      if (!selectedFriend) {
        throw new Error('Selecciona un amigo válido para asignar esta deuda.');
      }

      payload.friend_id = debt.friendId;
      payload.other_user_id = selectedFriend.otherUserId ?? null;
    }

    if (Object.keys(payload).length === 0) {
      return currentDebt;
    }

    const { error } = await supabase.rpc('update_debt_details', {
      debt_id_input: debtId,
      description_input: payload.description ?? null,
      amount_input: payload.amount ?? null,
      type_input: payload.type ?? null,
      friend_id_input: payload.friend_id ?? null,
    });

    if (error) {
      const message = typeof error.message === 'string' ? error.message.toLowerCase() : '';

      if (message.includes('update_debt_details') && message.includes('function')) {
        throw new Error('Falta la función SQL update_debt_details en Supabase. Ejecuta de nuevo el contenido de supabase/schema.sql en el SQL Editor.');
      }

      throw new Error(getFriendlyErrorMessage(error, 'No se pudo actualizar la deuda.'));
    }

    const updatedDebt: Debt = {
      ...currentDebt,
      description: payload.description ?? currentDebt.description,
      amount: payload.amount ?? currentDebt.amount,
      type: payload.type ?? currentDebt.type,
      friendId: payload.friend_id ?? currentDebt.friendId,
    };

    setState((currentState) => ({
      ...currentState,
      debts: currentState.debts.map((item) => (item.id === debtId ? updatedDebt : item)),
    }));

    scheduleRealtimeRefresh();

    return updatedDebt;
  };

  const markAsPaid = async (debtId: string) => {
    const { supabase } = await ensureAuthenticatedUser();

    const debt = state.debts.find((item) => item.id === debtId);

    if (!debt) {
      throw new Error('No se encontró la deuda seleccionada.');
    }

    if (debt.type === 'owed_by_me') {
      const { error } = await supabase.rpc('request_debt_payment', { debt_id_input: debtId });

      if (error) {
        throw new Error(getFriendlyErrorMessage(error, 'No se pudo solicitar la confirmación del pago.'));
      }

      setState((currentState) => ({
        ...currentState,
        debts: currentState.debts.map((item) =>
          item.id === debtId
            ? {
                ...item,
                status: 'payment_requested',
                paidAt: undefined,
                paymentRequestRejectedAt: undefined,
                paymentRequestRejectedByUserId: undefined,
              }
            : item
        ),
      }));

      return;
    }

    const paidAt = new Date().toISOString();
    const { error } = await supabase.rpc('confirm_debt_payment', { debt_id_input: debtId });

    if (error) {
      throw new Error(getFriendlyErrorMessage(error, 'No se pudo confirmar el pago de la deuda.'));
    }

    setState((currentState) => ({
      ...currentState,
      debts: currentState.debts.map((item) =>
        item.id === debtId
          ? {
              ...item,
              status: 'paid',
              paidAt,
              paymentRequestRejectedAt: undefined,
              paymentRequestRejectedByUserId: undefined,
            }
          : item
      ),
    }));
  };

  const rejectDebtPaymentRequest = async (debtId: string) => {
    const { supabase, user: activeUser } = await ensureAuthenticatedUser();

    const debt = state.debts.find((item) => item.id === debtId);

    if (!debt) {
      throw new Error('No se encontró la deuda seleccionada.');
    }

    const { error } = await supabase.rpc('reject_debt_payment_request', { debt_id_input: debtId });

    if (error) {
      throw new Error(getFriendlyErrorMessage(error, 'No se pudo rechazar la solicitud de pago.'));
    }

    setState((currentState) => ({
      ...currentState,
      debts: currentState.debts.map((item) =>
        item.id === debtId
          ? {
              ...item,
              status: 'pending',
              paidAt: undefined,
              paymentRequestRejectedAt: new Date().toISOString(),
              paymentRequestRejectedByUserId: activeUser.id,
              paymentRequestRejectionCount: item.paymentRequestRejectionCount + 1,
            }
          : item
      ),
    }));
  };

  const removeDebt = async (debtId: string) => {
    const { supabase, user: activeUser } = await ensureAuthenticatedUser();

    const debt = state.debts.find((item) => item.id === debtId);

    if (!debt) {
      throw new Error('No se encontro la deuda seleccionada.');
    }

    if (!debt.userId || debt.userId !== activeUser.id) {
      throw new Error('Solo la persona que creo esta deuda puede eliminarla.');
    }

    const { data, error } = await supabase
      .from('debts')
      .delete()
      .eq('id', debtId)
      .eq('user_id', activeUser.id)
      .select('id');

    if (error) {
      throw new Error(getFriendlyErrorMessage(error, 'No se pudo eliminar la deuda.'));
    }

    if (!data || data.length === 0) {
      throw new Error('No se pudo eliminar la deuda. Puede que no tengas permisos o que ya no exista.');
    }

    setState((currentState) => ({
      ...currentState,
      debts: currentState.debts.filter((item) => item.id !== debtId),
    }));
  };

  const setNotificationRead = async (notificationId: string, read: boolean) => {
    const { supabase, user: activeUser } = await ensureAuthenticatedUser();
    const readAt = read ? new Date().toISOString() : null;

    const { data, error } = await supabase
      .from('user_notifications')
      .update({ is_read: read, read_at: readAt })
      .eq('id', notificationId)
      .eq('user_id', activeUser.id)
      .select('id')
      .single();

    if (error || !data) {
      throw new Error(getFriendlyErrorMessage(error, 'No se pudo actualizar la notificación.'));
    }

    setState((currentState) => ({
      ...currentState,
      notifications: currentState.notifications.map((notification) =>
        notification.id === notificationId
          ? {
              ...notification,
              isRead: read,
              readAt: readAt ?? undefined,
            }
          : notification,
      ),
    }));
  };

  const removeNotification = async (notificationId: string) => {
    const { supabase, user: activeUser } = await ensureAuthenticatedUser();

    const { data, error } = await supabase
      .from('user_notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', activeUser.id)
      .select('id')
      .single();

    if (error || !data) {
      throw new Error(getFriendlyErrorMessage(error, 'No se pudo eliminar la notificación.'));
    }

    setState((currentState) => ({
      ...currentState,
      notifications: currentState.notifications.filter((notification) => notification.id !== notificationId),
    }));
  };

  const markAllNotificationsAsRead = async () => {
    const { supabase, user: activeUser } = await ensureAuthenticatedUser();

    const { error } = await supabase
      .from('user_notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('user_id', activeUser.id)
      .eq('is_read', false);

    if (error) {
      throw new Error(getFriendlyErrorMessage(error, 'No se pudieron marcar todas las notificaciones como leídas.'));
    }

    setState((currentState) => ({
      ...currentState,
      notifications: currentState.notifications.map((notification) =>
        notification.isRead
          ? notification
          : {
              ...notification,
              isRead: true,
              readAt: new Date().toISOString(),
            },
      ),
    }));
  };

  const updateNotificationPreference = async (type: NotificationType, channel: NotificationChannel, enabled: boolean) => {
    const { supabase, user: activeUser } = await ensureAuthenticatedUser();

    const nextPreferences: NotificationPreferences = {
      ...notificationPreferences,
      [type]: {
        ...notificationPreferences[type],
        [channel]: enabled,
      },
    };

    const { error } = await supabase
      .from('user_settings')
      .upsert(
        {
          user_id: activeUser.id,
          notification_preferences: nextPreferences,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      );

    if (error) {
      throw new Error(getFriendlyErrorMessage(error, 'No se pudo actualizar la preferencia de notificaciones.'));
    }

    setNotificationPreferences(nextPreferences);
  };

  const updateNotificationChannelEnabled = async (channel: NotificationChannel, enabled: boolean) => {
    const { supabase, user: activeUser } = await ensureAuthenticatedUser();

    const nextChannelSettings: NotificationChannelSettings = {
      ...notificationChannelsEnabled,
      [channel]: enabled,
    };

    const { error } = await supabase
      .from('user_settings')
      .upsert(
        {
          user_id: activeUser.id,
          notifications_enabled_web: nextChannelSettings.web,
          notifications_enabled_app: nextChannelSettings.app,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      );

    if (error) {
      throw new Error(getFriendlyErrorMessage(error, 'No se pudo actualizar la configuración global de notificaciones.'));
    }

    setNotificationChannelsEnabled(nextChannelSettings);
  };

  const setTheme = async (newTheme: Theme) => {
    const { supabase, user: activeUser } = await ensureAuthenticatedUser();

    const { error } = await supabase
      .from('user_settings')
      .upsert({ user_id: activeUser.id, theme: newTheme, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });

    if (error) {
      throw new Error(getFriendlyErrorMessage(error, 'No se pudo guardar la preferencia de tema.'));
    }

    setThemeState(newTheme);
  };

  const updateUserProfile = async ({ username, avatarFile }: UpdateProfileInput) => {
    const { supabase, user: activeUser } = await ensureAuthenticatedUser();

    const normalizedUsername = username.trim().toLowerCase();
    const currentUsername = typeof activeUser.user_metadata?.username === 'string'
      ? activeUser.user_metadata.username.trim().toLowerCase()
      : '';

    if (!/^[a-z0-9_]{3,24}$/.test(normalizedUsername)) {
      throw new Error('El nombre de usuario debe tener entre 3 y 24 caracteres y solo puede incluir letras, números y guiones bajos (_).');
    }

    const hasUsernameChanged = normalizedUsername !== currentUsername;

    if (hasUsernameChanged) {
      const { error: updateUsernameError } = await supabase.rpc('update_my_username', {
        username_input: normalizedUsername,
      });

      if (updateUsernameError) {
        throw new Error(getFriendlyErrorMessage(updateUsernameError, 'No se pudo actualizar tu nombre de usuario.'));
      }
    }

    let uploadedAvatarUrl: string | null | undefined;

    if (avatarFile) {
      const extension = avatarFile.name.split('.').pop()?.toLowerCase() || 'jpg';
      const safeExtension = extension.replace(/[^a-z0-9]/g, '') || 'jpg';
      const filePath = `${activeUser.id}/${Date.now()}.${safeExtension}`;

      const { error: uploadError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(filePath, avatarFile, {
          cacheControl: '3600',
          upsert: true,
          contentType: avatarFile.type || undefined,
        });

      if (uploadError) {
        throw new Error(getFriendlyErrorMessage(uploadError, 'No se pudo subir la imagen de perfil.'));
      }

      const { data: publicData } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(filePath);
      uploadedAvatarUrl = publicData.publicUrl;
    }

    const metadataUpdates: Record<string, unknown> = {};

    if (hasUsernameChanged) {
      metadataUpdates.username = normalizedUsername;
    }

    if (uploadedAvatarUrl) {
      metadataUpdates.avatar_url = uploadedAvatarUrl;
    }

    if (Object.keys(metadataUpdates).length > 0) {
      const { data: authUpdateData, error: updateAuthMetadataError } = await supabase.auth.updateUser({
        data: metadataUpdates,
      });

      if (updateAuthMetadataError) {
        throw new Error(getFriendlyErrorMessage(updateAuthMetadataError, 'No se pudo sincronizar tu perfil con autenticación.'));
      }

      if (authUpdateData.user) {
        setUser(authUpdateData.user);
      }
    }

    if (uploadedAvatarUrl) {
      const { error: friendsAvatarError } = await supabase
        .from('friends')
        .update({ avatar: uploadedAvatarUrl })
        .eq('other_user_id', activeUser.id);

      if (friendsAvatarError) {
        throw new Error(getFriendlyErrorMessage(friendsAvatarError, 'Se actualizó tu perfil, pero no se pudo propagar tu avatar a tus amigos.'));
      }
    }

    const { error: friendsUsernameError } = await supabase
      .from('friends')
      .update({ username: normalizedUsername })
      .eq('other_user_id', activeUser.id);

    if (friendsUsernameError) {
      throw new Error(getFriendlyErrorMessage(friendsUsernameError, 'Se actualizó tu perfil, pero no se pudo propagar tu nombre de usuario a tus amigos.'));
    }

    if (Object.keys(metadataUpdates).length === 0) {
      setUser(activeUser);
    }
  };

  const updatePassword = async (newPassword: string) => {
    const { supabase } = await ensureAuthenticatedUser();

    const normalizedPassword = newPassword.trim();

    if (normalizedPassword.length < 8) {
      throw new Error('La nueva contraseña debe tener al menos 8 caracteres.');
    }

    const { error } = await supabase.auth.updateUser({
      password: normalizedPassword,
    });

    if (error) {
      throw new Error(getFriendlyErrorMessage(error, 'No se pudo actualizar la contraseña.'));
    }
  };

  return createElement(
    PagaYaContext.Provider,
    {
      value: {
        friends: state.friends,
        invitations: state.invitations,
        debts: state.debts,
        groups: state.groups,
        groupMembers: state.groupMembers,
        groupInvitations: state.groupInvitations,
        groupExpenses: state.groupExpenses,
        groupExpenseSplits: state.groupExpenseSplits,
        notifications: state.notifications,
        isReady,
        isConfigured: configured,
        isAuthenticated: Boolean(user),
        isLoadingAuth,
        isLoadingData,
        session,
        user,
        deviceSessions,
        currentSessionId,
        theme,
        notificationPreferences,
        notificationChannelsEnabled,
        setTheme,
        signIn,
        signInWithGoogle,
        connectGoogleIdentity,
        disconnectGoogleIdentity,
        signUp,
        requestPasswordReset,
        signOut,
        refreshData,
        refreshDeviceSessions,
        sendInvitation,
        createGroup,
        sendGroupInvitation,
        acceptGroupInvitation,
        rejectGroupInvitation,
        updateGroupMemberRole,
        addGroupExpense,
        updateGroupExpense,
        deleteGroupExpense,
        settleGroupExpenseShare,
        acceptInvitation,
        rejectInvitation,
        removeFriend,
        addDebt,
        updateDebt,
        markAsPaid,
        rejectDebtPaymentRequest,
        removeDebt,
        updateUserProfile,
        updatePassword,
        setNotificationRead,
        removeNotification,
        markAllNotificationsAsRead,
        updateNotificationPreference,
        updateNotificationChannelEnabled,
      },
    },
    children
  );
}

export function usePagaYa() {
  const context = useContext(PagaYaContext);

  if (!context) {
    throw new Error('usePagaYa debe usarse dentro de PagaYaProvider');
  }

  return context;
}
