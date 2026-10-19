import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import { useAuth } from "../../lib/AuthProvider";
import {
  doc,
  runTransaction,
  collection,
  getDocs,
  where,
  query,
  serverTimestamp,
  limit
} from "firebase/firestore";
import {
  ArrowUpRight,
  ArrowDownRight,
  Check,
  RotateCcw,
  X,
  Coins,
  Gift,
  Gamepad2,
  Loader2
} from "lucide-react";
import toast from "react-hot-toast";
import { UserInfo } from "./CoinManager";

interface ActionPanelProps {
  selectedUser: UserInfo | null;
  onClose: () => void;
}

interface HistoryItem {
  id: string;
  type: "gift_sent" | "gift_received" | "game_win" | "admin_add" | "admin_deduct" | "admin_set" | "admin_clear";
  amount: number;
  details: string;
  timestamp: any;
}

export const ActionPanel = ({ selectedUser, onClose }: ActionPanelProps) => {
  const { user: currentAdmin } = useAuth();
  const [panelTab, setPanelTab] = useState<"modify" | "history">("modify");
  const [mode, setMode] = useState<"add" | "deduct" | "set">("add");
  const [amount, setAmount] = useState<number>(0);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

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
      const gameWinsQuery = query(
        collection(db, "bigWinners"),
        where("userId", "==", selectedUser.uid)
      );
      const adminEditsQuery = query(
        collection(db, "coin_history"),
        where("userId", "==", selectedUser.uid)
      );

      // Diagnostic query
      const diagnosticQuery = query(collection(db, "bigWinners"), limit(5));

      const [sentSnap, recvSnap, winsSnap, editsSnap, diagSnap] = await Promise.all([
        getDocs(giftsSentQuery),
        getDocs(giftsRecvQuery),
        getDocs(gameWinsQuery),
        getDocs(adminEditsQuery),
        getDocs(diagnosticQuery)
      ]);

      // Print game wins to console to verify details
      console.log("Raw Game Wins for User:", winsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      console.log("Diagnostic BigWinners in DB (First 5):", diagSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      console.log("Current Selected User UID:", selectedUser.uid);

      const sentItems = sentSnap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          type: "gift_sent" as const,
          amount: data.giftValue ?? 0,
          details: `Sent gift to ${data.recipientId?.substring(0, 6)}...`,
          timestamp: data.timestamp
        };
      });

      const recvItems = recvSnap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          type: "gift_received" as const,
          amount: data.giftValue ?? 0,
          details: `Received gift from ${data.senderId?.substring(0, 6)}...`,
          timestamp: data.timestamp
        };
      });

      const winItems = winsSnap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          type: "game_win" as const,
          amount: data.amount ?? 0,
          details: `Won in ${data.gameName ?? "Game"}`,
          timestamp: data.timestamp
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

      const combined = [...sentItems, ...recvItems, ...winItems, ...editItems]
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
    if (panelTab === "history" && selectedUser?.uid) {
      fetchHistory();
    }
  }, [panelTab, selectedUser?.uid]);

  const handleUpdateBalance = async (type: "update" | "clear") => {
    if (!selectedUser?.uid) {
      toast.error("No user selected");
      return;
    }

    if (type === "update" && amount < 0) {
      toast.error("Enter a valid amount");
      return;
    }

    if (type === "update" && mode !== "set" && amount === 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    const tid = toast.loading("Processing...");

    try {
      const userRef = doc(db, "users", selectedUser.uid);

      await runTransaction(db, async (transaction) => {
        const userSnap = await transaction.get(userRef);
        const currentBalance = userSnap.exists()
          ? (userSnap.data().balance ?? 0)
          : 0;

        let newBalance = currentBalance;
        if (type === "clear") {
          newBalance = 0;
        } else if (mode === "add") {
          newBalance = currentBalance + amount;
        } else if (mode === "deduct") {
          newBalance = Math.max(0, currentBalance - amount);
        } else if (mode === "set") {
          newBalance = Math.max(0, amount);
        }

        if (userSnap.exists()) {
          transaction.update(userRef, { balance: newBalance });
        } else {
          transaction.set(userRef, { balance: newBalance }, { merge: true });
        }

        const logRef = doc(collection(db, "coin_history"));
        transaction.set(logRef, {
          userId: selectedUser.uid,
          amount: type === "clear" ? currentBalance : amount,
          action: type === "clear" ? "clear" : mode,
          adminUid: currentAdmin?.uid || "system",
          adminEmail: currentAdmin?.email || "system",
          timestamp: serverTimestamp()
        });
      });

      if (type === "clear") {
        toast.success("Balance cleared successfully", { id: tid });
      } else {
        const msg =
          mode === "add"
            ? `Added ${amount} coins successfully`
            : mode === "deduct"
              ? `Deducted ${amount} coins successfully`
              : `Set balance to ${amount} coins successfully`;
        toast.success(msg, { id: tid });
      }

      setAmount(0);
      onClose();
    } catch (error) {
      console.error("Coin update error:", error);
      toast.error(
        error instanceof Error ? error.message : "Action failed",
        { id: tid }
      );
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
            onClick={() => setPanelTab("modify")}
            className={`text-lg font-black tracking-tight transition-all pb-1.5 border-b-2 ${panelTab === "modify"
                ? "text-blue-950 dark:text-white border-blue-500"
                : "text-gray-400 border-transparent hover:text-gray-600 dark:hover:text-gray-300"
              }`}
          >
            Modify Balance
          </button>
          <button
            onClick={() => setPanelTab("history")}
            className={`text-lg font-black tracking-tight transition-all pb-1.5 border-b-2 ${panelTab === "history"
                ? "text-blue-950 dark:text-white border-blue-500"
                : "text-gray-400 border-transparent hover:text-gray-600 dark:hover:text-gray-300"
              }`}
          >
            History
          </button>
        </div>
        <button
          onClick={onClose}
          className="p-2.5 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-500 hover:text-red-500 transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {panelTab === "modify" ? (
        <div className="space-y-6">
          {/* User Card info */}
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center gap-4">
            {selectedUser?.photoUrl ? (
              <img
                src={selectedUser.photoUrl}
                className="w-14 h-14 rounded-full border-2 border-white dark:border-gray-700 shadow-sm object-cover"
                alt=""
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-400 text-xl font-bold shrink-0">
                {selectedUser?.displayName?.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="overflow-hidden flex-1">
              <p className="text-[10px] text-blue-500 font-black uppercase tracking-wider">Selected Account</p>
              <p className="text-lg font-black dark:text-white truncate leading-snug">{selectedUser?.displayName}</p>
              <div className="flex items-center gap-2 mt-2 bg-white dark:bg-gray-800/80 px-4 py-2 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm w-fit">
                <Coins size={20} className="text-orange-500 shrink-0" />
                <span className="text-3xl font-black text-orange-600 dark:text-orange-400 font-mono tracking-tight">
                  {selectedUser?.balance ?? 0}
                </span>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                  Coins
                </span>
              </div>
            </div>
          </div>

          {/* Mode Selector Tabs */}
          <div className="flex bg-gray-50 dark:bg-gray-950 p-1.5 rounded-2xl border dark:border-gray-800/60">
            {(["add", "deduct", "set"] as const).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setAmount(0);
                }}
                className={`flex-1 py-2.5 text-xs font-black rounded-xl uppercase tracking-wider transition-all ${mode === m
                    ? "bg-blue-950 dark:bg-gray-800 text-white shadow-md scale-[1.02]"
                    : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  }`}
              >
                {m === "add" ? "Add" : m === "deduct" ? "Deduct" : "Set Balance"}
              </button>
            ))}
          </div>

          {/* Amount Input */}
          <div>
            <label className="text-xs font-black text-gray-400 uppercase ml-1 tracking-wider">
              {mode === "add"
                ? "Add Coins"
                : mode === "deduct"
                  ? "Deduct Coins"
                  : "Set Exact Balance"}
            </label>
            <div className="relative mt-2">
              <Coins className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-500" size={24} />
              <input
                type="number"
                min={0}
                placeholder="0"
                className="w-full pl-12 p-5 rounded-2xl border dark:border-gray-800 bg-transparent dark:text-white text-3xl font-bold outline-none focus:ring-2 ring-blue-500 transition-all placeholder:text-gray-300 dark:placeholder:text-gray-700"
                value={amount === 0 ? "" : amount}
                onChange={(e) =>
                  setAmount(e.target.value === "" ? 0 : Number(e.target.value))
                }
                autoFocus
              />
            </div>
          </div>

          {/* Submit Actions */}
          <div className="grid grid-cols-1 gap-3 pt-2">
            {mode === "add" && (
              <button
                onClick={() => handleUpdateBalance("update")}
                className="w-full py-5 bg-blue-950 hover:bg-blue-900 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                Confirm Add <ArrowUpRight size={22} />
              </button>
            )}

            {mode === "deduct" && (
              <button
                onClick={() => handleUpdateBalance("update")}
                className="w-full py-5 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                Confirm Deduct <ArrowDownRight size={22} />
              </button>
            )}

            {mode === "set" && (
              <button
                onClick={() => handleUpdateBalance("update")}
                className="w-full py-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                Confirm Set Balance <Check size={22} />
              </button>
            )}

            <button
              onClick={() => handleUpdateBalance("clear")}
              className="w-full py-4 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all hover:bg-red-100 dark:hover:bg-red-900/40 active:scale-[0.98]"
            >
              Reset to 00 <RotateCcw size={18} />
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {historyLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="animate-spin text-blue-500" size={32} />
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
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-950 rounded-2xl border dark:border-gray-800/80 transition-all hover:scale-[1.01]"
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
                  <div className="text-right pl-4">
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
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
