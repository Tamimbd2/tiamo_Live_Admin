import React, { useState, useEffect, useMemo } from "react";
import { db } from "../../lib/firebase";
import { 
  collection, onSnapshot, query, orderBy, doc, updateDoc, 
  getDoc, setDoc, serverTimestamp, deleteDoc 
} from "firebase/firestore";
import { Trash2, Check, Settings, Save, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

interface Withdrawal {
  id: string;
  userId: string;
  amount: number;
  paymentMethod?: string;
  accountNumber?: string;
  accountDetails?: string;
  status: "pending" | "approved" | "rejected";
  createdAt: any;
  userContext?: {
    displayName?: string;
    displayId?: string;
    photoUrl?: string;
  };
}

export default function WithdrawManager() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search inputs
  const [searchQuery, setSearchQuery] = useState("");
  const [appliedSearchQuery, setAppliedSearchQuery] = useState("");
  
  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState("");

  // Settings
  const [bdtPerLakh, setBdtPerLakh] = useState<string>("0");
  const [isWithdrawEnabled, setIsWithdrawEnabled] = useState<boolean>(true);
  const [isSavingRate, setIsSavingRate] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "WithdrawRequests"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      async (snap) => {
        const data = await Promise.all(
          snap.docs.map(async (d) => {
            const docData = d.data();
            let userContext = docData.userContext || {};
            if (docData.userId && !userContext.displayName) {
              try {
                const userDoc = await getDoc(doc(db, "users", docData.userId));
                if (userDoc.exists()) {
                  const uData = userDoc.data();
                  userContext = {
                    displayName: uData.displayName || uData.name,
                    displayId: uData.displayId || uData.uid,
                    photoUrl: uData.photoUrl || uData.avatar,
                  };
                }
              } catch (e) {
                console.error("Error fetching user for withdrawal", e);
              }
            }
            return {
              ...docData,
              id: d.id,
              amount: docData.diamonds || docData.amount || 0,
              userContext,
            } as Withdrawal;
          })
        );
        setWithdrawals(data);
        setLoading(false);
      },
      (error) => {
        console.error(error);
        toast.error("Failed to sync withdrawals");
        setLoading(false);
      }
    );

    const settingsUnsubscribe = onSnapshot(doc(db, "appSettings", "Withdraw_config"), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setBdtPerLakh(data.bdtPerLakh || "0");
        setIsWithdrawEnabled(data.isWithdrawEnabled ?? true);
      }
    });

    return () => {
      unsubscribe();
      settingsUnsubscribe();
    };
  }, []);

  const handleUpdateStatus = async (id: string, status: "approved" | "rejected") => {
    const loadingToast = toast.loading(`Marking as ${status}...`);
    try {
      await updateDoc(doc(db, "WithdrawRequests", id), {
        status,
        updatedAt: serverTimestamp(),
      });
      toast.success(`Withdrawal ${status} successfully`, { id: loadingToast });
    } catch (error) {
      console.error(error);
      toast.error(`Failed to update status`, { id: loadingToast });
    }
  };

  const handleBulkAction = async () => {
    if (selectedIds.size === 0) {
      toast.error("Please select at least one item.");
      return;
    }
    if (!bulkAction || bulkAction === "----------") {
      toast.error("Please select an action.");
      return;
    }

    if (!window.confirm(`Are you sure you want to ${bulkAction} ${selectedIds.size} request(s)?`)) {
      return;
    }

    try {
      const promises = Array.from(selectedIds).map((id) => {
        if (bulkAction === "delete") {
          return deleteDoc(doc(db, "WithdrawRequests", id));
        } else {
          return updateDoc(doc(db, "WithdrawRequests", id), {
            status: bulkAction,
            updatedAt: serverTimestamp(),
          });
        }
      });
      await Promise.all(promises);
      toast.success(`Successfully ${bulkAction === "delete" ? "deleted" : `marked as ${bulkAction}`} ${selectedIds.size} request(s)`);
      setSelectedIds(new Set());
      setBulkAction("");
    } catch (error) {
      console.error("Error with bulk action:", error);
      toast.error("Bulk action failed");
    }
  };

  const handleClearApproved = async () => {
    const approved = withdrawals.filter(w => w.status === "approved");
    if (approved.length === 0) {
      toast.error("No approved records to clear.");
      return;
    }
    if (!window.confirm(`Are you sure you want to delete all ${approved.length} approved records permanently?`)) {
      return;
    }
    
    try {
      const promises = approved.map(w => deleteDoc(doc(db, "WithdrawRequests", w.id)));
      await Promise.all(promises);
      toast.success(`Cleared ${approved.length} approved records.`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to clear records.");
    }
  };

  const handleSaveRate = async () => {
    if (!bdtPerLakh || isNaN(Number(bdtPerLakh))) {
      toast.error("Please enter a valid amount");
      return;
    }
    setIsSavingRate(true);
    const tid = toast.loading("Saving configuration...");
    try {
      await setDoc(doc(db, "appSettings", "Withdraw_config"), {
        bdtPerLakh: bdtPerLakh,
        isWithdrawEnabled,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      toast.success("Settings updated successfully", { id: tid });
      setShowSettings(false);
    } catch (error) {
      console.error(error);
      toast.error("Failed to update settings", { id: tid });
    } finally {
      setIsSavingRate(false);
    }
  };

  const filteredWithdrawals = useMemo(() => {
    return withdrawals.filter(w => {
      let matches = true;
      if (appliedSearchQuery) {
         const qLower = appliedSearchQuery.toLowerCase();
         if (!(
            w.userContext?.displayName?.toLowerCase().includes(qLower) ||
            w.userContext?.displayId?.toLowerCase().includes(qLower) ||
            w.accountNumber?.toLowerCase().includes(qLower) ||
            w.id.toLowerCase().includes(qLower)
         )) {
             matches = false;
         }
      }
      return matches;
    });
  }, [withdrawals, appliedSearchQuery]);

  const pendingAmount = useMemo(() => {
    return withdrawals.filter(w => w.status === "pending").reduce((acc, w) => acc + (Number(w.amount) || 0), 0);
  }, [withdrawals]);

  const approvedAmount = useMemo(() => {
    return withdrawals.filter(w => w.status === "approved").reduce((acc, w) => acc + (Number(w.amount) || 0), 0);
  }, [withdrawals]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(filteredWithdrawals.map((w) => w.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto min-h-[calc(100vh-64px)] font-sans">
      
      {/* Hidden Settings Toggle */}
      <div className="flex justify-end mb-2">
        <button onClick={() => setShowSettings(!showSettings)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white p-2">
          <Settings size={18} />
        </button>
      </div>

      {showSettings && (
        <div className="mb-6 p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-bold dark:text-white mb-4">Withdrawal Configuration</h2>
          <div className="flex flex-col md:flex-row gap-6 items-end">
            <div className="w-full md:flex-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">
                Amount in BDT (per 1 Lakh Coins)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">৳</span>
                <input
                  type="number"
                  value={bdtPerLakh}
                  onChange={(e) => setBdtPerLakh(e.target.value)}
                  className="w-full pl-8 pr-4 py-3 rounded-xl border dark:border-gray-700 bg-gray-50 dark:bg-gray-900 outline-none focus:ring-2 ring-blue-500 font-bold dark:text-white"
                />
              </div>
            </div>
            
            <div className="w-full md:w-auto pb-1 flex items-center gap-4 bg-gray-50 dark:bg-gray-900 px-4 py-3 rounded-xl border border-gray-100 dark:border-gray-700 h-[48px]">
              <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Enable Withdrawals</span>
              <button
                onClick={() => setIsWithdrawEnabled(!isWithdrawEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isWithdrawEnabled ? "bg-blue-500" : "bg-gray-300 dark:bg-gray-600"
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isWithdrawEnabled ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>

            <button
              onClick={handleSaveRate}
              disabled={isSavingRate}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 h-[48px]"
            >
              {isSavingRate ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
              Save
            </button>
          </div>
        </div>
      )}

      {/* Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="bg-[#e28100] rounded-xl p-6 relative overflow-hidden flex justify-between items-center text-white">
          <div>
            <p className="text-sm font-semibold mb-1 opacity-90">Pending Amount</p>
            <h2 className="text-4xl font-bold flex items-center gap-2">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-90">
                <path d="M6 3h12l4 6-10 13L2 9z"/>
                <path d="M12 22V9"/>
                <path d="M2 9h20"/>
                <path d="M6 3l6 6"/>
                <path d="M18 3l-6 6"/>
              </svg>
              {pendingAmount.toLocaleString()}
            </h2>
          </div>
          <svg width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="absolute -right-6 -bottom-6 opacity-20">
            <path d="M6 3h12l4 6-10 13L2 9z"/>
          </svg>
        </div>

        <div className="bg-[#10b981] rounded-xl p-6 relative overflow-hidden flex justify-between items-center text-white">
          <div>
            <p className="text-sm font-semibold mb-1 opacity-90">Approved Amount</p>
            <h2 className="text-4xl font-bold flex items-center gap-2">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-90">
                <path d="M6 3h12l4 6-10 13L2 9z"/>
                <path d="M12 22V9"/>
                <path d="M2 9h20"/>
                <path d="M6 3l6 6"/>
                <path d="M18 3l-6 6"/>
              </svg>
              {approvedAmount.toLocaleString()}
            </h2>
          </div>
          <button 
            onClick={handleClearApproved}
            className="w-10 h-10 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center absolute top-4 right-4 shadow-lg transition-colors z-10"
          >
            <Trash2 size={18} className="text-white" />
          </button>
        </div>
      </div>

      {/* Search Rows */}
      <div className="space-y-3 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Search ID, Name, Account..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 focus:outline-none focus:border-blue-500 text-sm dark:text-white"
          />
          <button 
            onClick={() => setAppliedSearchQuery(searchQuery)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-semibold text-sm transition-colors"
          >
            Search
          </button>
        </div>
      </div>

      {/* Bulk Action */}
      <div className="flex flex-col sm:flex-row gap-3 mb-2 items-center">
        <select 
          value={bulkAction}
          onChange={(e) => setBulkAction(e.target.value)}
          className="w-full sm:w-64 border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none dark:text-white"
        >
          <option value="">----------</option>
          <option value="approved">Approve Selected</option>
          <option value="rejected">Reject Selected</option>
          <option value="delete">Delete Selected</option>
        </select>
        <button 
          onClick={handleBulkAction}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-semibold text-sm transition-colors"
        >
          Go
        </button>
      </div>
      
      <div className="text-gray-500 text-sm mb-4">
        {selectedIds.size} of {filteredWithdrawals.length} selected
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-x-auto shadow-sm">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead>
            <tr className="bg-[#ffe4e6] dark:bg-rose-950/30 text-blue-600 dark:text-blue-400 text-sm font-semibold">
              <th className="p-4 w-12 text-center">
                <input
                  type="checkbox"
                  onChange={handleSelectAll}
                  checked={selectedIds.size === filteredWithdrawals.length && filteredWithdrawals.length > 0}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
              <th className="p-4">ID</th>
              <th className="p-4">User Name</th>
              <th className="p-4">Withdrawal Details</th>
              <th className="p-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-500">
                  <Loader2 className="animate-spin inline mr-2" size={20} /> Loading...
                </td>
              </tr>
            ) : filteredWithdrawals.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-500">
                  No withdrawals found.
                </td>
              </tr>
            ) : (
              filteredWithdrawals.map((withdrawal, index) => {
                const bdtAmount = ((Number(withdrawal.amount || 0) / 100000) * Number(bdtPerLakh)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
                
                return (
                  <tr
                    key={withdrawal.id}
                    className={`border-b border-gray-100 dark:border-gray-800 text-sm ${
                      index % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-gray-50 dark:bg-gray-800/50"
                    }`}
                  >
                    <td className="p-4 text-center align-middle">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(withdrawal.id)}
                        onChange={() => handleSelectOne(withdrawal.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="p-4 font-bold text-gray-900 dark:text-gray-100 align-middle">
                      {withdrawal.userContext?.displayId || withdrawal.userId}
                    </td>
                    <td className="p-4 font-semibold text-gray-800 dark:text-gray-200 align-middle max-w-xs truncate">
                      {withdrawal.userContext?.displayName || "Unknown"}
                    </td>
                    <td className="p-4 py-3 align-middle">
                      <div className="flex flex-col gap-1.5 items-start">
                        <span className="bg-[#ffe4e6] text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 text-[10px] font-bold px-2 py-0.5 rounded tracking-wide">
                          VIDEO
                        </span>
                        <span className="bg-[#e0e7ff] text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 text-[10px] font-bold px-2 py-0.5 rounded tracking-wide uppercase">
                          {withdrawal.paymentMethod || "UNKNOWN"}
                        </span>
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-3 py-1 text-xs font-semibold text-gray-800 dark:text-gray-200 mt-1">
                          {withdrawal.accountNumber || withdrawal.accountDetails || "-"}
                        </div>
                        <div className="text-blue-600 dark:text-blue-400 text-xs font-bold mt-1 flex items-center gap-1">
                          <span className="text-blue-500">💎</span> 
                          {Number(withdrawal.amount).toLocaleString()} → ৳{bdtAmount}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-center align-middle">
                      {withdrawal.status === "approved" ? (
                        <div className="w-8 h-8 rounded-full bg-[#10b981] mx-auto flex items-center justify-center text-white">
                          <Check size={16} strokeWidth={3} />
                        </div>
                      ) : withdrawal.status === "rejected" ? (
                        <div className="px-3 py-1 bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded-full text-xs font-bold inline-block">
                          Rejected
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => handleUpdateStatus(withdrawal.id, "approved")}
                            className="bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded font-bold text-xs transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(withdrawal.id, "rejected")}
                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded font-bold text-xs transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
