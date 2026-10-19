import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import { useAuth } from "../../lib/AuthProvider";
import {
  doc,
  runTransaction,
  collection,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import {
  ArrowUpRight,
  X,
  Gem,
  Loader2,
  Clock,
} from "lucide-react";
import toast from "react-hot-toast";

interface DiamondActionModalProps {
  onClose: () => void;
  currentDiamond: number;
}

interface HistoryItem {
  id: string;
  amount: number;
  adminEmail: string;
  timestamp: any;
}

export const DiamondActionModal = ({ onClose, currentDiamond }: DiamondActionModalProps) => {
  const { user: currentAdmin } = useAuth();
  const [panelTab, setPanelTab] = useState<"add" | "history">("add");
  const [amount, setAmount] = useState<number>(0);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const historyQuery = query(
        collection(db, "diamond_history"),
        orderBy("timestamp", "desc")
      );

      const snap = await getDocs(historyQuery);

      const items = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          amount: data.amount ?? 0,
          adminEmail: data.adminEmail ?? "System",
          timestamp: data.timestamp,
        };
      });

      setHistory(items);
    } catch (error) {
      console.error("Error fetching diamond history:", error);
      toast.error("Failed to load history");
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (panelTab === "history") {
      fetchHistory();
    }
  }, [panelTab]);

  const handleAddDiamond = async () => {
    if (amount <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    const tid = toast.loading("Adding diamonds...");

    try {
      const diamondRef = doc(db, "totaldiamond", "diamondcalculation");

      await runTransaction(db, async (transaction) => {
        const docSnap = await transaction.get(diamondRef);
        const currentBal = docSnap.exists()
          ? (Number(docSnap.data().totaldiamond) || 0)
          : 0;

        const newBalance = currentBal + amount;

        if (docSnap.exists()) {
          transaction.update(diamondRef, { totaldiamond: newBalance.toString() });
        } else {
          transaction.set(diamondRef, { totaldiamond: newBalance.toString() });
        }

        const logRef = doc(collection(db, "diamond_history"));
        transaction.set(logRef, {
          amount: amount,
          action: "add",
          adminUid: currentAdmin?.uid || "system",
          adminEmail: currentAdmin?.email || "system",
          timestamp: serverTimestamp()
        });
      });

      toast.success(`Successfully added ${amount} diamonds`, { id: tid });
      setAmount(0);
      onClose();
    } catch (error) {
      console.error("Diamond update error:", error);
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
    <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-[2.5rem] p-6 md:p-8 shadow-2xl overflow-hidden ring-1 ring-black/5 dark:ring-white/5 w-full max-w-md mx-auto relative z-50">
      {/* Modal Tab Header */}
      <div className="flex justify-between items-center mb-6 border-b dark:border-gray-800 pb-4">
        <div className="flex gap-4">
          <button
            onClick={() => setPanelTab("add")}
            className={`text-lg font-black tracking-tight transition-all pb-1.5 border-b-2 ${panelTab === "add"
                ? "text-blue-950 dark:text-white border-blue-500"
                : "text-gray-400 border-transparent hover:text-gray-600 dark:hover:text-gray-300"
              }`}
          >
            Add Diamond
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

      {panelTab === "add" ? (
        <div className="space-y-6">
          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-2xl flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-purple-100 dark:bg-purple-800 flex items-center justify-center shrink-0">
               <Gem className="text-purple-600 dark:text-purple-300" size={28} />
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-[10px] text-purple-500 font-black uppercase tracking-wider">Current Balance</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-3xl font-black text-purple-600 dark:text-purple-400 font-mono tracking-tight">
                  {currentDiamond.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-black text-gray-400 uppercase ml-1 tracking-wider">
              Add Diamonds
            </label>
            <div className="relative mt-2">
              <Gem className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-500" size={24} />
              <input
                type="number"
                min={0}
                placeholder="0"
                className="w-full pl-12 p-5 rounded-2xl border dark:border-gray-800 bg-transparent dark:text-white text-3xl font-bold outline-none focus:ring-2 ring-purple-500 transition-all placeholder:text-gray-300 dark:placeholder:text-gray-700"
                value={amount === 0 ? "" : amount}
                onChange={(e) =>
                  setAmount(e.target.value === "" ? 0 : Number(e.target.value))
                }
                autoFocus
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={handleAddDiamond}
              className="w-full py-5 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-purple-500/30"
            >
              Confirm Add <ArrowUpRight size={22} />
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {historyLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="animate-spin text-purple-500" size={32} />
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Syncing History...</p>
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
                    <div className="p-2.5 rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400">
                      <Gem size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-black dark:text-white tracking-wide uppercase">
                        Admin Top-up
                      </p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
                        Added by {item.adminEmail}
                      </p>
                      <p className="text-[9px] text-gray-400 dark:text-gray-500 mt-1 font-mono flex items-center gap-1">
                        <Clock size={10} /> {formatTime(item.timestamp)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right pl-4">
                    <span className="text-base font-black font-mono tracking-tight text-purple-500">
                      +{item.amount.toLocaleString()}
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
