import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { Loader2, Save, MessageSquare } from "lucide-react";
import toast from "react-hot-toast";

export default function CoinSupplier() {
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [number, setNumber] = useState("");

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "whatsappNumber", "Coinwhatsapp"), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        // Use exact 'Number' field name matching the Firestore screenshot
        setNumber(data.Number || "");
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSave = async () => {
    if (!number.trim()) {
      toast.error("WhatsApp Number is required");
      return;
    }

    setIsSaving(true);
    const tid = toast.loading("Updating WhatsApp Number...");

    try {
      await setDoc(doc(db, "whatsappNumber", "Coinwhatsapp"), {
        Number: number.trim(),
      });
      toast.success("WhatsApp Number updated", { id: tid });
    } catch (error) {
      toast.error("Update failed", { id: tid });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-pink-500" size={40} />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto py-10">
      <div className="flex items-center gap-3 mb-10">
        <div className="p-3 bg-pink-500/10 dark:bg-pink-500/20 rounded-2xl">
          <MessageSquare className="text-pink-500" size={28} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-rose-500 dark:text-rose-400">
            Coin Supplier Setting
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Update the WhatsApp number for the official Coin Supplier
          </p>
        </div>
      </div>

      <div className="space-y-8 rounded-3xl border border-gray-200/50 bg-white/70 dark:bg-[#140e1b]/60 backdrop-blur-xl dark:border-white/[0.08] p-8 shadow-xl">
        <div className="space-y-6">
          <div>
            <label className="text-[11px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">
              WhatsApp Number
            </label>
            <div className="relative mt-2">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">
                WhatsApp:
              </span>
              <input
                type="text"
                placeholder="e.g. 01744463419"
                className="w-full pl-24 pr-4 py-4 rounded-2xl border border-gray-200 dark:border-white/[0.08] bg-gray-50/50 dark:bg-white/[0.02] dark:text-white outline-none focus:ring-2 ring-pink-500/20 font-bold transition-all"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
              />
            </div>
            <p className="mt-2 text-xs text-gray-400 dark:text-gray-500 ml-1">
              This number will be shown in the app for users/resellers to contact for buying coins.
            </p>
          </div>
        </div>

        <button
          disabled={isSaving}
          onClick={handleSave}
          className="w-full py-5 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-rose-500/20"
        >
          {isSaving ? (
            <Loader2 className="animate-spin" size={24} />
          ) : (
            <>
              <Save size={22} />
              <span>Save Changes</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
