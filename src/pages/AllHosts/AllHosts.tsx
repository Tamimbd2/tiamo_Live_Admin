import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  getDoc,
  query,
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
  writeBatch,
  arrayRemove,
  deleteField,
  where,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { X, Gem, ArrowDownUp, Lock, Unlock, Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";

interface Host {
  id: string;
  displayId?: string;
  email?: string;
  name?: string;
  displayName?: string;
  fullName?: string;
  diamonds?: number;
  totalReceived?: number;
  balance?: number;
  islock?: boolean;
  agencyId?: string | number;
  agencyCode?: string | number;
}

export default function AllHosts() {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "locked">("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isUpdatingLock, setIsUpdatingLock] = useState(false);

  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);
  const [hostToRemove, setHostToRemove] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const [isEditDiamondsModalOpen, setIsEditDiamondsModalOpen] = useState(false);
  const [hostToEditDiamonds, setHostToEditDiamonds] = useState<Host | null>(null);
  const [newDiamondsValue, setNewDiamondsValue] = useState<number>(0);

  const [isBulkLockModalOpen, setIsBulkLockModalOpen] = useState(false);
  const [pendingBulkAction, setPendingBulkAction] = useState<"lock" | "unlock" | null>(null);

  const fetchHosts = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const hostsData = querySnapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .filter((u: any) => u.isHost === true || u.ishost === true || u.role === 'host') as Host[];
      setHosts(hostsData);
    } catch (error) {
      console.error(error);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchHosts(true);
  }, []);

  const openRemoveModal = (id: string) => {
    setHostToRemove(id);
    setIsRemoveModalOpen(true);
  };

  const confirmRemoveHost = async () => {
    if (!hostToRemove) return;
    setIsRemoving(true);
    try {
      // 1. Fetch user doc to get agencyId, displayId, uid etc.
      const userRef = doc(db, "users", hostToRemove);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.data() || {};
      const agencyIdStr = String(userData.agencyId || userData.agencyCode || "");
      const displayId = userData.displayId || userData.uid;

      // 2. Remove host from their agency document's hosts array
      if (agencyIdStr) {
        await updateDoc(doc(db, "agencies", agencyIdStr), {
          hosts: arrayRemove(hostToRemove),
        }).catch((err) => {
          console.error("Error removing host from agency doc:", err);
        });
        if (displayId && displayId !== hostToRemove) {
          await updateDoc(doc(db, "agencies", agencyIdStr), {
            hosts: arrayRemove(displayId),
          }).catch(() => {});
        }
      }

      // 3. Search for any agency that might have this host in its hosts array
      try {
        const agencyQuery = query(
          collection(db, "agencies"),
          where("hosts", "array-contains", hostToRemove)
        );
        const agencyDocs = await getDocs(agencyQuery);
        for (const aDoc of agencyDocs.docs) {
          if (aDoc.id !== agencyIdStr) {
            await updateDoc(aDoc.ref, {
              hosts: arrayRemove(hostToRemove),
            }).catch(() => {});
          }
        }

        if (displayId && displayId !== hostToRemove) {
          const displayAgencyQuery = query(
            collection(db, "agencies"),
            where("hosts", "array-contains", displayId)
          );
          const displayAgencyDocs = await getDocs(displayAgencyQuery);
          for (const aDoc of displayAgencyDocs.docs) {
            await updateDoc(aDoc.ref, {
              hosts: arrayRemove(displayId),
            }).catch(() => {});
          }
        }
      } catch (err) {
        console.error("Error checking all agencies for host:", err);
      }

      // 4. Also clean up from agency_members if exists
      if (agencyIdStr) {
        await deleteDoc(doc(db, "agency_members", `${agencyIdStr}_${hostToRemove}`)).catch(() => {});
        if (displayId) {
          await deleteDoc(doc(db, "agency_members", `${agencyIdStr}_${displayId}`)).catch(() => {});
        }
      }
      try {
        const membersQuery = query(
          collection(db, "agency_members"),
          where("userId", "==", hostToRemove)
        );
        const membersSnap = await getDocs(membersQuery);
        for (const mDoc of membersSnap.docs) {
          await deleteDoc(mDoc.ref).catch(() => {});
        }
      } catch {
        // ignore if collection doesn't exist
      }

      // 5. Update user document to regular user and clear ALL agency data
      const userUpdates: Record<string, any> = {
        isHost: false,
        ishost: false,
        role: "user",
        agencyId: deleteField(),
        agencyCode: deleteField(),
        agencyName: deleteField(),
        agencyRole: deleteField(),
        agencyStatus: deleteField(),
        agencyJoinedAt: deleteField(),
        joinedAgencyAt: deleteField(),
        agencybalence: deleteField(),
        agencybalance: deleteField(),
        agencypassword: deleteField(),
        isAgency: false,
        isAgencyHost: deleteField(),
      };

      // Remove ANY field on the user document that contains "agency"
      Object.keys(userData).forEach((key) => {
        if (key.toLowerCase().includes("agency")) {
          userUpdates[key] = deleteField();
        }
      });

      await updateDoc(userRef, userUpdates);

      toast.success("Host removed and all agency data cleared successfully");
      setIsRemoveModalOpen(false);
      setHostToRemove(null);
      fetchHosts(false);
    } catch (error) {
      console.error(error);
      toast.error("Failed to remove host");
    } finally {
      setIsRemoving(false);
    }
  };

  const openEditDiamondsModal = (host: Host) => {
    setHostToEditDiamonds(host);
    setNewDiamondsValue(host.balance || 0);
    setIsEditDiamondsModalOpen(true);
  };

  const confirmEditDiamonds = async () => {
    if (!hostToEditDiamonds) return;
    try {
      await updateDoc(doc(db, "users", hostToEditDiamonds.id), {
        totalReceived: newDiamondsValue,
        diamonds: newDiamondsValue,
        balance: newDiamondsValue
      });
      toast.success("Diamonds updated successfully");
      setIsEditDiamondsModalOpen(false);
      setHostToEditDiamonds(null);
      fetchHosts(false);
    } catch (error) {
      console.error(error);
      toast.error("Failed to update diamonds");
    }
  };

  const handleSearch = () => {
    setSearchQuery(searchInput.trim());
  };

  // Lock toggling for single host
  const toggleSingleLock = async (hostId: string, currentLockStatus: boolean) => {
    const newStatus = !currentLockStatus;
    try {
      await updateDoc(doc(db, "users", hostId), {
        islock: newStatus,
      });
      setHosts((prev) =>
        prev.map((h) =>
          h.id === hostId ? { ...h, islock: newStatus } : h
        )
      );
      toast.success(`Host ${newStatus ? "locked" : "unlocked"} successfully`);
    } catch (error) {
      console.error("Error updating lock status:", error);
      toast.error("Failed to update lock status");
    }
  };

  // Bulk Lock / Unlock handlers
  const openBulkLockModal = (action: "lock" | "unlock") => {
    if (selectedIds.size === 0) {
      toast.error(`Please mark at least one host to ${action}`);
      return;
    }
    setPendingBulkAction(action);
    setIsBulkLockModalOpen(true);
  };

  const confirmBulkAction = async () => {
    if (!pendingBulkAction || selectedIds.size === 0) return;
    const lockStatus = pendingBulkAction === "lock";
    setIsUpdatingLock(true);
    try {
      const ids = Array.from(selectedIds);
      const chunkSize = 400;
      for (let i = 0; i < ids.length; i += chunkSize) {
        const chunk = ids.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        chunk.forEach((id) => {
          batch.update(doc(db, "users", id), {
            islock: lockStatus,
          });
        });
        await batch.commit();
      }

      setHosts((prev) =>
        prev.map((h) =>
          selectedIds.has(h.id)
            ? { ...h, islock: lockStatus }
            : h
        )
      );
      toast.success(
        `${ids.length} host(s) ${lockStatus ? "locked" : "unlocked"} successfully`
      );
      setSelectedIds(new Set());
      setIsBulkLockModalOpen(false);
      setPendingBulkAction(null);
    } catch (error) {
      console.error("Failed to update bulk lock:", error);
      toast.error("Failed to update lock status");
    } finally {
      setIsUpdatingLock(false);
    }
  };

  const lockedCount = hosts.filter((h) => h.islock === true).length;
  const activeCount = hosts.length - lockedCount;

  const filteredHosts = hosts
    .filter((host) => {
      if (searchQuery) {
        const uid = String(host.displayId || host.id);
        const name = String(host.fullName || host.name || host.displayName || "");
        const email = String(host.email || "");
        const queryLower = searchQuery.toLowerCase();
        const matches =
          uid.toLowerCase().includes(queryLower) ||
          name.toLowerCase().includes(queryLower) ||
          email.toLowerCase().includes(queryLower);
        if (!matches) return false;
      }

      const isLocked = Boolean(host.islock === true);
      if (filterStatus === "locked") return isLocked;
      if (filterStatus === "active") return !isLocked;
      return true;
    })
    .sort((a, b) => (b.balance || 0) - (a.balance || 0));

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(filteredHosts.map((h) => h.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  return (
    <div className="bg-white dark:bg-[#070509] min-h-[calc(100vh-64px)] p-6 rounded-lg">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-[28px] font-bold text-[#1a56db]">Total Hosts:</h1>
          <div className="px-3 py-1 rounded-lg border-2 border-[#1a56db] text-[#1a56db] font-bold text-xl">
            {hosts.length}
          </div>
        </div>

        {/* Quick status filter badges */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterStatus("all")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterStatus === "all"
                ? "bg-[#1a56db] text-white shadow-sm"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            All: {hosts.length}
          </button>
          <button
            onClick={() => setFilterStatus("active")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterStatus === "active"
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-100"
            }`}
          >
            Active: {activeCount}
          </button>
          <button
            onClick={() => setFilterStatus("locked")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterStatus === "locked"
                ? "bg-red-600 text-white shadow-sm"
                : "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/50 hover:bg-red-100"
            }`}
          >
            Locked: {lockedCount}
          </button>
        </div>
      </div>

      {/* Search & Bulk Action Bar */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="flex flex-1 gap-3">
          <input
            type="text"
            placeholder="Search by User ID, Name, or Email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={handleSearch}
            className="bg-[#1a56db] hover:bg-blue-700 text-white font-semibold px-8 py-2 rounded transition-colors text-sm cursor-pointer"
          >
            Search
          </button>
        </div>

        {/* Bulk Action Controls */}
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <span className="text-xs font-bold text-[#1a56db] bg-blue-50 dark:bg-blue-950/40 px-3 py-2 rounded border border-blue-200 dark:border-blue-800 whitespace-nowrap">
              {selectedIds.size} marked
            </span>
          )}
          <button
            onClick={() => openBulkLockModal("lock")}
            disabled={selectedIds.size === 0 || isUpdatingLock}
            className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-4 py-2 rounded transition-all text-sm shadow-sm cursor-pointer whitespace-nowrap"
            title="Lock marked hosts"
          >
            <Lock size={15} />
            Lock Marked
          </button>
          <button
            onClick={() => openBulkLockModal("unlock")}
            disabled={selectedIds.size === 0 || isUpdatingLock}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-4 py-2 rounded transition-all text-sm shadow-sm cursor-pointer whitespace-nowrap"
            title="Unlock marked hosts"
          >
            <Unlock size={15} />
            Unlock Marked
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg overflow-x-auto bg-white shadow-sm border border-gray-100">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead>
            <tr className="bg-[#ffecec] text-[#1a56db] font-bold text-sm">
              <th className="px-4 py-4 border-b border-gray-100 text-center w-12">
                <input
                  type="checkbox"
                  checked={
                    filteredHosts.length > 0 &&
                    selectedIds.size === filteredHosts.length
                  }
                  onChange={handleSelectAll}
                  className="w-4 h-4 rounded text-[#1a56db] focus:ring-[#1a56db] cursor-pointer"
                  title="Select All"
                />
              </th>
              <th className="px-6 py-4 border-b border-gray-100">User ID</th>
              <th className="px-6 py-4 border-b border-gray-100">Email</th>
              <th className="px-6 py-4 border-b border-gray-100">Full Name</th>
              <th className="px-6 py-4 border-b border-gray-100">
                <div className="flex items-center gap-1">
                  Diamonds
                  <ArrowDownUp size={12} className="text-gray-400 ml-1" />
                </div>
              </th>
              <th className="px-6 py-4 border-b border-gray-100 text-center">Lock Status</th>
              <th className="px-6 py-4 border-b border-gray-100 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-10 text-gray-500">Loading hosts...</td>
              </tr>
            ) : filteredHosts.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-10 text-gray-500">No hosts found.</td>
              </tr>
            ) : (
              filteredHosts.map((host, index) => {
                const uid = host.displayId || host.id;
                const name = host.fullName || host.name || host.displayName || "N/A";
                const isEven = index % 2 === 0;
                const isLocked = Boolean(host.islock === true);
                const isSelected = selectedIds.has(host.id);

                return (
                  <tr
                    key={host.id}
                    className={`${
                      isSelected
                        ? "bg-blue-50/70 dark:bg-blue-950/40"
                        : isEven
                        ? "bg-[#f5f7fa]"
                        : "bg-white"
                    } border-b border-gray-100 hover:bg-blue-50/50 transition-colors`}
                  >
                    <td className="px-4 py-4 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectOne(host.id)}
                        className="w-4 h-4 rounded text-[#1a56db] focus:ring-[#1a56db] cursor-pointer"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <a href={`/user/${host.id}`} className="text-[#1a56db] hover:underline text-[15px] font-medium">{uid}</a>
                    </td>
                    <td className="px-6 py-4 text-[#1a56db] hover:underline cursor-pointer text-[15px] font-medium">
                      {host.email || "N/A"}
                    </td>
                    <td className="px-6 py-4 text-[#1a56db] hover:underline cursor-pointer text-[15px] font-medium">
                      {name}
                    </td>
                    <td className="px-6 py-4">
                      <div
                        className="flex items-center gap-1.5 text-[#1a56db] font-bold text-[15px] cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30 p-1.5 -ml-1.5 rounded-lg w-max transition-colors"
                        onClick={() => openEditDiamondsModal(host)}
                        title="Click to edit diamonds"
                      >
                        <Gem size={16} className="text-[#1a56db]" /> {host.balance?.toLocaleString() || 0}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {isLocked ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800">
                          <Lock size={12} /> Locked
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                          <Unlock size={12} /> Active
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => toggleSingleLock(host.id, isLocked)}
                          className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors cursor-pointer ${
                            isLocked
                              ? "border-emerald-500 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                              : "border-amber-500 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                          }`}
                          title={isLocked ? "Unlock this host" : "Lock this host"}
                        >
                          {isLocked ? <Unlock size={16} /> : <Lock size={16} />}
                        </button>
                        <button
                          onClick={() => openRemoveModal(host.id)}
                          className="w-8 h-8 rounded-full border border-red-500 flex items-center justify-center text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                          title="Remove Host Status"
                        >
                          <X size={18} strokeWidth={2} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Confirmation Modal for Bulk Lock/Unlock */}
      {isBulkLockModalOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-sm shadow-xl border border-gray-200 dark:border-gray-800">
            <h3 className="text-xl font-bold mb-3 text-gray-800 dark:text-white flex items-center gap-2">
              {pendingBulkAction === "lock" ? (
                <>
                  <Lock size={20} className="text-red-600" />
                  Lock Marked Hosts
                </>
              ) : (
                <>
                  <Unlock size={20} className="text-emerald-600" />
                  Unlock Marked Hosts
                </>
              )}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Are you sure you want to{" "}
              <span className="font-bold text-gray-800 dark:text-gray-200">
                {pendingBulkAction === "lock" ? "LOCK" : "UNLOCK"}
              </span>{" "}
              the <span className="font-bold text-[#1a56db]">{selectedIds.size}</span> marked host(s)?
              {pendingBulkAction === "lock"
                ? " Their account 'islock' will be set to true."
                : " Their account 'islock' will be set to false."}
            </p>
            <div className="flex gap-3">
              <button
                disabled={isUpdatingLock}
                onClick={() => {
                  setIsBulkLockModalOpen(false);
                  setPendingBulkAction(null);
                }}
                className="flex-1 px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={isUpdatingLock}
                onClick={confirmBulkAction}
                className={`flex-1 px-4 py-2 rounded-xl text-white transition-colors font-medium flex items-center justify-center gap-2 cursor-pointer ${
                  pendingBulkAction === "lock"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {isUpdatingLock && <Loader2 size={16} className="animate-spin" />}
                Confirm {pendingBulkAction === "lock" ? "Lock" : "Unlock"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Host Modal */}
      {isRemoveModalOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-sm shadow-xl border border-gray-200 dark:border-gray-800">
            <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Remove Host</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Are you sure you want to remove this host? They will become a regular user and will be removed from the agency's host list.
            </p>
            <div className="flex gap-3">
              <button
                disabled={isRemoving}
                onClick={() => {
                  setIsRemoveModalOpen(false);
                  setHostToRemove(null);
                }}
                className="flex-1 px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={isRemoving}
                onClick={confirmRemoveHost}
                className="flex-1 px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 transition-colors font-medium cursor-pointer flex items-center justify-center gap-2"
              >
                {isRemoving && <Loader2 size={16} className="animate-spin" />}
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Diamonds Modal */}
      {isEditDiamondsModalOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-sm shadow-xl border border-gray-200 dark:border-gray-800">
            <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white flex items-center gap-2">
              <Gem size={20} className="text-[#1a56db]" />
              Update Diamonds
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Enter the new diamond amount for <span className="font-bold text-gray-700 dark:text-gray-200">{hostToEditDiamonds?.fullName || hostToEditDiamonds?.displayName}</span>
            </p>
            <input
              type="number"
              className="w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl px-4 py-3 mb-6 focus:outline-none focus:ring-2 focus:ring-[#1a56db]"
              value={newDiamondsValue}
              onChange={(e) => setNewDiamondsValue(Number(e.target.value))}
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setIsEditDiamondsModalOpen(false);
                  setHostToEditDiamonds(null);
                }}
                className="flex-1 px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmEditDiamonds}
                className="flex-1 px-4 py-2 rounded-xl bg-[#1a56db] text-white hover:bg-blue-700 transition-colors font-medium cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
