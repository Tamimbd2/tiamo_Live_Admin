import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import {
  collection,
  getDocs,
  where,
  query,
  runTransaction,
  doc
} from "firebase/firestore";
import {
  X,
  Coins,
  Gift,
  Gamepad2,
  Loader2,
  Undo2,
  MoreVertical,
  Send,
  Trash2
} from "lucide-react";
import toast from "react-hot-toast";
import { UserInfo } from "./GiftingCoinManager";

interface GiftingActionPanelProps {
  selectedUser: UserInfo | null;
  onClose: () => void;
}

interface HistoryItem {
  id: string;
  type: "gift_sent" | "gift_received" | "game_win" | "admin_add" | "admin_deduct" | "admin_set" | "admin_clear";
  amount: number;
  details: string;
  timestamp: any;
  originalData?: any;
}

export const GiftingActionPanel = ({ selectedUser, onClose }: GiftingActionPanelProps) => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [undoingId, setUndoingId] = useState<string | null>(null);
  const [redirectingId, setRedirectingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [redirectModalItem, setRedirectModalItem] = useState<HistoryItem | null>(null);
  const [redirectDisplayId, setRedirectDisplayId] = useState("");
  const [targetUser, setTargetUser] = useState<UserInfo | null>(null);
  const [searchError, setSearchError] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const fetchHistory = async () => {
    if (!selectedUser?.uid) return;
    setHistoryLoading(true);
    try {
      const giftsSentQuery = query(
        collection(db, "gifting_transactions"),
        where("senderId", "==", selectedUser.uid)
      );
      const giftsRecvQuery = query(
        collection(db, "gifting_transactions"),
        where("recipientId", "==", selectedUser.uid)
      );
      const adminEditsQuery = query(
        collection(db, "gifting_coin_history"),
        where("userId", "==", selectedUser.uid)
      );

      const [sentSnap, recvSnap, editsSnap] = await Promise.all([
        getDocs(giftsSentQuery),
        getDocs(giftsRecvQuery),
        getDocs(adminEditsQuery)
      ]);

      const sentItems = sentSnap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          type: "gift_sent" as const,
          amount: data.giftValue ?? 0,
          details: `Sent gift to ${data.recipientId?.substring(0, 6)}...`,
          timestamp: data.timestamp,
          originalData: data
        };
      });

      const recvItems = recvSnap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          type: "gift_received" as const,
          amount: data.giftValue ?? 0,
          details: `Received gift from ${data.senderId?.substring(0, 6)}...`,
          timestamp: data.timestamp,
          originalData: data
        };
      });

      const editItems = editsSnap.docs.map((d) => {
        const data = d.data();
        const action = data.action;
        let label = "Admin Update";
        if (action === "add") label = "Admin Top-up";
        else if (action === "deduct") label = "Admin Deduction";
        else if (action === "set") label = "Admin Set Balance";
        else if (action === "clear") label = "Admin Cleared Balance";

        return {
          id: d.id,
          type: `admin_${action}` as any,
          amount: data.amount ?? 0,
          details: `${label} (${data.adminEmail ?? "System"})`,
          timestamp: data.timestamp
        };
      });

      const combined = [...sentItems, ...recvItems, ...editItems]
        .sort((a, b) => {
          const tA = a.timestamp?.toMillis ? a.timestamp.toMillis() : (a.timestamp?.seconds * 1000 || 0);
          const tB = b.timestamp?.toMillis ? b.timestamp.toMillis() : (b.timestamp?.seconds * 1000 || 0);
          return tB - tA;
        });

      setHistory(combined);
    } catch (error) {
      console.error("Error fetching history:", error);
      toast.error("Failed to load history");
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (!redirectDisplayId.trim()) {
      setTargetUser(null);
      setSearchError("");
      return;
    }
    
    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      setSearchError("");
      try {
        const q = query(collection(db, "users"), where("displayId", "==", redirectDisplayId.trim()));
        const snap = await getDocs(q);
        if (snap.empty) {
          setTargetUser(null);
          setSearchError("User not found");
        } else {
          setTargetUser({ ...snap.docs[0].data(), uid: snap.docs[0].id } as UserInfo);
        }
      } catch (err) {
        setSearchError("Error searching user");
      } finally {
        setIsSearching(false);
      }
    }, 600);

    return () => clearTimeout(delayDebounceFn);
  }, [redirectDisplayId]);

  useEffect(() => {
    if (selectedUser?.uid) {
      fetchHistory();
    }
  }, [selectedUser?.uid]);

  const handleUndoTransaction = async (item: HistoryItem) => {
    if (!item.originalData || (!item.type.includes("gift_sent") && !item.type.includes("gift_received"))) {
      toast.error("Can only undo gifting transactions");
      return;
    }

    const isConfirmed = window.confirm(
      "Are you sure you want to UNDO this gift transaction? This will refund coins to the sender and deduct them from the recipient. This action cannot be undone."
    );

    if (!isConfirmed) return;

    setUndoingId(item.id);
    const tid = toast.loading("Undoing transaction...");

    try {
      await runTransaction(db, async (transaction) => {
        const txRef = doc(db, "gifting_transactions", item.id);
        const txSnap = await transaction.get(txRef);
        
        if (!txSnap.exists()) {
          throw new Error("Transaction has already been undone or deleted.");
        }

        const data = txSnap.data();
        const senderId = data.senderId;
        const recipientId = data.recipientId;
        const giftValue = data.giftValue || 0;

        // Perform all READS first
        let senderSnap = null;
        let recipientSnap = null;
        let senderRef = null;
        let recipientRef = null;

        if (senderId) {
          senderRef = doc(db, "users", senderId);
          senderSnap = await transaction.get(senderRef);
        }

        if (recipientId) {
          recipientRef = doc(db, "users", recipientId);
          recipientSnap = await transaction.get(recipientRef);
        }

        // Perform all WRITES after reads
        if (senderRef && senderSnap && senderSnap.exists()) {
          const currentBalance = senderSnap.data().balance || 0;
          transaction.update(senderRef, { balance: currentBalance + giftValue });
        }

        if (recipientRef && recipientSnap && recipientSnap.exists()) {
          const currentBalance = recipientSnap.data().balance || 0;
          transaction.update(recipientRef, { 
            balance: Math.max(0, currentBalance - giftValue) 
          });
        }

        // Delete the transaction record
        transaction.delete(txRef);
      });

      toast.success("Transaction undone successfully", { id: tid });
      fetchHistory(); // Refresh
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to undo transaction", { id: tid });
    } finally {
      setUndoingId(null);
    }
  };

  const handleRemoveTransaction = async (item: HistoryItem) => {
    if (!item.originalData || (!item.type.includes("gift_sent") && !item.type.includes("gift_received"))) {
      toast.error("Can only remove gifting transactions");
      return;
    }

    const isConfirmed = window.confirm(
      "Are you sure you want to REMOVE this gift? The coins will be deducted from the recipient and will VANISH (not refunded to the sender). This action cannot be undone."
    );

    if (!isConfirmed) return;

    setRemovingId(item.id);
    const tid = toast.loading("Removing gift...");

    try {
      await runTransaction(db, async (transaction) => {
        const txRef = doc(db, "gifting_transactions", item.id);
        const txSnap = await transaction.get(txRef);
        
        if (!txSnap.exists()) {
          throw new Error("Transaction has already been removed or deleted.");
        }

        const data = txSnap.data();
        const recipientId = data.recipientId;
        const giftValue = data.giftValue || 0;

        let recipientSnap = null;
        let recipientRef = null;

        if (recipientId) {
          recipientRef = doc(db, "users", recipientId);
          recipientSnap = await transaction.get(recipientRef);
        }

        if (recipientRef && recipientSnap && recipientSnap.exists()) {
          const currentBalance = recipientSnap.data().balance || 0;
          transaction.update(recipientRef, { 
            balance: Math.max(0, currentBalance - giftValue) 
          });
        }

        transaction.delete(txRef);
      });

      toast.success("Gift removed successfully", { id: tid });
      fetchHistory(); // Refresh
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to remove gift", { id: tid });
    } finally {
      setRemovingId(null);
    }
  };

  const handleRedirectTransaction = (item: HistoryItem) => {
    if (!item.originalData || (!item.type.includes("gift_sent") && !item.type.includes("gift_received"))) {
      toast.error("Can only redirect gifting transactions");
      return;
    }
    setRedirectModalItem(item);
    setRedirectDisplayId("");
  };

  const submitRedirectTransaction = async () => {
    if (!redirectModalItem || !targetUser) return;
    const item = redirectModalItem;
    const newRecipientId = targetUser.uid;

    setRedirectingId(item.id);
    const tid = toast.loading("Redirecting gift...");
    setRedirectModalItem(null);
    setTargetUser(null);
    setRedirectDisplayId("");

    try {
      const oldRecipientId = item.originalData.recipientId;
      const giftValue = item.originalData.giftValue || 0;

      if (oldRecipientId === newRecipientId) {
        throw new Error("Gift is already sent to this user.");
      }

      await runTransaction(db, async (transaction) => {
        const txRef = doc(db, "gifting_transactions", item.id);
        const txSnap = await transaction.get(txRef);

        if (!txSnap.exists()) {
          throw new Error("Transaction not found.");
        }

        // Perform READS
        let oldRecipientSnap = null;
        let oldRecipientRef = null;
        let newRecipientSnap = null;
        let newRecipientRef = null;

        if (oldRecipientId) {
          oldRecipientRef = doc(db, "users", oldRecipientId);
          oldRecipientSnap = await transaction.get(oldRecipientRef);
        }

        if (newRecipientId) {
          newRecipientRef = doc(db, "users", newRecipientId);
          newRecipientSnap = await transaction.get(newRecipientRef);
        }

        // Perform WRITES
        if (oldRecipientRef && oldRecipientSnap && oldRecipientSnap.exists()) {
          const currentBalance = oldRecipientSnap.data().balance || 0;
          transaction.update(oldRecipientRef, { 
            balance: Math.max(0, currentBalance - giftValue) 
          });
        }

        if (newRecipientRef && newRecipientSnap && newRecipientSnap.exists()) {
          const currentBalance = newRecipientSnap.data().balance || 0;
          transaction.update(newRecipientRef, { 
            balance: currentBalance + giftValue 
          });
        }

        // Update the transaction record
        transaction.update(txRef, { recipientId: newRecipientId });
      });

      toast.success("Gift redirected successfully", { id: tid });
      fetchHistory(); // Refresh
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to redirect gift", { id: tid });
    } finally {
      setRedirectingId(null);
    }
  };

  const formatTime = (ts: any) => {
    if (!ts) return "Just now";
    const date = ts.toDate ? ts.toDate() : new Date(ts.seconds * 1000);
    return date.toLocaleString();
  };

  return (
    <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-[2.5rem] p-6 md:p-8 shadow-2xl overflow-hidden ring-1 ring-black/5 dark:ring-white/5">
      {/* Modal Tab Header */}
      <div className="flex justify-between items-center mb-6 border-b dark:border-gray-800 pb-4">
        <div className="flex gap-4">
          <button
            className="text-lg font-black tracking-tight transition-all pb-1.5 border-b-2 text-blue-950 dark:text-white border-blue-500"
          >
            Transaction History
          </button>
        </div>
        <button
          onClick={onClose}
          className="p-2.5 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-500 hover:text-red-500 transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
        {historyLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="animate-spin text-emerald-500" size={32} />
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Syncing Transactions...</p>
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-[2rem]">
            <p className="text-gray-400 font-bold text-sm">No transaction records found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-950 rounded-2xl border dark:border-gray-800/80 transition-all hover:scale-[1.01] group"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2.5 rounded-xl ${item.type === "gift_sent" ||
                        item.type.includes("deduct") ||
                        item.type.includes("clear")
                        ? "bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400"
                        : item.type === "game_win"
                          ? "bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
                          : "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                      }`}
                  >
                    {item.type.includes("gift") ? (
                      <Gift size={16} />
                    ) : item.type === "game_win" ? (
                      <Gamepad2 size={16} />
                    ) : (
                      <Coins size={16} />
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-black dark:text-white tracking-wide uppercase">
                      {item.type.replace("_", " ")}
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
                      {item.details}
                    </p>
                    <p className="text-[9px] text-gray-400 dark:text-gray-500 mt-1 font-mono">
                      {formatTime(item.timestamp)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span
                    className={`text-base font-black font-mono tracking-tight ${item.type === "gift_sent" ||
                        item.type.includes("deduct") ||
                        item.type.includes("clear")
                        ? "text-red-500"
                        : "text-emerald-500"
                      }`}
                  >
                    {item.type === "gift_sent" ||
                      item.type.includes("deduct") ||
                      item.type.includes("clear")
                      ? "-"
                      : "+"}
                    {item.amount.toLocaleString()}
                  </span>

                  {(item.type === "gift_sent" || item.type === "gift_received") && (
                    <div className="relative">
                      <button
                        onClick={() => setOpenMenuId(openMenuId === item.id ? null : item.id)}
                        className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg text-gray-400 transition-colors"
                      >
                        <MoreVertical size={18} />
                      </button>

                      {openMenuId === item.id && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setOpenMenuId(null)}
                          />
                          <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-xl rounded-xl p-1.5 w-[160px] z-20 animate-in fade-in zoom-in-95 duration-100 flex flex-col gap-1">
                            <button
                              onClick={() => {
                                setOpenMenuId(null);
                                handleRedirectTransaction(item);
                              }}
                              disabled={redirectingId === item.id}
                              className="w-full text-left px-3 py-2 text-sm font-bold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg flex items-center gap-2 disabled:opacity-50 transition-colors"
                            >
                              {redirectingId === item.id ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                              Redirect Gift
                            </button>
                            <button
                              onClick={() => {
                                setOpenMenuId(null);
                                handleUndoTransaction(item);
                              }}
                              disabled={undoingId === item.id}
                              className="w-full text-left px-3 py-2 text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg flex items-center gap-2 disabled:opacity-50 transition-colors"
                            >
                              {undoingId === item.id ? <Loader2 size={16} className="animate-spin" /> : <Undo2 size={16} />}
                              Undo Gift
                            </button>
                            <button
                              onClick={() => {
                                setOpenMenuId(null);
                                handleRemoveTransaction(item);
                              }}
                              disabled={removingId === item.id}
                              className="w-full text-left px-3 py-2 text-sm font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex items-center gap-2 disabled:opacity-50 transition-colors"
                            >
                              {removingId === item.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                              Remove (Vanish)
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Redirect Gift Modal */}
      {redirectModalItem && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-black dark:text-white mb-2">Redirect Gift</h3>
            <p className="text-sm text-gray-500 mb-6">
              Enter the Display ID of the correct recipient. The coins will be deducted from the current recipient and sent to this new user.
            </p>
            
            <div className="mb-4">
              <label className="text-xs font-black text-gray-400 uppercase ml-1 tracking-wider">Correct Display ID</label>
              <input
                type="text"
                placeholder="Search by ID..."
                className="w-full mt-2 p-4 rounded-xl border dark:border-gray-800 bg-gray-50 dark:bg-gray-950 dark:text-white text-lg font-bold outline-none focus:ring-2 ring-blue-500 transition-all"
                value={redirectDisplayId}
                onChange={(e) => setRedirectDisplayId(e.target.value)}
                autoFocus
              />
            </div>

            <div className="mb-6 min-h-[70px]">
              {isSearching ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 size={24} className="animate-spin text-blue-500" />
                </div>
              ) : searchError ? (
                <p className="text-sm text-red-500 text-center font-bold mt-4">{searchError}</p>
              ) : targetUser ? (
                <div 
                  onClick={submitRedirectTransaction}
                  className="p-3 border-2 border-blue-500 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center gap-3 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors shadow-sm"
                >
                  {targetUser.photoUrl ? (
                    <img src={targetUser.photoUrl} className="w-12 h-12 rounded-full object-cover border border-blue-200" alt="" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-blue-200 dark:bg-blue-800 flex items-center justify-center font-bold text-blue-600 dark:text-blue-200">
                      {targetUser.displayName?.charAt(0) || "U"}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold dark:text-white text-sm truncate">{targetUser.displayName || "Unknown"}</h4>
                    <p className="text-xs text-gray-500 truncate">ID: {targetUser.displayId}</p>
                  </div>
                  <div className="text-blue-500 shrink-0">
                    <Send size={18} />
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-gray-400 text-center px-4">
                  Type an ID above to search for the recipient
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { 
                  setRedirectModalItem(null); 
                  setTargetUser(null); 
                  setRedirectDisplayId(""); 
                  setSearchError("");
                }}
                className="w-full py-3 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
