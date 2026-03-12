"use client"

import { ReactNode, createContext, createElement, useContext, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { AppState, AuthCredentials, Debt, DebtStatus, DebtType, Friend, FriendInvitation, InvitationStatus } from '@/lib/types';
import { getSupabaseBrowserClient, isSupabaseConfigured } from '@/lib/supabase';

type AddFriendInput = Pick<Friend, 'name' | 'email' | 'avatar'>;
type AddDebtInput = Pick<Debt, 'friendId' | 'amount' | 'description' | 'type'>;
type UpdateProfileInput = {
  fullName: string;
  avatarFile: File | null;
};
type SendInvitationInput = {
  email: string;
  name: string;
};

const AVATAR_BUCKET = 'avatars';

interface FriendRow {
  id: string;
  user_id: string;
  other_user_id: string;
  name: string;
  email: string;
  avatar: string | null;
  created_at: string;
}

interface InvitationRow {
  id: string;
  from_user_id: string;
  to_email: string;
  to_user_id: string | null;
  invited_name: string | null;
  inviter_name: string;
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
}

interface PagaYaContextValue extends AppState {
  isReady: boolean;
  isConfigured: boolean;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  isLoadingData: boolean;
  session: Session | null;
  user: User | null;
  signIn: (credentials: AuthCredentials) => Promise<void>;
  signUp: (credentials: AuthCredentials) => Promise<void>;
  signOut: () => Promise<void>;
  refreshData: () => Promise<void>;
  sendInvitation: (invitation: SendInvitationInput) => Promise<FriendInvitation>;
  acceptInvitation: (invitationId: string) => Promise<Friend>;
  rejectInvitation: (invitationId: string) => Promise<void>;
  removeFriend: (friendId: string) => Promise<void>;
  addDebt: (debt: AddDebtInput) => Promise<Debt>;
  markAsPaid: (debtId: string) => Promise<void>;
  removeDebt: (debtId: string) => Promise<void>;
  updateUserProfile: (profile: UpdateProfileInput) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
}

const PagaYaContext = createContext<PagaYaContextValue | null>(null);

const EMPTY_STATE: AppState = {
  friends: [],
  invitations: [],
  debts: [],
};

function mapFriendRow(row: FriendRow): Friend {
  return {
    id: row.id,
    userId: row.user_id,
    otherUserId: row.other_user_id,
    name: row.name,
    email: row.email,
    avatar: row.avatar ?? undefined,
    createdAt: row.created_at,
  };
}

function mapInvitationRow(row: InvitationRow): FriendInvitation {
  return {
    id: row.id,
    fromUserId: row.from_user_id,
    toEmail: row.to_email,
    toUserId: row.to_user_id ?? undefined,
    inviterName: row.inviter_name,
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
  };
}

function getFriendlyErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }

  return fallback;
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
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const configured = useMemo(() => isSupabaseConfigured(), []);

  const refreshData = async () => {
    const { supabase, user: activeUser } = await ensureAuthenticatedUser();

    setIsLoadingData(true);

    try {
      const [
        { data: friendsData, error: friendsError },
        { data: invitationsData, error: invitationsError },
        { data: debtsData, error: debtsError }
      ] = await Promise.all([
        supabase.from('friends').select('*').eq('user_id', activeUser.id).order('created_at', { ascending: false }),
        supabase.from('friend_invitations').select('*').or(`from_user_id.eq.${activeUser.id},to_user_id.eq.${activeUser.id},to_email.eq.${activeUser.email}`).order('created_at', { ascending: false }),
        supabase.from('debts').select('*').or(`user_id.eq.${activeUser.id},other_user_id.eq.${activeUser.id}`).order('created_at', { ascending: false }),
      ]);

      if (friendsError) {
        throw friendsError;
      }

      if (invitationsError) {
        throw invitationsError;
      }

      if (debtsError) {
        throw debtsError;
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
      });
    } finally {
      setIsLoadingData(false);
    }
  };

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

      if (currentSession?.user) {
        try {
          await refreshData();
        } catch (error) {
          console.error('No se pudieron cargar los datos iniciales', error);
        }
      } else {
        setState(EMPTY_STATE);
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

      if (!nextSession?.user) {
        setState(EMPTY_STATE);
        setIsLoadingAuth(false);
        setIsReady(true);
        return;
      }

      void refreshData().catch((error) => {
        console.error('No se pudieron refrescar los datos del usuario', error);
      });
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [configured]);

  const signIn = async ({ email, password }: AuthCredentials) => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      throw new Error('Faltan las variables NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.');
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      throw new Error(getFriendlyErrorMessage(error, 'No se pudo iniciar sesión.'));
    }
  };

  const signUp = async ({ email, password }: AuthCredentials) => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      throw new Error('Faltan las variables NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.');
    }

    const { error } = await supabase.auth.signUp({ email, password });

    if (error) {
      throw new Error(getFriendlyErrorMessage(error, 'No se pudo crear la cuenta.'));
    }
  };

  const signOut = async () => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return;
    }

    const { error } = await supabase.auth.signOut();

    if (error) {
      throw new Error(getFriendlyErrorMessage(error, 'No se pudo cerrar sesión.'));
    }
  };

  const sendInvitation = async (invitation: SendInvitationInput) => {
    const { supabase, user: activeUser } = await ensureAuthenticatedUser();

    // Try to find the user_id by email
    let toUserId: string | null = null;
    const { data: userData } = await supabase.rpc('get_user_id_by_email', { email_input: invitation.email });
    if (userData) {
      toUserId = userData;
    }

    // Check if already sent
    const { data: existingInvitation } = await supabase
      .from('friend_invitations')
      .select('*')
      .eq('from_user_id', activeUser.id)
      .eq('to_email', invitation.email)
      .eq('status', 'pending')
      .single();

    if (existingInvitation) {
      throw new Error('Ya existe una invitación pendiente con este email.');
    }

    const { data, error } = await supabase
      .from('friend_invitations')
      .insert({
        from_user_id: activeUser.id,
        to_email: invitation.email,
        to_user_id: toUserId,
        invited_name: invitation.name,
        inviter_name: (activeUser.user_metadata?.full_name as string) || activeUser.email?.split('@')[0] || 'Un amigo',
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

  const acceptInvitation = async (invitationId: string) => {
    const { supabase, user: activeUser } = await ensureAuthenticatedUser();

    // Call the RPC function to accept invitation and create bilateral friendship
    const { data, error } = await supabase
      .rpc('accept_friend_invitation', { invitation_id: invitationId });

    if (error) {
      throw new Error(getFriendlyErrorMessage(error, 'No se pudo aceptar la invitación.'));
    }

    // Get the invitation to show the correct message
    const { data: invitation } = await supabase
      .from('friend_invitations')
      .select('*')
      .eq('id', invitationId)
      .single();

    // Create a friend object to add to state
    const createdFriend: Friend = {
      id: data?.[0]?.friend_id || '',
      userId: activeUser.id,
      otherUserId: invitation?.from_user_id,
      name: data?.[0]?.friend_name || invitation?.inviter_name || 'Amigo',
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

    return createdDebt;
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
          item.id === debtId ? { ...item, status: 'payment_requested', paidAt: undefined } : item
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
        item.id === debtId ? { ...item, status: 'paid', paidAt } : item
      ),
    }));
  };

  const removeDebt = async (debtId: string) => {
    const { supabase } = await ensureAuthenticatedUser();

    const { error } = await supabase.from('debts').delete().eq('id', debtId);

    if (error) {
      throw new Error(getFriendlyErrorMessage(error, 'No se pudo eliminar la deuda.'));
    }

    setState((currentState) => ({
      ...currentState,
      debts: currentState.debts.filter((debt) => debt.id !== debtId),
    }));
  };

  const updateUserProfile = async ({ fullName, avatarFile }: UpdateProfileInput) => {
    const { supabase, user: activeUser } = await ensureAuthenticatedUser();

    const normalizedName = fullName.trim();
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

    const { data, error } = await supabase.auth.updateUser({
      data: {
        full_name: normalizedName || null,
        ...(uploadedAvatarUrl ? { avatar_url: uploadedAvatarUrl } : {}),
      },
    });

    if (error) {
      throw new Error(getFriendlyErrorMessage(error, 'No se pudo actualizar tu perfil.'));
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

    if (data.user) {
      setUser(data.user);
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
        isReady,
        isConfigured: configured,
        isAuthenticated: Boolean(user),
        isLoadingAuth,
        isLoadingData,
        session,
        user,
        signIn,
        signUp,
        signOut,
        refreshData,
        sendInvitation,
        acceptInvitation,
        rejectInvitation,
        removeFriend,
        addDebt,
        markAsPaid,
        removeDebt,
        updateUserProfile,
        updatePassword,
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
