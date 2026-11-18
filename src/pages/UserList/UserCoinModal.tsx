import React, { useState } from "react";
import { doc, runTransaction, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { User } from "./UserTable";
import { Coins, MinusCircle, PlusCircle, X, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

interface UserCoinModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onUserCoinsUpdated: (userId: string, newBalance: number) => void;
}

export default function UserCoinModal({
  isOpen,
  onClose,
  user,
  onUserCoinsUpdated,
}: UserCoinModalProps) {
  const [activeTab, setActiveTab] = useState<"deduct" | "add">("deduct");
  const [amount, setAmount] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  if (!isOpen || !user) return null;

  const currentCoins = Number(user.diamonds ?? user.balance ?? 0);
  const numAmount = Number(amount) || 0;
  const userName = user.displayName || user.fullName || user.name || "User";

  const remainingAfterDeduct = Math.max(0, currentCoins - numAmount);
  const totalAfterAdd = currentCoins + numAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (numAmount <= 0) {
      toast.error("Please enter a valid amount greater than 0");
      return;
    }

    if (activeTab === "deduct" && numAmount > currentCoins) {
      toast.error(`Cannot deduct ${numAmount.toLocaleString()} coins. User only has ${currentCoins.toLocaleString()} coins.`);
      return;
    }

    const actionText = activeTab === "deduct" ? "DEDUCT" : "ADD";
    if (
      !window.confirm(
        `Are you sure you want to ${actionText} ${numAmount.toLocaleString()} coins ${
          activeTab === "deduct" ? "from" : "to"
        } ${userName}?\n\nNew Balance will be: ${(activeTab === "deduct"
          ? remainingAfterDeduct
          : totalAfterAdd
        ).toLocaleString()} coins.`
      )
    ) {
      return;
    }

    setIsProcessing(true);
    const tid = toast.loading(`${activeTab === "deduct" ? "Deducting" : "Adding"} coins...`);

    try {
      let finalBal = 0;
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, "users", user.id);
        const userSnap = await transaction.get(userRef);

        if (!userSnap.exists()) {
          throw new Error("User document does not exist.");
        }

        const data = userSnap.data();
        const liveBal = Number(data.diamonds ?? data.balance ?? 0);

        if (activeTab === "deduct") {
          if (numAmount > liveBal) {
            throw new Error(`User currently only has ${liveBal.toLocaleString()} coins.`);
          }
          finalBal = Math.max(0, liveBal - numAmount);
        } else {
          finalBal = liveBal + numAmount;
        }

        transaction.update(userRef, {
          balance: finalBal,
          diamonds: finalBal,
          updatedAt: serverTimestamp(),
        });

        // Add to coin_history log collection
        const logRef = doc(collection(db, "coin_history"));
        transaction.set(logRef, {
          userId: user.id,
          userName: userName,
          amount: numAmount,
          action: activeTab, // "deduct" | "add"
          reason: note ? note.trim() : (activeTab === "deduct" ? "Admin Deduct (Extra coins reclaimed)" : "Admin Add"),
          adminUid: "admin",
          timestamp: serverTimestamp(),
        });
      });

      toast.success(
        `Successfully ${activeTab === "deduct" ? "deducted" : "added"} ${numAmount.toLocaleString()} coins ${
          activeTab === "deduct" ? "from" : "to"
        } ${userName}!`,
        { id: tid }
      );

      onUserCoinsUpdated(user.id, finalBal);
      onClose();
      setAmount("");
      setNote("");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to process transaction", { id: tid });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-500">
              <Coins size={24} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                Manage User Coins
              </h3>
              <p className="text-xs text-gray-500">
                Send or deduct coins directly for this user
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-xl transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex border-b border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-950/20 px-6 pt-3 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("deduct")}
            className={`flex items-center gap-2 pb-3 px-4 font-bold text-sm transition-all border-b-2 ${
              activeTab === "deduct"
                ? "border-red-500 text-red-600 dark:text-red-400"
                : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            }`}
          >
            <MinusCircle size={16} />
            Deduct Coins (কয়েন কেটে নিন)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("add")}
            className={`flex items-center gap-2 pb-3 px-4 font-bold text-sm transition-all border-b-2 ${
              activeTab === "add"
                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            }`}
          >
            <PlusCircle size={16} />
            Add / Send Coins
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* User Details Banner */}
          <div
            className={`p-4 rounded-2xl border flex items-center justify-between ${
              activeTab === "deduct"
                ? "bg-red-50/50 dark:bg-red-950/20 border-red-200/80 dark:border-red-900/40"
                : "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-900/40"
            }`}
          >
            <div className="flex items-center gap-3">
              <img
                src={user.photoUrl || user.avatar || user.photo || "/default-avatar.png"}
                alt=""
                className="w-12 h-12 rounded-full object-cover border-2 border-white dark:border-gray-800 shadow-sm"
              />
              <div>
                <p className="font-bold text-gray-900 dark:text-white text-base">
                  {userName}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  {user.displayId && (
                    <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                      ID: #{user.displayId}
                    </span>
                  )}
                  {Boolean(user.isCoinBlocked || user.coinBlocked) && (
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                      Coins Frozen
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">
                Current Coins
              </span>
              <span className="font-mono font-bold text-amber-600 dark:text-amber-400 text-base flex items-center gap-1 justify-end">
                <Coins size={16} className="text-amber-500" />
                {currentCoins.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
              {activeTab === "deduct" ? "Amount to Deduct (Coins)" : "Amount to Add (Coins)"}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                {activeTab === "deduct" ? (
                  <MinusCircle className="text-red-500" size={18} />
                ) : (
                  <PlusCircle className="text-emerald-500" size={18} />
                )}
              </div>
              <input
                type="number"
                required
                min="1"
                max={activeTab === "deduct" ? currentCoins : undefined}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={activeTab === "deduct" ? "e.g. 50000" : "e.g. 100000"}
                className={`w-full pl-11 pr-4 py-3.5 bg-gray-50 dark:bg-gray-800/60 border rounded-2xl outline-none font-mono font-bold text-lg dark:text-white transition-all ${
                  activeTab === "deduct"
                    ? "border-red-200 dark:border-red-900/50 focus:ring-2 focus:ring-red-500"
                    : "border-emerald-200 dark:border-emerald-900/50 focus:ring-2 focus:ring-emerald-500"
                }`}
              />
            </div>

            {/* Calculated Preview */}
            {numAmount > 0 && (
              <div className="mt-2 text-xs font-semibold flex justify-between px-1">
                <span className="text-gray-500">
                  {activeTab === "deduct" ? "Remaining Balance:" : "New Total Balance:"}
                </span>
                <span
                  className={`font-mono font-bold ${
                    activeTab === "deduct" && numAmount > currentCoins
                      ? "text-red-600"
                      : "text-emerald-600 dark:text-emerald-400"
                  }`}
                >
                  {(activeTab === "deduct" ? remainingAfterDeduct : totalAfterAdd).toLocaleString()}{" "}
                  coins
                </span>
              </div>
            )}
          </div>

          {/* Reason / Note Input */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
              Reason / Note {activeTab === "deduct" ? "(Required for deduction)" : "(Optional)"}
            </label>
            <input
              type="text"
              required={activeTab === "deduct"}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                activeTab === "deduct"
                  ? "e.g. Extra coins given by mistake / reclaimed"
                  : "e.g. Manual top-up by admin"
              }
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 dark:text-white text-sm transition-all"
            />
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={
                isProcessing ||
                numAmount <= 0 ||
                (activeTab === "deduct" && numAmount > currentCoins) ||
                (activeTab === "deduct" && !note.trim())
              }
              className={`w-full py-4 text-white rounded-2xl font-bold text-base transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                activeTab === "deduct"
                  ? "bg-red-600 hover:bg-red-700 shadow-red-500/25 active:scale-[0.98]"
                  : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/25 active:scale-[0.98]"
              }`}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  <span>Processing...</span>
                </>
              ) : activeTab === "deduct" ? (
                <>
                  <MinusCircle size={20} />
                  <span>Confirm Coin Deduction</span>
                </>
              ) : (
                <>
                  <PlusCircle size={20} />
                  <span>Confirm Coin Transfer</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
