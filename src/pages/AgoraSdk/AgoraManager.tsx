import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import { doc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";
import { Loader2, Settings, Save, Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";

export default function AgoraManager() {
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [appCertificate, setAppCertificate] = useState("");
  const [appId, setAppId] = useState("");
  const [showAppId, setShowAppId] = useState(false);
  const [showAppCertificate, setShowAppCertificate] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "appSettings", "Agora_config"), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setAppCertificate(data.appCertificate || "");
        setAppId(data.appId || "");
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSave = async () => {
    if (!appCertificate || !appId) {
      toast.error("appCertificate and appId are required");
      return;
    }

    setIsSaving(true);
    const tid = toast.loading("Updating Agora Settings...");

    try {
      await setDoc(doc(db, "appSettings", "Agora_config"), {
        appCertificate,
        appId,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      toast.success("Agora settings updated", { id: tid });
    } catch {
      toast.error("Update failed", { id: tid });
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
    <div className="max-w-3xl mx-auto py-10 ">
      <div className="flex items-center gap-3 mb-10">
        <div className="p-3 bg-blue-500/10 rounded-2xl">
          <Settings className="text-blue-500" size={28} />
        </div>
        <div>
          <h1 className="text-2xl font-bold dark:text-white">Agora SDK Settings</h1>
          <p className="text-sm text-gray-500">Update Agora App ID and Certificate</p>
        </div>
      </div>

      <div className="space-y-8 bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border dark:border-gray-800 shadow-sm">
        <div className="space-y-6">
          <div>
            <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider ml-1">
              App ID
            </label>
            <div className="relative mt-2">
              <input
                type={showAppId ? "text" : "password"}
                placeholder="Enter Agora App ID"
                className="w-full p-4 pr-12 rounded-2xl border dark:border-gray-800 bg-gray-50 dark:bg-transparent dark:text-white outline-none focus:ring-2 ring-blue-500/20 font-bold transition-all"
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowAppId(!showAppId)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                {showAppId ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider ml-1">
              App Certificate
            </label>
            <div className="relative mt-2">
              <input
                type={showAppCertificate ? "text" : "password"}
                placeholder="Enter Agora App Certificate"
                className="w-full p-4 pr-12 rounded-2xl border dark:border-gray-800 bg-gray-50 dark:bg-transparent dark:text-white outline-none focus:ring-2 ring-blue-500/20 font-bold transition-all"
                value={appCertificate}
                onChange={(e) => setAppCertificate(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowAppCertificate(!showAppCertificate)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                {showAppCertificate ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
        </div>

        <button
          disabled={isSaving}
          onClick={handleSave}
          className="w-full py-5 dark:bg-blue-950 bg-gray-200 hover:bg-gray-100 dark:hover:bg-blue-900 dark:text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {isSaving ? (
            <Loader2 className="animate-spin" size={24} />
          ) : (
            <>
              <Save size={22} />
              <span>Save Agora Config</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
