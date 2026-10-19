import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import { collection, onSnapshot, doc, setDoc, query, limit, updateDoc } from "firebase/firestore";
import { Loader2, Bell, Save } from "lucide-react";
import toast from "react-hot-toast";

export default function NoticeManager() {
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [noticeText, setNoticeText] = useState("");
  const [docId, setDocId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "noticetext"), limit(1));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const docSnap = snapshot.docs[0];
        setDocId(docSnap.id);
        setNoticeText(docSnap.data().text || "");
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSave = async () => {
    if (!noticeText.trim()) {
      toast.error("Notice text cannot be empty");
      return;
    }

    setIsSaving(true);
    const tid = toast.loading("Updating Notice...");

    try {
      if (docId) {
        await updateDoc(doc(db, "noticetext", docId), {
          text: noticeText,
        });
      } else {
        // Create new if none exists
        const newDocRef = doc(collection(db, "noticetext"));
        await setDoc(newDocRef, {
          text: noticeText,
        });
        setDocId(newDocRef.id);
      }

      toast.success("Notice updated", { id: tid });
    } catch (e) {
      console.error(e);
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
    <div className="max-w-3xl mx-auto py-10">
      <div className="flex items-center gap-3 mb-10">
        <div className="p-3 bg-blue-500/10 rounded-2xl">
          <Bell className="text-blue-500" size={28} />
        </div>
        <div>
          <h1 className="text-2xl font-bold dark:text-white">Notice Management</h1>
          <p className="text-sm text-gray-500">Update the scrolling notice text in the app</p>
        </div>
      </div>

      <div className="space-y-8 bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border dark:border-gray-800 shadow-sm">
        <div className="space-y-6">
          <div>
            <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider ml-1">
              Notice Text
            </label>
            <textarea
              rows={4}
              placeholder="Enter notice text here..."
              className="w-full mt-2 p-4 rounded-2xl border dark:border-gray-800 bg-gray-50 dark:bg-transparent dark:text-white outline-none focus:ring-2 ring-blue-500/20 font-medium transition-all"
              value={noticeText}
              onChange={(e) => setNoticeText(e.target.value)}
            />
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
              <span>Update Notice</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
