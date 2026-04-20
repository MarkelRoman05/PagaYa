"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Navbar } from "@/components/layout/Navbar";
import { usePagaYa } from "@/hooks/use-pagaya";
import { AppLoadingScreen } from "@/components/ui/app-loading-screen";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { CalendarDays, ChevronLeft, CircleDollarSign, Copy, ImagePlus, LoaderCircle, MessageCircleMore, PencilLine, Plus, QrCode, ReceiptText, Share2, Shield, Trash2, Users, X } from "lucide-react";

type FinancialStatus = "al día" | "moroso" | "moroso premium" | "pendiente";

const EMOJI_OPTIONS = ["💰", "🍽️", "🍕", "🏨", "🚗", "⛽", "🎬", "🎮", "🎸", "✈️", "🎁", "🛍️", "💇", "🏥", "📚", "🎓", "⚽", "🏃", "🎂", "🍰", "☕", "🍺", "🍷", "🎉", "🎊", "🏪", "🚕", "🚌", "🚇", "🎭", "🎪", "🎨", "📸", "🎤", "🎧", "🎼", "🎹", "🥘", "🍜", "🍲", "🥗", "🍔", "🌮", "🍱", "🍛", "🍝"];

function getMemberLabel(member: { displayName: string; username?: string }) {
  return member.username ? `@${member.username}` : member.displayName;
}

function daysSince(dateIso?: string) {
  if (!dateIso) {
    return 0;
  }

  return Math.max(0, Math.floor((Date.now() - new Date(dateIso).getTime()) / (1000 * 60 * 60 * 24)));
}

function getFinancialStatus(days: number, hasDebt: boolean): FinancialStatus {
  if (!hasDebt) {
    return "al día";
  }

  if (days >= 4) {
    return "moroso premium";
  }

  if (days >= 2) {
    return "moroso";
  }

  return "pendiente";
}

function getTodayDateInputValue() {
  const now = new Date();
  const tzOffsetMs = now.getTimezoneOffset() * 60 * 1000;
  return new Date(now.getTime() - tzOffsetMs).toISOString().slice(0, 10);
}

function normalizeAmountInput(value: string) {
  let normalizedValue = value;

  normalizedValue = normalizedValue.replace(/\./g, ",");
  normalizedValue = normalizedValue.replace(/[^\d,]/g, "");

  const parts = normalizedValue.split(",");
  if (parts.length > 2) {
    normalizedValue = `${parts[0]},${parts.slice(1).join("")}`;
  }

  if (normalizedValue.startsWith(",")) {
    normalizedValue = `0${normalizedValue}`;
  }

  normalizedValue = normalizedValue.replace(/^0+(?=\d)/, "");

  return normalizedValue;
}

function isGroupImageIcon(value?: string) {
  if (!value) {
    return false;
  }

  return value.startsWith("http://") || value.startsWith("https://") || value.startsWith("data:image/");
}

export default function GroupDetailPage() {
  const params = useParams<{ groupId: string }>();
  const { toast } = useToast();
  const {
    user,
    groups,
    groupMembers,
    groupExpenses,
    groupExpenseSplits,
    isReady,
    sendGroupInvitation,
    addGroupExpense,
    updateGroupExpense,
    deleteGroupExpense,
    settleGroupExpenseShare,
    updateGroupMemberRole,
    refreshData,
  } = usePagaYa();
  const [isSavingExpense, setIsSavingExpense] = useState(false);
  const [activeSplitId, setActiveSplitId] = useState<string | null>(null);
  const [activeMemberRoleId, setActiveMemberRoleId] = useState<string | null>(null);
  const [isDetailIconPickerOpen, setIsDetailIconPickerOpen] = useState(false);
  const detailIconTriggerRef = useRef<HTMLButtonElement | null>(null);
  const detailIconPickerRef = useRef<HTMLDivElement | null>(null);
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null);
  const [isExpenseDetailOpen, setIsExpenseDetailOpen] = useState(false);
  const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isEditGroupModalOpen, setIsEditGroupModalOpen] = useState(false);
  const [isUpdatingGroupInfo, setIsUpdatingGroupInfo] = useState(false);
  const [isUploadingGroupIcon, setIsUploadingGroupIcon] = useState(false);
  const [groupEditForm, setGroupEditForm] = useState({ icon: "👥", name: "", description: "" });
  const groupIconFileInputRef = useRef<HTMLInputElement | null>(null);
  const [isGeneratingShareLink, setIsGeneratingShareLink] = useState(false);
  const [shareInviteUrl, setShareInviteUrl] = useState<string | null>(null);
  const [expenseSplitMode, setExpenseSplitMode] = useState<"equal" | "custom">("equal");
  const [selectedSplitMemberIds, setSelectedSplitMemberIds] = useState<string[]>([]);
  const [customSplitByMember, setCustomSplitByMember] = useState<Record<string, string>>({});
  const [isUpdatingExpense, setIsUpdatingExpense] = useState(false);
  const [isDeletingExpense, setIsDeletingExpense] = useState(false);
  const [isDeleteExpenseConfirmOpen, setIsDeleteExpenseConfirmOpen] = useState(false);
  const [isExpenseEditMode, setIsExpenseEditMode] = useState(false);
  const [editExpenseForm, setEditExpenseForm] = useState({ description: "", amount: "", paidByMemberId: "" });
  const [editExpenseSplitMode, setEditExpenseSplitMode] = useState<"equal" | "custom">("equal");
  const [editSelectedMemberIds, setEditSelectedMemberIds] = useState<string[]>([]);
  const [editCustomSplitByMember, setEditCustomSplitByMember] = useState<Record<string, string>>({});
  const [expenseForm, setExpenseForm] = useState({ description: "", amount: "", paidByMemberId: "", expenseDate: getTodayDateInputValue() });

  const groupId = typeof params?.groupId === "string" ? params.groupId : Array.isArray(params?.groupId) ? params.groupId[0] : undefined;
  const group = groups.find((item) => item.id === groupId);
  const groupName = group?.name ?? "este grupo";
  const members = groupMembers.filter((item) => item.groupId === groupId);
  const expenses = groupExpenses.filter((item) => item.groupId === groupId);
  const splits = groupExpenseSplits.filter((item) => item.groupId === groupId);
  const currentMember = members.find((item) => item.userId === user?.id);
  const canManageMembers = currentMember?.role === "owner" || currentMember?.role === "admin";

  const balances = useMemo(() => {
    const netByMemberId = new Map<string, number>();
    const oldestUnsettledByMember = new Map<string, string>();

    for (const member of members) {
      netByMemberId.set(member.id, 0);
    }

    for (const expense of expenses) {
      netByMemberId.set(expense.paidByMemberId, (netByMemberId.get(expense.paidByMemberId) ?? 0) + expense.amount);
    }

    for (const split of splits) {
      netByMemberId.set(split.memberId, (netByMemberId.get(split.memberId) ?? 0) - split.shareAmount);

      if (!split.isSettled) {
        const currentOldest = oldestUnsettledByMember.get(split.memberId);
        if (!currentOldest || new Date(split.createdAt).getTime() < new Date(currentOldest).getTime()) {
          oldestUnsettledByMember.set(split.memberId, split.createdAt);
        }
      }
    }

    return members.map((member) => {
      const balance = netByMemberId.get(member.id) ?? 0;
      const status = getFinancialStatus(daysSince(oldestUnsettledByMember.get(member.id)), balance < 0);

      return {
        member,
        balance,
        status,
      };
    });
  }, [expenses, members, splits]);

  // Calcular mis gastos (del usuario actual)
  const myExpenses = useMemo(() => {
    return expenses.reduce((sum, expense) => {
      const myMember = members.find((m) => m.userId === user?.id);
      if (myMember && expense.paidByMemberId === myMember.id) {
        return sum + expense.amount;
      }
      return sum;
    }, 0);
  }, [expenses, members, user?.id]);

  // Total de gastos del grupo
  const totalExpenses = useMemo(() => {
    return expenses.reduce((sum, expense) => sum + expense.amount, 0);
  }, [expenses]);

  // Gastos ordenados por fecha (más recientes primero)
  const sortedExpenses = useMemo(() => {
    const toEpoch = (value: string) => {
      const epoch = new Date(value).getTime();
      return Number.isFinite(epoch) ? epoch : 0;
    };

    return [...expenses].sort((a, b) => {
      const createdAtDiff = toEpoch(b.createdAt) - toEpoch(a.createdAt);

      if (createdAtDiff !== 0) {
        return createdAtDiff;
      }

      const updatedAtDiff = toEpoch(b.updatedAt) - toEpoch(a.updatedAt);

      if (updatedAtDiff !== 0) {
        return updatedAtDiff;
      }

      return 0;
    });
  }, [expenses]);

  // Gastos agrupados por fecha
  const groupedExpenses = useMemo(() => {
    const groups = new Map<string, typeof sortedExpenses>();
    
    for (const expense of sortedExpenses) {
      const expenseDate = new Date(expense.createdAt);
      const dateKey = expenseDate.toLocaleDateString("es-ES", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      
      if (!groups.has(dateKey)) {
        groups.set(dateKey, []);
      }
      groups.get(dateKey)!.push(expense);
    }
    
    return Array.from(groups.entries());
  }, [sortedExpenses]);

  const parseAmountInput = (value: string) => Number.parseFloat(value.replace(",", ".").replace(/[^0-9.-]/g, ""));

  useEffect(() => {
    if (!isDetailIconPickerOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;

      if (detailIconTriggerRef.current?.contains(target) || detailIconPickerRef.current?.contains(target)) {
        return;
      }

      setIsDetailIconPickerOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isDetailIconPickerOpen]);

  const selectedMembers = useMemo(
    () => members.filter((member) => selectedSplitMemberIds.includes(member.id)),
    [members, selectedSplitMemberIds],
  );

  const customSplitTotal = useMemo(
    () => selectedMembers.reduce((sum, member) => sum + (Number.isFinite(parseAmountInput(customSplitByMember[member.id] ?? "")) ? parseAmountInput(customSplitByMember[member.id] ?? "") : 0), 0),
    [customSplitByMember, selectedMembers],
  );

  const addExpenseParsedAmount = useMemo(() => {
    const parsed = parseAmountInput(expenseForm.amount);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }, [expenseForm.amount]);

  const customSplitRemainingAmount = useMemo(() => {
    return Math.round((addExpenseParsedAmount - customSplitTotal) * 100) / 100;
  }, [addExpenseParsedAmount, customSplitTotal]);

  const equalSplitAmountPerMember = useMemo(() => {
    if (selectedSplitMemberIds.length === 0) {
      return null;
    }

    if (!Number.isFinite(addExpenseParsedAmount) || addExpenseParsedAmount <= 0) {
      return null;
    }

    return addExpenseParsedAmount / selectedSplitMemberIds.length;
  }, [addExpenseParsedAmount, selectedSplitMemberIds.length]);

  const selectedExpense = useMemo(
    () => expenses.find((expense) => expense.id === selectedExpenseId) ?? null,
    [expenses, selectedExpenseId],
  );

  const selectedExpenseSplits = useMemo(
    () => splits.filter((split) => split.expenseId === selectedExpenseId),
    [splits, selectedExpenseId],
  );

  const editCustomSplitTotal = useMemo(() => {
    return editSelectedMemberIds.reduce((sum, memberId) => {
      const parsed = parseAmountInput(editCustomSplitByMember[memberId] ?? "");
      return sum + (Number.isFinite(parsed) ? parsed : 0);
    }, 0);
  }, [editCustomSplitByMember, editSelectedMemberIds]);

  const editExpenseParsedAmount = useMemo(() => {
    const parsed = parseAmountInput(editExpenseForm.amount);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }, [editExpenseForm.amount]);

  const editCustomSplitRemainingAmount = useMemo(() => {
    return Math.round((editExpenseParsedAmount - editCustomSplitTotal) * 100) / 100;
  }, [editCustomSplitTotal, editExpenseParsedAmount]);

  const canEditSelectedExpense = useMemo(() => {
    if (!selectedExpense || !currentMember || !user) {
      return false;
    }

    return selectedExpense.createdById === user.id || currentMember.role === "owner" || currentMember.role === "admin";
  }, [currentMember, selectedExpense, user]);

  const formatAmountInputValue = (value: number) => {
    const rounded = Math.max(0, Math.round(value * 100) / 100);
    return rounded.toFixed(2).replace(".", ",");
  };

  const handleAmountFieldBlur = () => {
    const normalizedValue = normalizeAmountInput(expenseForm.amount);

    if (!normalizedValue) {
      return;
    }

    const parsedValue = parseAmountInput(normalizedValue);
    if (!Number.isFinite(parsedValue)) {
      return;
    }

    setExpenseForm((current) => ({
      ...current,
      amount: formatAmountInputValue(parsedValue),
    }));
  };

  const handleCustomSplitAmountBlur = (memberId: string) => {
    const rawValue = customSplitByMember[memberId] ?? "";
    const normalizedValue = normalizeAmountInput(rawValue);

    if (!normalizedValue) {
      return;
    }

    const parsedValue = parseAmountInput(normalizedValue);
    if (!Number.isFinite(parsedValue)) {
      return;
    }

    const otherMembersTotal = selectedSplitMemberIds.reduce((sum, id) => {
      if (id === memberId) {
        return sum;
      }

      const parsed = parseAmountInput(customSplitByMember[id] ?? "");
      return sum + (Number.isFinite(parsed) ? parsed : 0);
    }, 0);

    const maxAllowed = Math.max(0, Math.round((addExpenseParsedAmount - otherMembersTotal) * 100) / 100);
    const finalValue = Math.min(parsedValue, maxAllowed);

    setCustomSplitByMember((current) => ({
      ...current,
      [memberId]: formatAmountInputValue(finalValue),
    }));
  };

  const handleCustomSplitAmountChange = (memberId: string, nextValue: string) => {
    const normalizedValue = normalizeAmountInput(nextValue);

    if (!normalizedValue) {
      setCustomSplitByMember((current) => ({ ...current, [memberId]: "" }));
      return;
    }

    const parsedValue = parseAmountInput(normalizedValue);
    if (!Number.isFinite(parsedValue)) {
      return;
    }

    const otherMembersTotal = selectedSplitMemberIds.reduce((sum, id) => {
      if (id === memberId) {
        return sum;
      }

      const parsed = parseAmountInput(customSplitByMember[id] ?? "");
      return sum + (Number.isFinite(parsed) ? parsed : 0);
    }, 0);

    const maxAllowed = Math.max(0, Math.round((addExpenseParsedAmount - otherMembersTotal) * 100) / 100);

    setCustomSplitByMember((current) => ({
      ...current,
      [memberId]: parsedValue > maxAllowed ? formatAmountInputValue(maxAllowed) : normalizedValue,
    }));
  };

  const handleEditCustomSplitAmountChange = (memberId: string, nextValue: string) => {
    const normalizedValue = normalizeAmountInput(nextValue);

    if (!normalizedValue) {
      setEditCustomSplitByMember((current) => ({ ...current, [memberId]: "" }));
      return;
    }

    const parsedValue = parseAmountInput(normalizedValue);
    if (!Number.isFinite(parsedValue)) {
      return;
    }

    const otherMembersTotal = editSelectedMemberIds.reduce((sum, id) => {
      if (id === memberId) {
        return sum;
      }

      const parsed = parseAmountInput(editCustomSplitByMember[id] ?? "");
      return sum + (Number.isFinite(parsed) ? parsed : 0);
    }, 0);

    const maxAllowed = Math.max(0, Math.round((editExpenseParsedAmount - otherMembersTotal) * 100) / 100);

    setEditCustomSplitByMember((current) => ({
      ...current,
      [memberId]: parsedValue > maxAllowed ? formatAmountInputValue(maxAllowed) : normalizedValue,
    }));
  };

  const handleEditCustomSplitAmountBlur = (memberId: string) => {
    const rawValue = editCustomSplitByMember[memberId] ?? "";
    const normalizedValue = normalizeAmountInput(rawValue);

    if (!normalizedValue) {
      return;
    }

    const parsedValue = parseAmountInput(normalizedValue);
    if (!Number.isFinite(parsedValue)) {
      return;
    }

    const otherMembersTotal = editSelectedMemberIds.reduce((sum, id) => {
      if (id === memberId) {
        return sum;
      }

      const parsed = parseAmountInput(editCustomSplitByMember[id] ?? "");
      return sum + (Number.isFinite(parsed) ? parsed : 0);
    }, 0);

    const maxAllowed = Math.max(0, Math.round((editExpenseParsedAmount - otherMembersTotal) * 100) / 100);
    const finalValue = Math.min(parsedValue, maxAllowed);

    setEditCustomSplitByMember((current) => ({
      ...current,
      [memberId]: formatAmountInputValue(finalValue),
    }));
  };

  const openExpenseDetail = (expenseId: string) => {
    const expense = expenses.find((item) => item.id === expenseId);
    if (!expense) {
      return;
    }

    const expenseSplits = splits.filter((split) => split.expenseId === expense.id);
    const selectedMemberIds = expenseSplits.length > 0
      ? expenseSplits.map((split) => split.memberId)
      : members.map((member) => member.id);

    setSelectedExpenseId(expense.id);
    setEditExpenseForm({
      description: expense.description,
      amount: String(expense.amount),
      paidByMemberId: expense.paidByMemberId,
    });
    setEditExpenseSplitMode(expense.splitMode === "custom" ? "custom" : "equal");
    setEditSelectedMemberIds(selectedMemberIds);
    setEditCustomSplitByMember(
      members.reduce<Record<string, string>>((acc, member) => {
        const split = expenseSplits.find((item) => item.memberId === member.id);
        acc[member.id] = split ? String(split.shareAmount) : "";
        return acc;
      }, {}),
    );
    setIsExpenseEditMode(false);
    setIsDetailIconPickerOpen(false);
    setIsExpenseDetailOpen(true);
  };

  const toggleEditSplitMember = (memberId: string, checked: boolean) => {
    setEditSelectedMemberIds((current) => {
      if (checked) {
        return Array.from(new Set([...current, memberId]));
      }

      return current.filter((id) => id !== memberId);
    });
  };

  const openAddExpenseModal = () => {
    const defaultPayerId = currentMember?.id ?? members[0]?.id ?? "";
    setExpenseForm((current) => ({
      ...current,
      paidByMemberId: current.paidByMemberId || defaultPayerId,
      expenseDate: getTodayDateInputValue(),
    }));
    setExpenseSplitMode("equal");
    setSelectedSplitMemberIds(members.map((member) => member.id));
    setCustomSplitByMember(
      members.reduce<Record<string, string>>((acc, member) => {
        acc[member.id] = "";
        return acc;
      }, {}),
    );
    setIsAddExpenseModalOpen(true);
  };

  const toggleSplitMember = (memberId: string, checked: boolean) => {
    setSelectedSplitMemberIds((current) => {
      if (checked) {
        return Array.from(new Set([...current, memberId]));
      }

      return current.filter((id) => id !== memberId);
    });
  };

  const createShareInviteLink = async () => {
    if (!groupId) {
      return null;
    }

    setIsGeneratingShareLink(true);

    try {
      const createdInvitation = await sendGroupInvitation({
        groupId,
        deliveryChannel: "whatsapp",
        targetContact: `share-link-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      });

      const inviteUrl = `${window.location.origin}/groups/invite/${createdInvitation.id}`;
      setShareInviteUrl(inviteUrl);
      return inviteUrl;
    } catch (error) {
      toast({
        title: "No se pudo generar el enlace",
        description: error instanceof Error ? error.message : "Inténtalo de nuevo.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsGeneratingShareLink(false);
    }
  };

  const getOrCreateShareInviteLink = async () => {
    if (shareInviteUrl) {
      return shareInviteUrl;
    }

    return createShareInviteLink();
  };

  const openShareGroupModal = async () => {
    setIsShareModalOpen(true);
    await getOrCreateShareInviteLink();
  };

  const handleCopyShareLink = async () => {
    const link = await getOrCreateShareInviteLink();

    if (!link) {
      return;
    }

    try {
      await navigator.clipboard.writeText(link);
      toast({ title: "Enlace copiado", description: "Puedes compartirlo donde quieras." });
    } catch {
      toast({ title: "No se pudo copiar", description: "Prueba a copiar el enlace manualmente.", variant: "destructive" });
    }
  };

  const handleShareWhatsApp = async () => {
    const link = await getOrCreateShareInviteLink();

    if (!link) {
      return;
    }

    const shareText = encodeURIComponent(`Te invito al grupo "${groupName}" en PagaYa: ${link}`);
    window.open(`https://wa.me/?text=${shareText}`, "_blank", "noopener,noreferrer");
  };

  const handleShareNative = async () => {
    const link = await getOrCreateShareInviteLink();

    if (!link) {
      return;
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Invitación a "${groupName}" en PagaYa`,
          text: `Únete a mi grupo en PagaYa`,
          url: link,
        });
        return;
      } catch {
        // Cancelled by user or share not completed.
      }
    }

    await handleCopyShareLink();
  };

  const openEditGroupModal = () => {
    if (!group) {
      return;
    }

    setGroupEditForm({
      icon: group.icon || "👥",
      name: group.name,
      description: group.description || "",
    });
    setIsEditGroupModalOpen(true);
  };

  const handleUploadGroupIcon = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) {
      return;
    }

    if (!groupId || !user?.id) {
      toast({
        title: "No se pudo subir la imagen",
        description: "Necesitas estar identificado y dentro de un grupo.",
        variant: "destructive",
      });
      event.target.value = "";
      return;
    }

    if (!selectedFile.type.startsWith("image/")) {
      toast({
        title: "Archivo no válido",
        description: "Selecciona una imagen (PNG, JPG, WEBP...).",
        variant: "destructive",
      });
      event.target.value = "";
      return;
    }

    const maxFileSizeBytes = 3 * 1024 * 1024;
    if (selectedFile.size > maxFileSizeBytes) {
      toast({
        title: "Imagen demasiado grande",
        description: "La imagen debe pesar menos de 3 MB.",
        variant: "destructive",
      });
      event.target.value = "";
      return;
    }

    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      toast({
        title: "No se pudo subir la imagen",
        description: "No se pudo inicializar la conexión con la base de datos.",
        variant: "destructive",
      });
      event.target.value = "";
      return;
    }

    setIsUploadingGroupIcon(true);

    try {
      const fileExtension = selectedFile.name.split(".").pop()?.toLowerCase() || "png";
      const filePath = `${user.id}/group-icons/${groupId}-${Date.now()}.${fileExtension}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, selectedFile, { upsert: true, cacheControl: "3600" });

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);

      if (!data?.publicUrl) {
        throw new Error("No se pudo obtener la URL pública de la imagen.");
      }

      setGroupEditForm((current) => ({
        ...current,
        icon: data.publicUrl,
      }));

      toast({
        title: "Imagen cargada",
        description: "Ahora guarda cambios para aplicar este icono al grupo.",
      });
    } catch (error) {
      toast({
        title: "No se pudo subir la imagen",
        description: error instanceof Error ? error.message : "Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingGroupIcon(false);
      event.target.value = "";
    }
  };

  const handleUpdateGroupInfo = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!groupId || !group) {
      return;
    }

    const normalizedName = groupEditForm.name.trim();
    const normalizedDescription = groupEditForm.description.trim();
    const normalizedIcon = groupEditForm.icon || "👥";
    const previousIcon = group.icon || "👥";
    const iconChanged = normalizedIcon !== previousIcon;

    if (!normalizedName) {
      toast({
        title: "Nombre obligatorio",
        description: "Introduce un nombre para el grupo.",
        variant: "destructive",
      });
      return;
    }

    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      toast({
        title: "No se pudo guardar",
        description: "No se pudo inicializar la conexión con la base de datos.",
        variant: "destructive",
      });
      return;
    }

    setIsUpdatingGroupInfo(true);

    try {
      let degradedWithoutIcon = false;

      const updatePayload = {
        icon: normalizedIcon,
        name: normalizedName,
        description: normalizedDescription || null,
        updated_at: new Date().toISOString(),
      };

      let { error } = await supabase
        .from("groups")
        .update(updatePayload)
        .eq("id", groupId)
        .select("id")
        .single();

      // Compatibility fallback for environments without groups.icon migration.
      if (
        error &&
        error.message.toLowerCase().includes("icon") &&
        (error.message.toLowerCase().includes("column") || error.message.toLowerCase().includes("schema cache"))
      ) {
        const fallback = await supabase
          .from("groups")
          .update({
            name: normalizedName,
            description: normalizedDescription || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", groupId)
          .select("id")
          .single();

        error = fallback.error;

        if (!error) {
          degradedWithoutIcon = true;
        }
      }

      if (error) {
        throw error;
      }

      if (iconChanged) {
        if (degradedWithoutIcon) {
          throw new Error(
            "No se pudo guardar el icono. Vuelve a intentarlo."
          );
        }

        const { data: persistedGroup, error: verifyError } = await supabase
          .from("groups")
          .select("icon")
          .eq("id", groupId)
          .single();

        if (verifyError) {
          throw verifyError;
        }

        if ((persistedGroup?.icon ?? "👥") !== normalizedIcon) {
          throw new Error("El icono no se guardó correctamente en la base de datos.");
        }
      }

      await refreshData({ silent: true });
      setIsEditGroupModalOpen(false);

      toast({
        title: "Grupo actualizado",
        description: "Los cambios se guardaron correctamente.",
      });
    } catch (error) {
      toast({
        title: "No se pudo actualizar",
        description: error instanceof Error ? error.message : "Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingGroupInfo(false);
    }
  };

  const handleAddExpense = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!groupId) {
      return;
    }

    const parsedAmount = parseAmountInput(expenseForm.amount);

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast({
        title: "Cantidad no válida",
        description: "Introduce un importe mayor que cero.",
        variant: "destructive",
      });
      return;
    }

    if (!expenseForm.paidByMemberId) {
      toast({
        title: "Selecciona un pagador",
        description: "Indica quién adelantó el dinero.",
        variant: "destructive",
      });
      return;
    }

    if (!expenseForm.expenseDate) {
      toast({
        title: "Selecciona una fecha",
        description: "Indica cuándo se realizó el pago.",
        variant: "destructive",
      });
      return;
    }

    if (selectedSplitMemberIds.length === 0) {
      toast({
        title: "Sin participantes",
        description: "Selecciona al menos un miembro para repartir el gasto.",
        variant: "destructive",
      });
      return;
    }

    let customShares: Array<{ memberId: string; amount: number }> | undefined;

    if (expenseSplitMode === "custom") {
      customShares = selectedSplitMemberIds.map((memberId) => ({
        memberId,
        amount: parseAmountInput(customSplitByMember[memberId] ?? ""),
      }));

      if (customShares.some((share) => !Number.isFinite(share.amount) || share.amount < 0)) {
        toast({
          title: "Importes no válidos",
          description: "Revisa que todas las cuotas personalizadas sean numéricas y no negativas.",
          variant: "destructive",
        });
        return;
      }

      const roundedTotal = Math.round(customShares.reduce((sum, share) => sum + share.amount, 0) * 100) / 100;
      const roundedAmount = Math.round(parsedAmount * 100) / 100;

      if (Math.abs(roundedTotal - roundedAmount) > 0.01) {
        toast({
          title: "Suma inconsistente",
          description: "La suma de las partes personalizadas debe coincidir con el total del gasto.",
          variant: "destructive",
        });
        return;
      }
    }

    setIsSavingExpense(true);

    try {
      await addGroupExpense({
        groupId,
        description: expenseForm.description,
        amount: parsedAmount,
        paidByMemberId: expenseForm.paidByMemberId,
        expenseDate: expenseForm.expenseDate,
        splitMode: expenseSplitMode,
        participantMemberIds: selectedSplitMemberIds,
        customShares,
      });

      toast({
        title: "Gasto registrado",
        description: "El gasto ya aparece en el historial del grupo.",
      });

      setExpenseForm({
        description: "",
        amount: "",
        paidByMemberId: expenseForm.paidByMemberId,
        expenseDate: getTodayDateInputValue(),
      });
      setIsAddExpenseModalOpen(false);
    } catch (error) {
      toast({
        title: "No se pudo guardar",
        description: error instanceof Error ? error.message : "Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsSavingExpense(false);
    }
  };

  const handleSettleShare = async (splitId: string) => {
    setActiveSplitId(splitId);

    try {
      await settleGroupExpenseShare({ splitId });
      toast({
        title: "Cuota pagada",
        description: "La parte pendiente se marcó como pagada.",
      });
    } catch (error) {
      toast({
        title: "No se pudo marcar",
        description: error instanceof Error ? error.message : "Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setActiveSplitId(null);
    }
  };

  const handleChangeRole = async (memberId: string, role: "admin" | "member") => {
    setActiveMemberRoleId(memberId);

    try {
      await updateGroupMemberRole({ memberId, role });
      toast({
        title: "Rol actualizado",
        description: "Los permisos del miembro se han cambiado.",
      });
    } catch (error) {
      toast({
        title: "No se pudo actualizar",
        description: error instanceof Error ? error.message : "Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setActiveMemberRoleId(null);
    }
  };

  const handleUpdateExpenseIcon = async (expenseId: string, newIcon: string) => {
    try {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        throw new Error("Supabase client no disponible");
      }

      const { error } = await supabase
        .from("group_expenses")
        .update({ icon: newIcon })
        .eq("id", expenseId);

      if (error) throw error;

      // Esperar a que se refresquen los datos antes de cerrar el selector
      await refreshData();
      setIsDetailIconPickerOpen(false);
      
      toast({
        title: "Icono actualizado",
        description: "El icono del gasto se ha cambiado.",
      });
    } catch (error) {
      toast({
        title: "No se pudo actualizar",
        description: error instanceof Error ? error.message : "Inténtalo de nuevo.",
        variant: "destructive",
      });
      setIsDetailIconPickerOpen(false);
    }
  };

  const handleUpdateExpenseDetails = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedExpense) {
      return;
    }

    const parsedAmount = parseAmountInput(editExpenseForm.amount);

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast({
        title: "Cantidad no válida",
        description: "Introduce un importe mayor que cero.",
        variant: "destructive",
      });
      return;
    }

    if (!editExpenseForm.paidByMemberId) {
      toast({
        title: "Selecciona un pagador",
        description: "Indica quién adelantó el dinero.",
        variant: "destructive",
      });
      return;
    }

    if (editSelectedMemberIds.length === 0) {
      toast({
        title: "Sin participantes",
        description: "Selecciona al menos un miembro para repartir el gasto.",
        variant: "destructive",
      });
      return;
    }

    let customShares: Array<{ memberId: string; amount: number }> | undefined;

    if (editExpenseSplitMode === "custom") {
      customShares = editSelectedMemberIds.map((memberId) => ({
        memberId,
        amount: parseAmountInput(editCustomSplitByMember[memberId] ?? ""),
      }));

      if (customShares.some((share) => !Number.isFinite(share.amount) || share.amount < 0)) {
        toast({
          title: "Importes no válidos",
          description: "Revisa que todas las cuotas personalizadas sean numéricas y no negativas.",
          variant: "destructive",
        });
        return;
      }

      const roundedTotal = Math.round(customShares.reduce((sum, share) => sum + share.amount, 0) * 100) / 100;
      const roundedAmount = Math.round(parsedAmount * 100) / 100;

      if (Math.abs(roundedTotal - roundedAmount) > 0.01) {
        toast({
          title: "Suma inconsistente",
          description: "La suma de las partes personalizadas debe coincidir con el total del gasto.",
          variant: "destructive",
        });
        return;
      }
    }

    setIsUpdatingExpense(true);

    try {
      await updateGroupExpense({
        expenseId: selectedExpense.id,
        description: editExpenseForm.description,
        amount: parsedAmount,
        paidByMemberId: editExpenseForm.paidByMemberId,
        splitMode: editExpenseSplitMode,
        participantMemberIds: editSelectedMemberIds,
        customShares,
      });

      toast({
        title: "Gasto actualizado",
        description: "Los datos del gasto se han guardado correctamente.",
      });
      setIsExpenseEditMode(false);
    } catch (error) {
      toast({
        title: "No se pudo actualizar",
        description: error instanceof Error ? error.message : "Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingExpense(false);
    }
  };

  const handleDeleteExpense = async () => {
    if (!selectedExpense) {
      return;
    }

    setIsDeleteExpenseConfirmOpen(true);
  };

  const handleConfirmDeleteExpense = async () => {
    if (!selectedExpense) {
      return;
    }

    setIsDeletingExpense(true);

    try {
      await deleteGroupExpense(selectedExpense.id);
      toast({
        title: "Gasto eliminado",
        description: "El gasto y sus repartos se han borrado del grupo.",
      });
      setIsExpenseEditMode(false);
      setIsDeleteExpenseConfirmOpen(false);
      setIsExpenseDetailOpen(false);
      setSelectedExpenseId(null);
      setIsDetailIconPickerOpen(false);
    } catch (error) {
      toast({
        title: "No se pudo eliminar",
        description: error instanceof Error ? error.message : "Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsDeletingExpense(false);
    }
  };

  if (!isReady) {
    return <AppLoadingScreen title="Cargando grupo" subtitle="Preparando miembros, gastos e invitaciones..." />;
  }

  if (!group) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background pb-24 md:pb-20 md:pt-20">
          <Navbar />
          <main className="container mx-auto max-w-3xl px-4 py-8">
            <Card>
              <CardContent className="space-y-4 p-8 text-center">
                <Users className="mx-auto h-12 w-12 text-muted-foreground/30" />
                <h1 className="text-2xl font-bold">No se encontró el grupo</h1>
                <p className="text-sm text-muted-foreground">Puede que no exista o que no tengas acceso directo.</p>
                <Button asChild>
                  <Link href="/groups">Volver a grupos</Link>
                </Button>
              </CardContent>
            </Card>
          </main>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background pb-28 md:pb-20 md:pt-20">
        <Navbar />

        <main className="container mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-8">

          {/* Encabezado del grupo */}
          <section className="mb-5 sm:mb-8">
            <Card className="relative overflow-hidden border border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background shadow-lg shadow-primary/10">
              <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-primary/15 blur-2xl" />
              <CardHeader className="relative p-4 sm:p-6">
                <div className="flex flex-col gap-4 sm:gap-5">
                  <div className="flex items-start gap-4 sm:gap-5 md:justify-between">
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-3xl border border-primary/35 bg-gradient-to-br from-primary/30 to-primary/10 shadow-lg shadow-primary/15 sm:h-24 sm:w-24">
                      {isGroupImageIcon(group.icon) ? (
                        <img src={group.icon} alt={`Icono de ${group.name}`} className="h-full w-full scale-[1.08] object-cover" />
                      ) : (
                        <span className="text-5xl sm:text-6xl">{group.icon || "👥"}</span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="break-words text-2xl font-bold tracking-tight sm:text-3xl">{group.name}</CardTitle>
                        {currentMember ? (
                          <Badge variant="outline" className="rounded-full border-primary/30 bg-primary/15 text-primary">
                            {currentMember.role}
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
                        {group.description || "No hay descripción."}
                      </p>
                    </div>

                    <div className="hidden shrink-0 items-center gap-2 md:flex md:self-center">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={openEditGroupModal}
                        className="h-10 rounded-xl border-primary/40 bg-background/80"
                        disabled={!canManageMembers}
                      >
                        <PencilLine className="h-4 w-4" />
                        Editar grupo
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={openShareGroupModal}
                        className="h-10 rounded-xl border-primary/40 bg-background/80"
                        disabled={!currentMember || !canManageMembers}
                      >
                        <Share2 className="h-4 w-4" />
                        Compartir grupo
                      </Button>
                      <Button
                        type="button"
                        onClick={openAddExpenseModal}
                        className="h-10 rounded-xl"
                        disabled={members.length === 0}
                      >
                        <Plus className="h-4 w-4" />
                        Añadir gasto
                      </Button>
                    </div>
                  </div>

                  <div className="flex md:hidden">
                    <div className="flex w-full gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={openEditGroupModal}
                        className="h-10 flex-1 rounded-xl border-primary/40 bg-background/80"
                        disabled={!canManageMembers}
                      >
                        <PencilLine className="h-4 w-4" />
                        Editar grupo
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={openShareGroupModal}
                        className="h-10 flex-1 rounded-xl border-primary/40 bg-background/80"
                        disabled={!currentMember || !canManageMembers}
                      >
                        <Share2 className="h-4 w-4" />
                        Compartir grupo
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </section>

          {/* Estadísticas personalizadas */}
          <section className="mb-6 grid grid-cols-3 gap-2 sm:mb-8 sm:gap-4">
            <Card className="rounded-xl">
              <CardContent className="space-y-1 p-3 sm:space-y-2 sm:p-5">
                <p className="text-xs text-muted-foreground sm:text-sm">Mis gastos</p>
                <p className="text-lg font-bold leading-tight sm:text-3xl">{formatCurrency(myExpenses)}</p>
                <p className="hidden text-xs text-muted-foreground sm:block">Total que has pagado</p>
              </CardContent>
            </Card>
            <Card className="rounded-xl">
              <CardContent className="space-y-1 p-3 sm:space-y-2 sm:p-5">
                <p className="text-xs text-muted-foreground sm:text-sm">Gastos del grupo</p>
                <p className="text-lg font-bold leading-tight sm:text-3xl">{formatCurrency(totalExpenses)}</p>
                <p className="text-[11px] text-muted-foreground sm:text-xs">{expenses.length} gastos</p>
              </CardContent>
            </Card>
            <Card className="rounded-xl">
              <CardContent className="space-y-1 p-3 sm:space-y-2 sm:p-5">
                <p className="text-xs text-muted-foreground sm:text-sm">Miembros</p>
                <p className="text-lg font-bold leading-tight sm:text-3xl">{members.length}</p>
                <p className="hidden text-xs text-muted-foreground sm:block">en este grupo</p>
              </CardContent>
            </Card>
          </section>

          <Dialog
            open={isShareModalOpen}
            onOpenChange={async (open) => {
              setIsShareModalOpen(open);

              if (open && !shareInviteUrl) {
                await createShareInviteLink();
              }
            }}
          >
            <DialogContent className="w-[96vw] max-w-4xl rounded-2xl p-4 sm:p-6 lg:max-w-5xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Share2 className="h-5 w-5 text-primary" />
                  Compartir grupo
                </DialogTitle>
                <DialogDescription>
                  Comparte el grupo con QR o por enlace para que se unan en un toque.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] lg:gap-6">
                <div className="flex min-h-[280px] items-center justify-center rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-4 sm:min-h-[340px]">
                  {isGeneratingShareLink && !shareInviteUrl ? (
                    <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
                      <LoaderCircle className="h-6 w-6 animate-spin" />
                      Generando QR...
                    </div>
                  ) : shareInviteUrl ? (
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(shareInviteUrl)}`}
                      alt={`QR para unirse a ${groupName}`}
                      className="h-60 w-60 rounded-xl bg-white p-2 shadow-sm sm:h-72 sm:w-72"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
                      <QrCode className="h-6 w-6" />
                      No se ha podido generar el QR.
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {shareInviteUrl ? (
                    <div className="space-y-2 rounded-2xl border border-border/70 bg-card/40 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Enlace de invitación</p>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <p className="flex-1 break-all rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground">{shareInviteUrl}</p>
                        <Button type="button" variant="outline" onClick={handleCopyShareLink} disabled={isGeneratingShareLink} className="shrink-0">
                          <Copy className="h-4 w-4" />
                          Copiar
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleShareWhatsApp}
                      disabled={isGeneratingShareLink}
                      className="h-11 w-full justify-center whitespace-nowrap rounded-xl px-4 text-sm font-medium"
                    >
                      <MessageCircleMore className="h-4 w-4" />
                      Enviar por WhatsApp
                    </Button>
                    <Button
                      type="button"
                      onClick={handleShareNative}
                      disabled={isGeneratingShareLink}
                      className="h-11 w-full justify-center whitespace-nowrap rounded-xl px-4 text-sm font-medium"
                    >
                      <Share2 className="h-4 w-4" />
                      Enviar de otra forma
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isEditGroupModalOpen} onOpenChange={setIsEditGroupModalOpen}>
            <DialogContent className="max-h-[88vh] w-[95vw] max-w-lg overflow-y-auto rounded-2xl border border-primary/20 bg-gradient-to-b from-background via-background to-card/30 p-4 sm:p-6">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <PencilLine className="h-5 w-5 text-primary" />
                  Editar grupo
                </DialogTitle>
                <DialogDescription>
                  Personaliza icono, nombre y descripción del grupo.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleUpdateGroupInfo} className="space-y-5">
                <div className="space-y-2 rounded-2xl border border-border/70 bg-card/40 p-4">
                  <Label>Icono del grupo</Label>
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
                    <div className="mb-3 flex items-center gap-3">
                      <div className="flex h-28 w-28 shrink-0 aspect-square items-center justify-center overflow-hidden rounded-2xl border border-primary/35 bg-background/80 text-4xl shadow-sm shadow-primary/10 sm:h-32 sm:w-32">
                        {isGroupImageIcon(groupEditForm.icon) ? (
                          <img src={groupEditForm.icon} alt="Vista previa del icono del grupo" className="h-full w-full scale-[1.08] object-cover" />
                        ) : (
                          <span>{groupEditForm.icon || "👥"}</span>
                        )}
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Selecciona un icono visual o sube una foto para identificar rápido el grupo.</p>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => groupIconFileInputRef.current?.click()}
                            disabled={isUploadingGroupIcon}
                            className="h-8 rounded-lg"
                          >
                            {isUploadingGroupIcon ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                            {isUploadingGroupIcon ? "Subiendo..." : "Subir foto"}
                          </Button>
                          {isGroupImageIcon(groupEditForm.icon) ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setGroupEditForm((current) => ({ ...current, icon: "👥" }))}
                              className="h-8 rounded-lg border-primary/35 bg-background/70 text-foreground hover:border-primary/55 hover:bg-primary/10"
                            >
                              Quitar foto
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <input
                      ref={groupIconFileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleUploadGroupIcon}
                    />
                    <div className="grid max-h-64 grid-cols-6 gap-2 overflow-y-auto pr-1 sm:grid-cols-8">
                      {EMOJI_OPTIONS.map((emoji, index) => {
                        const isSelected = groupEditForm.icon === emoji;

                        return (
                          <button
                            key={`group-icon-${emoji}-${index}`}
                            type="button"
                            onClick={() => setGroupEditForm((current) => ({ ...current, icon: emoji }))}
                            className={isSelected
                              ? "flex h-10 w-10 items-center justify-center rounded-xl border border-primary/70 bg-primary/20 text-2xl shadow-[0_0_0_1px_rgba(14,165,233,0.45)]"
                              : "flex h-10 w-10 items-center justify-center rounded-xl border border-border/40 bg-background/55 text-2xl transition-colors hover:border-primary/45 hover:bg-primary/10"}
                            title={`Usar icono ${emoji}`}
                          >
                            {emoji}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 rounded-2xl border border-border/70 bg-card/40 p-4">
                  <Label htmlFor="group-name">Nombre</Label>
                  <Input
                    id="group-name"
                    value={groupEditForm.name}
                    onChange={(event) => setGroupEditForm((current) => ({ ...current, name: event.target.value }))}
                    className="h-11 rounded-xl"
                    placeholder="Nombre del grupo"
                  />
                </div>

                <div className="space-y-2 rounded-2xl border border-border/70 bg-card/40 p-4">
                  <Label htmlFor="group-description">Descripción</Label>
                  <Textarea
                    id="group-description"
                    value={groupEditForm.description}
                    onChange={(event) => setGroupEditForm((current) => ({ ...current, description: event.target.value }))}
                    className="min-h-[92px] rounded-xl"
                    placeholder="¿Para qué es este grupo?"
                  />
                </div>

                <DialogFooter className="gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsEditGroupModalOpen(false)} disabled={isUpdatingGroupInfo}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isUpdatingGroupInfo}>
                    {isUpdatingGroupInfo ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <PencilLine className="h-4 w-4" />}
                    {isUpdatingGroupInfo ? "Guardando..." : "Guardar cambios"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog
            open={isExpenseDetailOpen}
            onOpenChange={(open) => {
              setIsExpenseDetailOpen(open);
              if (!open) {
                setSelectedExpenseId(null);
                setIsDetailIconPickerOpen(false);
                setIsExpenseEditMode(false);
                setIsDeleteExpenseConfirmOpen(false);
              }
            }}
          >
            <DialogContent className="max-h-[88vh] w-[95vw] max-w-2xl overflow-y-auto rounded-2xl border border-primary/20 bg-gradient-to-b from-background via-background to-card/30 p-4 sm:p-6 [&>button]:hidden">
              {selectedExpense ? (
                <>
                  <DialogHeader className="relative space-y-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5">
                    <DialogTitle className="flex items-center justify-between gap-3">
                      <div className="relative flex min-w-0 items-center gap-3">
                        <button
                          ref={detailIconTriggerRef}
                          type="button"
                          onClick={() => {
                            if (!canEditSelectedExpense) {
                              return;
                            }
                            setIsDetailIconPickerOpen((current) => !current);
                          }}
                          className={canEditSelectedExpense ? "flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border border-primary/30 bg-background/70 text-2xl transition-transform hover:scale-105" : "flex h-11 w-11 items-center justify-center rounded-xl border border-border/60 bg-background/60 text-2xl"}
                          title={canEditSelectedExpense ? "Click para cambiar icono" : "Icono del gasto"}
                        >
                          {selectedExpense.icon || "💰"}
                        </button>

                        {canEditSelectedExpense && isDetailIconPickerOpen ? (
                          <div
                            ref={detailIconPickerRef}
                            className="absolute left-0 top-full z-50 mt-2 w-[min(90vw,22rem)] rounded-lg border border-border bg-background p-3 shadow-lg"
                          >
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <p className="text-xs font-semibold text-muted-foreground">Elige un icono:</p>
                              <button
                                type="button"
                                onClick={() => setIsDetailIconPickerOpen(false)}
                                className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                                title="Cerrar selector"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                            <div className="grid grid-cols-8 gap-1">
                              {EMOJI_OPTIONS.map((emoji, index) => (
                                <button
                                  key={`detail-icon-${emoji}-${index}`}
                                  type="button"
                                  onClick={() => {
                                    setIsDetailIconPickerOpen(false);
                                    void handleUpdateExpenseIcon(selectedExpense.id, emoji);
                                  }}
                                  className="rounded p-1 text-2xl transition-all hover:scale-110 hover:bg-muted/50"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : null}
                        <span className="truncate">{selectedExpense.description}</span>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-sm font-bold text-emerald-700 dark:text-emerald-300">
                          {formatCurrency(selectedExpense.amount)}
                        </span>
                        <DialogClose asChild>
                          <button
                            type="button"
                            className="flex h-8 w-8 items-center justify-center rounded-full border border-primary/25 bg-background/85 text-muted-foreground transition-colors hover:bg-primary/15 hover:text-primary"
                            aria-label="Cerrar detalle del gasto"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </DialogClose>
                      </div>
                    </DialogTitle>
                    <DialogDescription className="text-xs sm:text-sm">
                      Reparto {selectedExpense.splitMode === "custom" ? "personalizado" : "igual"}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 rounded-2xl border border-border/60 bg-card/45 p-4 sm:p-5">
                    <p className="flex items-center gap-2 text-sm font-semibold">
                      <CalendarDays className="h-4 w-4 text-primary" />
                      Información del gasto
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-border/50 bg-background/50 p-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Pagado por</p>
                        <p className="mt-1 text-sm font-semibold">{getMemberLabel(members.find((m) => m.id === selectedExpense.paidByMemberId) || { displayName: "Desconocido" })}</p>
                      </div>
                      <div className="rounded-xl border border-border/50 bg-background/50 p-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Fecha y hora</p>
                        <p className="mt-1 text-sm font-semibold">{new Date(selectedExpense.createdAt).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })}, {new Date(selectedExpense.createdAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 rounded-2xl border border-border/60 bg-card/45 p-4 sm:p-5">
                    <p className="flex items-center gap-2 text-sm font-semibold">
                      <Users className="h-4 w-4 text-primary" />
                      Reparto entre miembros
                    </p>
                    {selectedExpenseSplits.length > 0 ? (
                      <div className="space-y-2">
                        {selectedExpenseSplits.map((split) => {
                          const member = members.find((item) => item.id === split.memberId);

                          return (
                            <div key={split.id} className="flex items-center justify-between rounded-xl border border-border/40 bg-background/45 px-3 py-2.5">
                              <div>
                                <p className="text-sm font-medium">{getMemberLabel(member || { displayName: "Desconocido" })}</p>
                                <p className={split.isSettled ? "text-xs font-medium text-emerald-600 dark:text-emerald-300" : "text-xs font-medium text-amber-600 dark:text-amber-300"}>
                                  {split.isSettled ? "Pagado" : "Pendiente"}
                                </p>
                              </div>
                              <p className="text-sm font-semibold">{formatCurrency(split.shareAmount)}</p>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No hay cuotas registradas para este gasto.</p>
                    )}
                  </div>

                  {canEditSelectedExpense ? (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant={isExpenseEditMode ? "secondary" : "outline"}
                        onClick={() => setIsExpenseEditMode((current) => !current)}
                      >
                        <PencilLine className="h-4 w-4" />
                        {isExpenseEditMode ? "Cerrar edición" : "Editar info"}
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={handleDeleteExpense}
                        disabled={isDeletingExpense}
                      >
                        {isDeletingExpense ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        {isDeletingExpense ? "Eliminando..." : "Eliminar gasto"}
                      </Button>
                    </div>
                  ) : null}

                  {canEditSelectedExpense && isExpenseEditMode ? (
                    <form onSubmit={handleUpdateExpenseDetails} className="space-y-5 rounded-2xl border border-primary/20 bg-card/40 p-4 sm:p-5">
                      <p className="text-sm font-semibold">Editar gasto</p>

                      <div className="space-y-2">
                        <Label htmlFor="edit-description">Descripción</Label>
                        <Input
                          id="edit-description"
                          value={editExpenseForm.description}
                          onChange={(event) => setEditExpenseForm((current) => ({ ...current, description: event.target.value }))}
                          className="h-11 rounded-xl"
                        />
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="edit-amount">Importe total</Label>
                          <Input
                            id="edit-amount"
                            value={editExpenseForm.amount}
                            onChange={(event) => setEditExpenseForm((current) => ({ ...current, amount: event.target.value }))}
                            className="h-11 rounded-xl"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-payer">Quién pagó</Label>
                          <Select
                            value={editExpenseForm.paidByMemberId}
                            onValueChange={(value) => setEditExpenseForm((current) => ({ ...current, paidByMemberId: value }))}
                          >
                            <SelectTrigger id="edit-payer" className="h-11 rounded-xl">
                              <SelectValue placeholder="Selecciona un miembro" />
                            </SelectTrigger>
                            <SelectContent>
                              {members.map((member) => (
                                <SelectItem key={member.id} value={member.id}>
                                  {getMemberLabel(member)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <RadioGroup
                        value={editExpenseSplitMode}
                        onValueChange={(value) => setEditExpenseSplitMode(value as "equal" | "custom")}
                        className="gap-3"
                      >
                        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border/50 p-3">
                          <RadioGroupItem value="equal" id="edit-split-equal" />
                          <span className="text-sm">Partes iguales</span>
                        </label>
                        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border/50 p-3">
                          <RadioGroupItem value="custom" id="edit-split-custom" />
                          <span className="text-sm">Partes personalizadas</span>
                        </label>
                      </RadioGroup>

                      <div className="space-y-2">
                        {members.map((member) => {
                          const isSelected = editSelectedMemberIds.includes(member.id);

                          return (
                            <div key={member.id} className="flex items-center gap-3 rounded-lg border border-border/40 p-3">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={(checked) => toggleEditSplitMember(member.id, checked === true)}
                                id={`edit-member-${member.id}`}
                              />
                              <Label htmlFor={`edit-member-${member.id}`} className="flex-1 cursor-pointer text-sm font-medium">
                                {getMemberLabel(member)}
                              </Label>

                              {editExpenseSplitMode === "custom" ? (
                                <div className="w-32">
                                  <div className="relative">
                                    <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                                      €
                                    </span>
                                    <Input
                                      value={editCustomSplitByMember[member.id] ?? ""}
                                      onChange={(event) => handleEditCustomSplitAmountChange(member.id, event.target.value)}
                                      onBlur={() => handleEditCustomSplitAmountBlur(member.id)}
                                      placeholder="0,00"
                                      className="h-9 rounded-lg pl-6"
                                      disabled={!isSelected}
                                    />
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>

                      {editExpenseSplitMode === "custom" ? (
                        <p className="text-xs text-muted-foreground">Importe restante por dividir: {formatCurrency(editCustomSplitRemainingAmount)}</p>
                      ) : null}

                      <DialogFooter>
                        <Button type="submit" disabled={isUpdatingExpense} className="h-10 rounded-xl">
                          {isUpdatingExpense ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CircleDollarSign className="h-4 w-4" />}
                          {isUpdatingExpense ? "Guardando..." : "Guardar cambios"}
                        </Button>
                      </DialogFooter>
                    </form>
                  ) : null}
                </>
              ) : null}
            </DialogContent>
          </Dialog>

          <Dialog open={isDeleteExpenseConfirmOpen} onOpenChange={setIsDeleteExpenseConfirmOpen}>
            <DialogContent className="max-w-md rounded-2xl border border-destructive/35 bg-background p-5 sm:p-6">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-destructive">
                  <Trash2 className="h-5 w-5" />
                  Eliminar gasto
                </DialogTitle>
                <DialogDescription>
                  ¿Seguro que quieres eliminar este gasto? Esta acción no se puede deshacer.
                </DialogDescription>
              </DialogHeader>

              {selectedExpense ? (
                <div className="rounded-xl border border-border/60 bg-card/40 px-3 py-2 text-sm">
                  <p className="font-semibold">{selectedExpense.description}</p>
                  <p className="text-muted-foreground">{formatCurrency(selectedExpense.amount)}</p>
                </div>
              ) : null}

              <DialogFooter className="gap-2 sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDeleteExpenseConfirmOpen(false)}
                  disabled={isDeletingExpense}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleConfirmDeleteExpense}
                  disabled={isDeletingExpense}
                >
                  {isDeletingExpense ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  {isDeletingExpense ? "Eliminando..." : "Sí, eliminar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddExpenseModalOpen} onOpenChange={setIsAddExpenseModalOpen}>
            <DialogContent className="max-h-[88vh] w-[96vw] max-w-3xl overflow-y-auto rounded-2xl border border-primary/20 bg-gradient-to-b from-background to-background p-0">
              <DialogHeader className="sticky top-0 z-10 border-b border-border/60 bg-background/95 px-4 pb-4 pt-5 backdrop-blur sm:px-6">
                <DialogTitle className="px-8 text-center text-xl sm:px-0 sm:text-left sm:text-2xl">Añadir gasto al grupo</DialogTitle>
                <DialogDescription className="px-8 text-center text-sm sm:px-0 sm:text-left sm:text-base">
                  Puedes dividirlo a partes iguales entre miembros seleccionados o con importes personalizados
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleAddExpense} className="space-y-5 px-4 pb-4 pt-4 sm:px-6 sm:pb-6">
                <div className="space-y-4 rounded-2xl border border-border/70 bg-card/40 p-4 sm:p-5">
                  <p className="text-sm font-semibold text-foreground/90">Datos del gasto</p>

                  <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="description">Título</Label>
                    <Input
                      id="description"
                      value={expenseForm.description}
                      onChange={(event) => setExpenseForm({ ...expenseForm, description: event.target.value })}
                      placeholder="Ej: Cena, hotel, gasolina..."
                      className="h-12 rounded-xl border-border/70 bg-background/80 text-base"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount">Cantidad (€)</Label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base font-medium text-muted-foreground">
                        €
                      </span>
                      <Input
                        id="amount"
                        type="text"
                        value={expenseForm.amount}
                        onChange={(event) => {
                          const normalizedValue = normalizeAmountInput(event.target.value);
                          setExpenseForm({ ...expenseForm, amount: normalizedValue });
                        }}
                        onBlur={handleAmountFieldBlur}
                        placeholder="0,00"
                        className="h-12 rounded-xl border-border/70 bg-background/80 pl-8 text-lg font-bold"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="payer">Pagado por</Label>
                    <Select
                      value={expenseForm.paidByMemberId}
                      onValueChange={(value) => setExpenseForm({ ...expenseForm, paidByMemberId: value })}
                    >
                      <SelectTrigger id="payer" className="h-12 rounded-xl border-border/70 bg-background/80">
                        <SelectValue placeholder="Selecciona un miembro" />
                      </SelectTrigger>
                      <SelectContent>
                        {members.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {getMemberLabel(member)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <div className="flex items-center justify-between gap-2">
                      <Label htmlFor="expense-date">Fecha del pago</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 rounded-full border-primary/35 bg-primary/10 px-2.5 text-xs font-semibold text-primary hover:bg-primary/15 hover:text-primary"
                        onClick={() => setExpenseForm((current) => ({ ...current, expenseDate: getTodayDateInputValue() }))}
                      >
                        Hoy
                      </Button>
                    </div>
                    <div className="relative">
                      <Input
                        id="expense-date"
                        type="date"
                        value={expenseForm.expenseDate}
                        onChange={(event) => setExpenseForm({ ...expenseForm, expenseDate: event.target.value })}
                        className="h-12 rounded-xl border-border/70 bg-background/80 pr-11 text-base font-medium [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-12 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0"
                      />
                      <CalendarDays className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    </div>
                  </div>
                </div>
                </div>

                <div className="space-y-3 rounded-2xl border border-border/70 bg-card/40 p-4 sm:p-5">
                  <p className="text-sm font-semibold">Modo de reparto</p>
                  <RadioGroup
                    value={expenseSplitMode}
                    onValueChange={(value) => setExpenseSplitMode(value as "equal" | "custom")}
                    className="gap-3"
                  >
                    <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-border/60 bg-background/60 p-3 transition-colors hover:border-primary/40">
                      <RadioGroupItem value="equal" id="split-equal" />
                      <span className="text-sm">Partes iguales entre miembros</span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-border/60 bg-background/60 p-3 transition-colors hover:border-primary/40">
                      <RadioGroupItem value="custom" id="split-custom" />
                      <span className="text-sm">Partes personalizadas</span>
                    </label>
                  </RadioGroup>
                </div>

                <div className="space-y-3 rounded-2xl border border-border/70 bg-card/40 p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">Participantes</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedSplitMemberIds(members.map((member) => member.id))}
                      className="h-7 rounded-full border-primary/35 bg-primary/10 px-2.5 text-xs font-semibold text-primary hover:bg-primary/15 hover:text-primary"
                    >
                      Seleccionar todos
                    </Button>
                  </div>

                  <div className="max-h-[34vh] space-y-2 overflow-y-auto pr-1 sm:max-h-[38vh]">
                    {members.map((member) => {
                      const isSelected = selectedSplitMemberIds.includes(member.id);
                      const customValue = customSplitByMember[member.id] ?? "";

                      return (
                        <div key={member.id} className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/60 p-3">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => toggleSplitMember(member.id, checked === true)}
                            id={`member-${member.id}`}
                          />
                          <Label htmlFor={`member-${member.id}`} className="flex-1 cursor-pointer text-sm font-medium">
                            {getMemberLabel(member)}
                          </Label>

                          {expenseSplitMode === "equal" && isSelected && equalSplitAmountPerMember !== null ? (
                            <span className="rounded-md bg-emerald-500/15 px-2 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                              {formatCurrency(equalSplitAmountPerMember)}
                            </span>
                          ) : null}

                          {expenseSplitMode === "custom" ? (
                            <div className="w-24 sm:w-32">
                              <div className="relative">
                                <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-base font-medium text-muted-foreground">
                                  €
                                </span>
                                <Input
                                  value={customValue}
                                  onChange={(event) => handleCustomSplitAmountChange(member.id, event.target.value)}
                                  onBlur={() => handleCustomSplitAmountBlur(member.id)}
                                  placeholder="0,00"
                                  className="h-9 rounded-lg border-border/70 bg-background/80 pl-6"
                                  disabled={!isSelected}
                                />
                              </div>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>

                  {expenseSplitMode === "equal" ? (
                    <p className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                      Se divide entre {selectedSplitMemberIds.length} miembro(s)
                    </p>
                  ) : (
                    <p className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                      Importe restante por dividir: {formatCurrency(customSplitRemainingAmount)}
                    </p>
                  )}
                </div>

                <DialogFooter className="sticky bottom-0 z-20 flex-row gap-2 border-t border-border/60 bg-background/95 px-0 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur">
                  <Button type="button" variant="outline" onClick={() => setIsAddExpenseModalOpen(false)} className="h-11 min-w-0 flex-1 rounded-xl">
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSavingExpense || members.length === 0} className="h-11 min-w-0 flex-1 rounded-xl">
                    {isSavingExpense ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CircleDollarSign className="h-4 w-4" />}
                    {isSavingExpense ? "Guardando..." : "Registrar gasto"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <section>
            <Tabs defaultValue="history" className="space-y-4">
              <TabsList className="grid h-auto w-full grid-cols-2 rounded-xl bg-card/70 p-1">
                <TabsTrigger value="history" className="rounded-lg text-xs sm:text-sm">
                  Historial de gastos
                </TabsTrigger>
                <TabsTrigger value="members" className="rounded-lg text-xs sm:text-sm">
                  Miembros y roles
                </TabsTrigger>
              </TabsList>

              <TabsContent value="history" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <ReceiptText className="h-5 w-5 text-primary" />
                      Historial de gastos
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {sortedExpenses.length > 0 ? (
                      groupedExpenses.map(([dateLabel, expensesForDate]) => (
                        <div key={dateLabel} className="space-y-4">
                          <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground/70">{dateLabel}</h3>
                          <div className="space-y-2">
                            {expensesForDate.map((expense) => {
                              const payer = members.find((item) => item.id === expense.paidByMemberId);
                              const isMyExpense = payer?.userId === user?.id;

                              return (
                                <div key={expense.id} className="relative">
                                  <div
                                    className="flex cursor-pointer flex-col items-start gap-2 rounded-xl border border-border/50 px-4 py-2.5 transition-colors hover:bg-muted/20 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:py-3"
                                    onClick={() => openExpenseDetail(expense.id)}
                                  >
                                    <div className="flex min-w-0 flex-1 items-center gap-3">
                                      <span className="text-2xl flex-shrink-0" title="Icono del gasto">
                                        {expense.icon || "💰"}
                                      </span>
                                      <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold">{expense.description}</p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                          <span>Pagado por </span>
                                          <b>{getMemberLabel(payer || { displayName: "Desconocido" })}</b>
                                          {isMyExpense && " (yo)"}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="self-end -mt-3 rounded-lg bg-emerald-500/15 px-2.5 py-1.5 text-right sm:self-end sm:-mt-2">
                                      <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                                        {formatCurrency(expense.amount)}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed bg-card/50 px-4 py-10 text-center">
                        <ReceiptText className="mx-auto mb-2 h-10 w-10 text-muted-foreground/30" />
                        <p className="text-sm text-muted-foreground">Todavía no hay gastos en este grupo.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="members" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <Users className="h-5 w-5 text-primary" />
                      Miembros y roles
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {balances.map(({ member, balance, status }) => {
                      const isOwner = member.role === "owner";
                      const isAdmin = member.role === "admin";
                      const isSelf = member.userId === user?.id;

                      return (
                        <div key={member.id} className="rounded-2xl border border-border/70 p-4">
                          <div className="flex items-start gap-3">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={member.avatar} alt={member.displayName} />
                              <AvatarFallback>{getMemberLabel(member).charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-semibold">{getMemberLabel(member)}</p>
                                <Badge variant="outline" className="rounded-full border-primary/20 bg-primary/10 text-primary">
                                  {member.role}
                                </Badge>
                                <Badge variant="secondary" className="rounded-full">{status}</Badge>
                              </div>
                              <p className="mt-1 text-sm text-muted-foreground">{member.email}</p>
                              <p className="mt-2 text-sm font-medium">Balance: {formatCurrency(balance)}</p>
                            </div>
                          </div>

                          {currentMember && canManageMembers && !isOwner ? (
                            <div className="mt-3 flex flex-wrap gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant={isAdmin ? "default" : "outline"}
                                onClick={() => handleChangeRole(member.id, isAdmin ? "member" : "admin")}
                                disabled={activeMemberRoleId === member.id || isSelf}
                              >
                                {activeMemberRoleId === member.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                                {isAdmin ? "Quitar admin" : "Hacer admin"}
                              </Button>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </section>

          <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] right-4 z-40 flex flex-col items-center md:bottom-6 md:right-6">
            <Button
              type="button"
              onClick={openAddExpenseModal}
              disabled={members.length === 0}
              className="h-12 w-12 rounded-full p-0 shadow-xl md:h-14 md:w-auto md:px-5"
            >
              <Plus className="h-5 w-5" />
              <span className="hidden md:inline">Añadir gasto</span>
            </Button>
            <span className="mt-1 text-[11px] font-medium text-muted-foreground md:hidden">Añadir gasto</span>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
