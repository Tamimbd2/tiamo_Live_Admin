import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import { doc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";
import { Loader2, Percent, Save, ArrowLeftRight } from "lucide-react";
import toast from "react-hot-toast";

export default function CommissionManager() {
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [adminCommission, setAdminCommission] = useState(0);
  const [agencyCommission, setAgencyCommission] = useState(0);
  const [hostBasicShare, setHostBasicShare] = useState(0);
  const [hostMinValidDays, setHostMinValidDays] = useState(0);
  const [exchangeRate, setExchangeRate] = useState(0);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "appSettings", "Commission_config"), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setAdminCommission(data.adminCommission ?? 0);
        setAgencyCommission(data.agencyCommission ?? 0);
        setHostBasicShare(data.hostBasicShare ?? 0);
        setHostMinValidDays(data.hostMinValidDays ?? 0);
        setExchangeRate(Number(data.exchangerate ?? 0));
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    const tid = toast.loading("Saving Commission Settings...");

    try {
      await setDoc(doc(db, "appSettings", "Commission_config"), {
        adminCommission: Number(adminCommission),
        agencyCommission: Number(agencyCommission),
        hostBasicShare: Number(hostBasicShare),
        hostMinValidDays: Number(hostMinValidDays),
        exchangerate: String(exchangeRate),
        updatedAt: serverTimestamp(),
      }, { merge: true });

      toast.success("Commission Settings updated!", { id: tid });
    } catch (e) {
      console.error(e);
      toast.error("Failed to update settings", { id: tid });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-gray-400" size={40} />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-10">
      <div className="flex items-center gap-3 mb-10">
        <div className="p-3 bg-purple-500/10 rounded-2xl">
          <Percent className="text-purple-500" size={28} />
        </div>
        <div>
          <h1 className="text-2xl font-bold dark:text-white">Commission Settings</h1>
          <p className="text-sm text-gray-500">Manage platform commission rates and host rules</p>
        </div>
      </div>

      <div className="space-y-8 bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border dark:border-gray-800 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider ml-1">
              Admin Commission (%)
            </label>
            <div className="relative mt-2">
              <input
                type="number"
                min="0"
                max="100"
                className="w-full p-4 rounded-2xl border dark:border-gray-800 bg-gray-50 dark:bg-transparent dark:text-white outline-none focus:ring-2 ring-purple-500/20 font-bold transition-all"
                value={adminCommission}
                onChange={(e) => setAdminCommission(Number(e.target.value))}
              />
              <Percent className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider ml-1">
              Agency Commission (%)
            </label>
            <div className="relative mt-2">
              <input
                type="number"
                min="0"
                max="100"
                className="w-full p-4 rounded-2xl border dark:border-gray-800 bg-gray-50 dark:bg-transparent dark:text-white outline-none focus:ring-2 ring-purple-500/20 font-bold transition-all"
                value={agencyCommission}
                onChange={(e) => setAgencyCommission(Number(e.target.value))}
              />
              <Percent className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider ml-1">
              Host Basic Share (%)
            </label>
            <div className="relative mt-2">
              <input
                type="number"
                min="0"
                max="100"
                className="w-full p-4 rounded-2xl border dark:border-gray-800 bg-gray-50 dark:bg-transparent dark:text-white outline-none focus:ring-2 ring-purple-500/20 font-bold transition-all"
                value={hostBasicShare}
                onChange={(e) => setHostBasicShare(Number(e.target.value))}
              />
              <Percent className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider ml-1">
              Host Min Valid Days For Withdraw
            </label>
            <input
              type="number"
              min="0"
              className="w-full mt-2 p-4 rounded-2xl border dark:border-gray-800 bg-gray-50 dark:bg-transparent dark:text-white outline-none focus:ring-2 ring-purple-500/20 font-bold transition-all"
              value={hostMinValidDays}
              onChange={(e) => setHostMinValidDays(Number(e.target.value))}
              placeholder="e.g. 15"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider ml-1">
              Exchange Rate (Coins → Currency)
            </label>
            <div className="relative mt-2">
              <input
                type="number"
                min="0"
                className="w-full p-4 pr-14 rounded-2xl border dark:border-gray-800 bg-gray-50 dark:bg-transparent dark:text-white outline-none focus:ring-2 ring-purple-500/20 font-bold transition-all"
                value={exchangeRate}
                onChange={(e) => setExchangeRate(Number(e.target.value))}
                placeholder="e.g. 95"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 text-gray-400">
                <ArrowLeftRight size={15} />
              </div>
            </div>
            <p className="text-[10px] text-gray-400 mt-1.5 ml-1">
              1 USD = {exchangeRate} Coins &nbsp;·&nbsp; Saved as string in Firestore (<code className="font-mono">exchangerate</code>)
            </p>
          </div>
        </div>

        <button
          disabled={isSaving}
          onClick={handleSave}
          className="w-full py-5 dark:bg-purple-900 bg-gray-200 hover:bg-gray-100 dark:hover:bg-purple-800 dark:text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {isSaving ? (
            <Loader2 className="animate-spin" size={24} />
          ) : (
            <>
              <Save size={22} />
              <span>Save Settings</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
