"use client"

import { ReactNode, createContext, createElement, useContext, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { AppState, AuthCredentials, Debt, DebtStatus, DebtType, Friend } from '@/lib/types';
import { getSupabaseBrowserClient, isSupabaseConfigured } from '@/lib/supabase';

type AddFriendInput = Pick<Friend, 'name' | 'email' | 'avatar'>;
type AddDebtInput = Pick<Debt, 'friendId' | 'amount' | 'description' | 'type'>;
type UpdateProfileInput = {
  fullName: string;
  avatarFile: File | null;
};

const AVATAR_BUCKET = 'avatars';

interface FriendRow {
  id: string;
  user_id: string;
  name: string;
  email: string;
  avatar: string | null;
  created_at: string;
}

interface DebtRow {
  id: string;
  user_id: string;
  friend_id: string;
  amount: number;
  description: string;
  type: DebtType;
  status: DebtStatus;
  created_at: string;
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
  addFriend: (friend: AddFriendInput) => Promise<Friend>;
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
  debts: [],
};

function mapFriendRow(row: FriendRow): Friend {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    email: row.email,
    avatar: row.avatar ?? undefined,
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
      const [{ data: friendsData, error: friendsError }, { data: debtsData, error: debtsError }] = await Promise.all([
        supabase.from('friends').select('*').eq('user_id', activeUser.id).order('created_at', { ascending: true }),
        supabase.from('debts').select('*').eq('user_id', activeUser.id).order('created_at', { ascending: false }),
      ]);

      if (friendsError) {
        throw friendsError;
      }

      if (debtsError) {
        throw debtsError;
      }

      setState({
        friends: (friendsData ?? []).map((row) => mapFriendRow(row as FriendRow)),
        debts: (debtsData ?? []).map((row) => mapDebtRow(row as DebtRow)),
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

  const addFriend = async (friend: AddFriendInput) => {
    const { supabase, user: activeUser } = await ensureAuthenticatedUser();

    const { data, error } = await supabase
      .from('friends')
      .insert({
        user_id: activeUser.id,
        name: friend.name,
        email: friend.email,
        avatar: friend.avatar ?? null,
      })
      .select('*')
      .single();

    if (error) {
      throw new Error(getFriendlyErrorMessage(error, 'No se pudo guardar el amigo.'));
    }

    const createdFriend = mapFriendRow(data as FriendRow);

    setState((currentState) => ({
      ...currentState,
      friends: [...currentState.friends, createdFriend],
    }));

    return createdFriend;
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

    const { data, error } = await supabase
      .from('debts')
      .insert({
        user_id: activeUser.id,
        friend_id: debt.friendId,
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

    const { error } = await supabase.from('debts').update({ status: 'paid' }).eq('id', debtId);

    if (error) {
      throw new Error(getFriendlyErrorMessage(error, 'No se pudo marcar la deuda como pagada.'));
    }

    setState((currentState) => ({
      ...currentState,
      debts: currentState.debts.map((debt) =>
        debt.id === debtId ? { ...debt, status: 'paid' } : debt
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
        addFriend,
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
