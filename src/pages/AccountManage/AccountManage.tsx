import React, { useEffect, useMemo, useState } from "react";
import { db } from "../../lib/firebase";
import { useAuth } from "../../lib/AuthProvider";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from "firebase/firestore";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  KeyRound,
  Lock,
  RefreshCw,
  Search,
  Unlock,
  UserCheck,
  UserCog,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

interface LockedIdEntry {
  displayId: string;
  lockedAtMs: number;
  lockedBy: string;
  note: string;
}

interface TargetUser {
  id: string;
  displayName: string;
  email: string;
  photoUrl: string;
  displayId: string;
}

function mapDocToTargetUser(id: string, data: Record<string, any>): TargetUser {
  return {
    id,
    displayName:
      data.displayName || data.name || data.fullName || data.userName || "Unknown User",
    email: data.email || "",
    photoUrl: data.photoUrl || data.photoURL || data.avatar || data.userPicture || "",
    displayId: (data.displayId ?? data.id ?? "").toString().trim(),
  };
}

function getNextAvailableSerial(lastAssigned: number, lockedIds: LockedIdEntry[]): number {
  const lockedSet = new Set(lockedIds.map((item) => item.displayId));
  let next = lastAssigned + 1;
  while (lockedSet.has(next.toString())) {
    next++;
  }
  return next;
}

async function findExistingAccountByDisplayId(displayId: string): Promise<TargetUser | null> {
  const trimmed = displayId.trim();
  if (!trimmed) return null;
  const q = query(collection(db, "users"), where("displayId", "==", trimmed), limit(1));
  const snap = await getDocs(q);
  if (!snap.empty) {
    const firstDoc = snap.docs[0];
    return mapDocToTargetUser(firstDoc.id, firstDoc.data());
  }
  if (/^\d+$/.test(trimmed)) {
    const numQ = query(
      collection(db, "users"),
      where("displayId", "==", Number(trimmed)),
      limit(1),
    );
    const numSnap = await getDocs(numQ);
    if (!numSnap.empty) {
      const firstDoc = numSnap.docs[0];
      return mapDocToTargetUser(firstDoc.id, firstDoc.data());
    }
  }
  return null;
}

async function findUserByIdentifier(searchInput: string): Promise<TargetUser | null> {
  const trimmed = searchInput.trim();
  if (!trimmed) return null;

  // 1. Search by exact displayId
  const byDisplayId = await findExistingAccountByDisplayId(trimmed);
  if (byDisplayId) return byDisplayId;

  // 2. Search by document UID
  const byUidSnap = await getDoc(doc(db, "users", trimmed));
  if (byUidSnap.exists()) {
    return mapDocToTargetUser(byUidSnap.id, byUidSnap.data());
  }

  // 3. Search by email
  const emailQuery = query(collection(db, "users"), where("email", "==", trimmed), limit(1));
  const emailSnap = await getDocs(emailQuery);
  if (!emailSnap.empty) {
    const firstDoc = emailSnap.docs[0];
    return mapDocToTargetUser(firstDoc.id, firstDoc.data());
  }

  return null;
}

export default function AccountManage() {
  const { user: adminUser } = useAuth();
  const [lockedIds, setLockedIds] = useState<LockedIdEntry[]>([]);
  const [loadingLocked, setLoadingLocked] = useState(true);
  const [lastAssignedSerial, setLastAssignedSerial] = useState<number>(100000);

  // Lock new ID state (Option 1)
  const [lockInputId, setLockInputId] = useState("");
  const [lockNote, setLockNote] = useState("");
  const [lockSubmitting, setLockSubmitting] = useState(false);
  const [lockErrorMsg, setLockErrorMsg] = useState<string | null>(null);
  const [lockedSearch, setLockedSearch] = useState("");

  // Assign locked ID modal state (Option 2)
  const [assignModalLockedId, setAssignModalLockedId] = useState<string | null>(null);
  const [assignUserQuery, setAssignUserQuery] = useState("");
  const [assignSearchingUser, setAssignSearchingUser] = useState(false);
  const [assignTargetUser, setAssignTargetUser] = useState<TargetUser | null>(null);
  const [assignSubmitting, setAssignSubmitting] = useState(false);
  const [assignErrorMsg, setAssignErrorMsg] = useState<string | null>(null);

  // Direct change user Display ID state (Option 3)
  const [changeSearchQuery, setChangeSearchQuery] = useState("");
  const [changeSearching, setChangeSearching] = useState(false);
  const [changeTargetUser, setChangeTargetUser] = useState<TargetUser | null>(null);
  const [newDisplayIdInput, setNewDisplayIdInput] = useState("");
  const [changeSubmitting, setChangeSubmitting] = useState(false);
  const [changeErrorMsg, setChangeErrorMsg] = useState<string | null>(null);
  const [changeSuccessMsg, setChangeSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const lockedRef = doc(db, "system_metadata", "locked_display_ids");
    const unsubLocked = onSnapshot(
      lockedRef,
      (snap) => {
        const list: LockedIdEntry[] = [];
        if (snap.exists()) {
          const data = snap.data();
          const idsMap = data?.ids;
          if (idsMap && typeof idsMap === "object") {
            Object.entries(idsMap).forEach(([key, rawVal]) => {
              const val = (rawVal || {}) as Record<string, any>;
              const displayId = (val.displayId || key || "").toString().trim();
              if (!displayId) return;
              list.push({
                displayId,
                lockedAtMs: typeof val.lockedAtMs === "number" ? val.lockedAtMs : 0,
                lockedBy: (val.lockedBy || "Admin").toString(),
                note: (val.note || "").toString(),
              });
            });
          }
        }
        list.sort((a, b) => b.lockedAtMs - a.lockedAtMs);
        setLockedIds(list);
        setLoadingLocked(false);
      },
      (err) => {
        console.error("Failed to watch locked display IDs:", err);
        toast.error("Failed to load locked Display IDs");
        setLoadingLocked(false);
      },
    );

    const counterRef = doc(db, "system_metadata", "user_counters");
    const unsubCounter = onSnapshot(counterRef, (snap) => {
      if (snap.exists()) {
        const val = Number(snap.data()?.last_assigned_id ?? 100000);
        if (!Number.isNaN(val)) {
          setLastAssignedSerial(val);
        }
      }
    });

    return () => {
      unsubLocked();
      unsubCounter();
    };
  }, []);

  const filteredLockedIds = useMemo(() => {
    const q = lockedSearch.trim().toLowerCase();
    if (!q) return lockedIds;
    return lockedIds.filter(
      (item) =>
        item.displayId.toLowerCase().includes(q) ||
        item.note.toLowerCase().includes(q) ||
        item.lockedBy.toLowerCase().includes(q),
    );
  }, [lockedIds, lockedSearch]);

  const nextNewUserSerial = useMemo(
    () => getNextAvailableSerial(lastAssignedSerial, lockedIds),
    [lastAssignedSerial, lockedIds],
  );

  // Option 1: Lock an unused Display ID
  const handleLockDisplayId = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetId = lockInputId.trim();
    setLockErrorMsg(null);

    if (!targetId) {
      setLockErrorMsg("Please enter a Display ID to lock.");
      return;
    }

    setLockSubmitting(true);
    try {
      // Check if an existing account already owns this Display ID
      const existingOwner = await findExistingAccountByDisplayId(targetId);
      if (existingOwner) {
        const msg = `Cannot lock Display ID "${targetId}" — an account already exists with this ID (${existingOwner.displayName}).`;
        setLockErrorMsg(msg);
        toast.error(msg);
        return;
      }

      const lockedRef = doc(db, "system_metadata", "locked_display_ids");
      const adminLabel = adminUser?.email || adminUser?.uid || "Admin";

      await runTransaction(db, async (tx) => {
        const snap = await tx.get(lockedRef);
        const existingIds: Record<string, any> =
          snap.exists() && snap.data()?.ids && typeof snap.data()?.ids === "object"
            ? { ...snap.data()?.ids }
            : {};

        if (Object.prototype.hasOwnProperty.call(existingIds, targetId)) {
          throw new Error(`Display ID "${targetId}" is already locked.`);
        }

        existingIds[targetId] = {
          displayId: targetId,
          lockedAtMs: Date.now(),
          lockedBy: adminLabel,
          note: lockNote.trim(),
        };

        tx.set(lockedRef, {
          ids: existingIds,
          updatedAt: serverTimestamp(),
        });
      });

      toast.success(`Display ID "${targetId}" locked successfully`);
      setLockInputId("");
      setLockNote("");
    } catch (err: any) {
      const msg = err?.message || "Failed to lock Display ID";
      setLockErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLockSubmitting(false);
    }
  };

  // Shared helper to assign or change a user's displayId atomically
  const assignOrChangeUserDisplayId = async (
    user: TargetUser,
    targetDisplayId: string,
  ): Promise<void> => {
    const trimmedNewId = targetDisplayId.trim();
    if (!trimmedNewId) {
      throw new Error("Please enter a valid Display ID.");
    }
    if (trimmedNewId === user.displayId) {
      throw new Error(`User already has Display ID "${trimmedNewId}".`);
    }

    // Check whether another account already owns targetDisplayId
    const conflictOwner = await findExistingAccountByDisplayId(trimmedNewId);
    if (conflictOwner && conflictOwner.id !== user.id) {
      throw new Error(
        `Cannot update: An account already exists with Display ID "${trimmedNewId}" (${conflictOwner.displayName}).`,
      );
    }

    const userRef = doc(db, "users", user.id);
    const lockedRef = doc(db, "system_metadata", "locked_display_ids");

    await runTransaction(db, async (tx) => {
      const userSnap = await tx.get(userRef);
      if (!userSnap.exists()) {
        throw new Error("Target user account no longer exists.");
      }

      const lockedSnap = await tx.get(lockedRef);
      const existingIds: Record<string, any> =
        lockedSnap.exists() &&
        lockedSnap.data()?.ids &&
        typeof lockedSnap.data()?.ids === "object"
          ? { ...lockedSnap.data()?.ids }
          : {};

      tx.update(userRef, {
        displayId: trimmedNewId,
        displayIdUpdatedAt: serverTimestamp(),
      });

      if (Object.prototype.hasOwnProperty.call(existingIds, trimmedNewId)) {
        delete existingIds[trimmedNewId];
        tx.set(lockedRef, {
          ids: existingIds,
          updatedAt: serverTimestamp(),
        });
      }
    });
  };

  const handleUnlockId = async (targetId: string) => {
    if (!window.confirm(`Unlock Display ID "${targetId}" so it is no longer reserved?`)) {
      return;
    }
    try {
      const lockedRef = doc(db, "system_metadata", "locked_display_ids");
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(lockedRef);
        const existingIds: Record<string, any> =
          snap.exists() && snap.data()?.ids && typeof snap.data()?.ids === "object"
            ? { ...snap.data()?.ids }
            : {};
        delete existingIds[targetId];
        tx.set(lockedRef, {
          ids: existingIds,
          updatedAt: serverTimestamp(),
        });
      });
      toast.success(`Display ID "${targetId}" unlocked`);
    } catch (err) {
      console.error("Failed to unlock ID:", err);
      toast.error("Failed to unlock Display ID");
    }
  };

  // Option 2: Assign locked ID to a user
  const handleSearchAssignUser = async () => {
    setAssignErrorMsg(null);
    setAssignTargetUser(null);
    if (!assignUserQuery.trim()) {
      setAssignErrorMsg("Enter current Display ID, UID, or Email to find the user.");
      return;
    }
    setAssignSearchingUser(true);
    try {
      const found = await findUserByIdentifier(assignUserQuery);
      if (!found) {
        setAssignErrorMsg(`No user account found for "${assignUserQuery.trim()}".`);
      } else {
        setAssignTargetUser(found);
      }
    } catch (err) {
      console.error("Error searching user for assign:", err);
      setAssignErrorMsg("Error searching user.");
    } finally {
      setAssignSearchingUser(false);
    }
  };

  const handleConfirmAssignLockedId = async () => {
    if (!assignModalLockedId || !assignTargetUser) return;
    setAssignErrorMsg(null);
    setAssignSubmitting(true);
    try {
      await assignOrChangeUserDisplayId(assignTargetUser, assignModalLockedId);
      toast.success(
        `Assigned locked Display ID "${assignModalLockedId}" to ${assignTargetUser.displayName} (was ${assignTargetUser.displayId || "N/A"})`,
      );
      if (changeTargetUser?.id === assignTargetUser.id) {
        setChangeTargetUser({ ...assignTargetUser, displayId: assignModalLockedId });
      }
      setAssignModalLockedId(null);
      setAssignUserQuery("");
      setAssignTargetUser(null);
    } catch (err: any) {
      const msg = err?.message || "Failed to assign Display ID";
      setAssignErrorMsg(msg);
      toast.error(msg);
    } finally {
      setAssignSubmitting(false);
    }
  };

  // Option 3: Search any user and change their Display ID directly
  const handleSearchChangeUser = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setChangeErrorMsg(null);
    setChangeSuccessMsg(null);
    setChangeTargetUser(null);

    if (!changeSearchQuery.trim()) {
      setChangeErrorMsg("Enter current Display ID, UID, or Email to search.");
      return;
    }

    setChangeSearching(true);
    try {
      const found = await findUserByIdentifier(changeSearchQuery);
      if (!found) {
        setChangeErrorMsg(`No user account found for "${changeSearchQuery.trim()}".`);
      } else {
        setChangeTargetUser(found);
      }
    } catch (err) {
      console.error("Error searching user:", err);
      setChangeErrorMsg("Error searching user.");
    } finally {
      setChangeSearching(false);
    }
  };

  const handleUpdateUserDisplayId = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!changeTargetUser) return;
    setChangeErrorMsg(null);
    setChangeSuccessMsg(null);

    const trimmedNewId = newDisplayIdInput.trim();
    if (!trimmedNewId) {
      setChangeErrorMsg("Please enter a new Display ID.");
      return;
    }

    const isCurrentlyLocked = lockedIds.some((item) => item.displayId === trimmedNewId);
    if (isCurrentlyLocked) {
      const confirmed = window.confirm(
        `Display ID "${trimmedNewId}" is currently in Locked IDs. Updating ${changeTargetUser.displayName}'s ID to "${trimmedNewId}" will also remove "${trimmedNewId}" from Locked IDs. Continue?`,
      );
      if (!confirmed) return;
    }

    setChangeSubmitting(true);
    try {
      const previousId = changeTargetUser.displayId || "N/A";
      await assignOrChangeUserDisplayId(changeTargetUser, trimmedNewId);
      setChangeTargetUser({ ...changeTargetUser, displayId: trimmedNewId });
      setNewDisplayIdInput("");
      const okMsg = `Display ID changed cleanly from "${previousId}" to "${trimmedNewId}" for ${changeTargetUser.displayName}.`;
      setChangeSuccessMsg(okMsg);
      toast.success(okMsg);
    } catch (err: any) {
      const msg = err?.message || "Failed to update Display ID";
      setChangeErrorMsg(msg);
      toast.error(msg);
    } finally {
      setChangeSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto min-h-[calc(100vh-64px)] space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2.5">
            <UserCog className="text-brand-500" size={26} />
            Account Manage
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Reserve / lock unused Display IDs, assign locked IDs to users, or update any user&apos;s Display ID.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="px-4 py-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 text-sm">
            <span className="text-gray-600 dark:text-gray-300">Locked IDs: </span>
            <span className="font-bold text-amber-600 dark:text-amber-400">{lockedIds.length}</span>
          </div>
          <div className="px-4 py-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/50 text-sm">
            <span className="text-gray-600 dark:text-gray-300">Last Serial: </span>
            <span className="font-bold text-blue-600 dark:text-blue-400">{lastAssignedSerial}</span>
            <span className="text-gray-400 mx-1.5">|</span>
            <span className="text-gray-600 dark:text-gray-300">Next Auto ID: </span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">{nextNewUserSerial}</span>
          </div>
        </div>
      </div>

      {/* Top Two Action Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Option 1: Lock Unused Display ID */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
              <Lock size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Lock / Reserve Display ID
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Locked IDs are skipped automatically during new user registration.
              </p>
            </div>
          </div>

          <form onSubmit={handleLockDisplayId} className="mt-4 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">
                Display ID to Lock
              </label>
              <input
                type="text"
                value={lockInputId}
                onChange={(e) => {
                  setLockInputId(e.target.value);
                  setLockErrorMsg(null);
                }}
                placeholder="e.g. 222 or 100222"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">
                Note (Optional)
              </label>
              <input
                type="text"
                value={lockNote}
                onChange={(e) => setLockNote(e.target.value)}
                placeholder="e.g. VIP reserved ID"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-brand-500"
              />
            </div>

            {lockErrorMsg && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-medium">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <span>{lockErrorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={lockSubmitting}
              className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2.5 px-4 rounded-xl transition-all disabled:opacity-50 text-sm cursor-pointer"
            >
              <Lock size={16} />
              {lockSubmitting ? "Checking & Locking..." : "Check & Lock ID"}
            </button>
          </form>
        </div>

        {/* Option 3: Change Any User's Display ID */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              <KeyRound size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Change User Display ID
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Update any user&apos;s Display ID after checking the new ID isn&apos;t taken.
              </p>
            </div>
          </div>

          <form onSubmit={handleSearchChangeUser} className="mt-4">
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">
              Find User (Current Display ID, UID, or Email)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={changeSearchQuery}
                onChange={(e) => {
                  setChangeSearchQuery(e.target.value);
                  setChangeErrorMsg(null);
                  setChangeSuccessMsg(null);
                }}
                placeholder="e.g. 403 or user@email.com"
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-brand-500"
              />
              <button
                type="submit"
                disabled={changeSearching}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
              >
                <Search size={16} />
                {changeSearching ? "Searching..." : "Find"}
              </button>
            </div>
          </form>

          {changeTargetUser && (
            <form onSubmit={handleUpdateUserDisplayId} className="mt-4 space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700">
                <img
                  src={changeTargetUser.photoUrl || "https://via.placeholder.com/44"}
                  alt={changeTargetUser.displayName}
                  className="w-11 h-11 rounded-full object-cover border border-gray-300 dark:border-gray-600 bg-gray-200"
                />
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-sm text-gray-900 dark:text-white truncate">
                    {changeTargetUser.displayName}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    Current ID:{" "}
                    <span className="font-bold text-blue-600 dark:text-blue-400">
                      {changeTargetUser.displayId || "N/A"}
                    </span>
                    {changeTargetUser.email ? ` • ${changeTargetUser.email}` : ""}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">
                  New Display ID
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newDisplayIdInput}
                    onChange={(e) => {
                      setNewDisplayIdInput(e.target.value);
                      setChangeErrorMsg(null);
                    }}
                    placeholder="e.g. 302"
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-brand-500"
                  />
                  <button
                    type="submit"
                    disabled={changeSubmitting}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw size={15} className={changeSubmitting ? "animate-spin" : ""} />
                    {changeSubmitting ? "Updating..." : "Update"}
                  </button>
                </div>
              </div>
            </form>
          )}

          {changeErrorMsg && (
            <div className="mt-3 flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-medium">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <span>{changeErrorMsg}</span>
            </div>
          )}

          {changeSuccessMsg && (
            <div className="mt-3 flex items-start gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-medium">
              <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
              <span>{changeSuccessMsg}</span>
            </div>
          )}
        </div>
      </div>

      {/* Locked Display IDs Table (Options 1 & 2) */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Locked Display IDs
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Assign any locked ID directly to an existing user — it will replace their old ID and remove the ID from this locked list.
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={lockedSearch}
              onChange={(e) => setLockedSearch(e.target.value)}
              placeholder="Filter locked IDs..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/70 text-xs font-bold uppercase text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
                <th className="px-5 py-3.5">Locked Display ID</th>
                <th className="px-5 py-3.5">Note</th>
                <th className="px-5 py-3.5">Locked By</th>
                <th className="px-5 py-3.5">Locked At</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-sm">
              {loadingLocked ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-gray-400">
                    Loading locked Display IDs...
                  </td>
                </tr>
              ) : filteredLockedIds.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-gray-400">
                    No locked Display IDs found.
                  </td>
                </tr>
              ) : (
                filteredLockedIds.map((item) => (
                  <tr
                    key={item.displayId}
                    className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-bold text-xs">
                        <Lock size={12} />
                        {item.displayId}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-600 dark:text-gray-300">
                      {item.note || "—"}
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 dark:text-gray-400 text-xs">
                      {item.lockedBy}
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 dark:text-gray-400 text-xs">
                      {item.lockedAtMs > 0
                        ? new Date(item.lockedAtMs).toLocaleString()
                        : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-right space-x-2">
                      <button
                        onClick={() => {
                          setAssignModalLockedId(item.displayId);
                          setAssignUserQuery("");
                          setAssignTargetUser(null);
                          setAssignErrorMsg(null);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs transition-all cursor-pointer"
                      >
                        <UserCheck size={14} />
                        Assign to User
                      </button>
                      <button
                        onClick={() => handleUnlockId(item.displayId)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 font-semibold text-xs transition-all cursor-pointer"
                      >
                        <Unlock size={14} />
                        Unlock
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assign Locked ID to User Modal (Option 2) */}
      {assignModalLockedId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Assign Locked ID: {assignModalLockedId}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Find the user whose ID will be changed to {assignModalLockedId}
                </p>
              </div>
              <button
                onClick={() => setAssignModalLockedId(null)}
                className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">
                  Search Target User (Current Display ID, UID, or Email)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={assignUserQuery}
                    onChange={(e) => {
                      setAssignUserQuery(e.target.value);
                      setAssignErrorMsg(null);
                    }}
                    placeholder="e.g. 403"
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-brand-500"
                  />
                  <button
                    type="button"
                    onClick={handleSearchAssignUser}
                    disabled={assignSearchingUser}
                    className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm disabled:opacity-50 cursor-pointer"
                  >
                    {assignSearchingUser ? "..." : <Search size={18} />}
                  </button>
                </div>
              </div>

              {assignTargetUser && (
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700 space-y-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={assignTargetUser.photoUrl || "https://via.placeholder.com/44"}
                      alt={assignTargetUser.displayName}
                      className="w-11 h-11 rounded-full object-cover border border-gray-300 dark:border-gray-600 bg-gray-200"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-sm text-gray-900 dark:text-white truncate">
                        {assignTargetUser.displayName}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {assignTargetUser.email || assignTargetUser.id}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs font-bold">
                    <span className="text-gray-500">
                      Current ID: {assignTargetUser.displayId || "N/A"}
                    </span>
                    <ArrowRight size={14} className="text-brand-500" />
                    <span className="text-emerald-600 dark:text-emerald-400">
                      New ID: {assignModalLockedId}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleConfirmAssignLockedId}
                    disabled={assignSubmitting}
                    className="w-full py-2.5 px-4 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {assignSubmitting
                      ? "Assigning..."
                      : `Confirm Assign "${assignModalLockedId}"`}
                  </button>
                </div>
              )}

              {assignErrorMsg && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-medium">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                  <span>{assignErrorMsg}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
