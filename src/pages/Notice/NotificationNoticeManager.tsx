import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { Loader2, BellRing, Plus, Edit2, Trash2, X, Save, Copy, ArrowUp, ArrowDown } from "lucide-react";
import toast from "react-hot-toast";

export default function NotificationNoticeManager() {
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notices, setNotices] = useState<string[]>([]);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [currentText, setCurrentText] = useState("");

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "appSettings", "notificationnotice"), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (Array.isArray(data.notification)) {
          setNotices(data.notification);
        } else {
          setNotices([]);
        }
      } else {
        setNotices([]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const openAddModal = () => {
    setEditingIndex(null);
    setCurrentText("");
    setIsModalOpen(true);
  };

  const openEditModal = (index: number) => {
    setEditingIndex(index);
    setCurrentText(notices[index]);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentText("");
    setEditingIndex(null);
  };

  const saveToFirestore = async (newNotices: string[], successMessage: string) => {
    setIsSaving(true);
    const tid = toast.loading("Saving...");
    try {
      await setDoc(doc(db, "appSettings", "notificationnotice"), {
        notification: newNotices,
      }, { merge: true });
      toast.success(successMessage, { id: tid });
      return true;
    } catch (error) {
      console.error(error);
      toast.error("Failed to save changes", { id: tid });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    const text = currentText.trim();
    if (!text) {
      toast.error("Notice text cannot be empty");
      return;
    }

    const newNotices = [...notices];
    if (editingIndex !== null) {
      newNotices[editingIndex] = text;
    } else {
      newNotices.push(text);
    }

    const success = await saveToFirestore(
      newNotices,
      editingIndex !== null ? "Notice updated successfully" : "Notice added successfully"
    );

    if (success) {
      closeModal();
    }
  };

  const handleDelete = (index: number) => {
    toast((t) => (
      <div className="flex flex-col gap-3 min-w-[250px] p-1">
        <div>
          <p className="text-sm font-bold text-gray-800 dark:text-gray-200">Delete Notice?</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">This action cannot be undone.</p>
        </div>
        <div className="flex justify-end gap-2 mt-1">
          <button
            onClick={() => toast.dismiss(t.id)}
            className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
          >
            Cancel
          </button>
          <button
            onClick={async () => {
              toast.dismiss(t.id);
              const newNotices = notices.filter((_, i) => i !== index);
              await saveToFirestore(newNotices, "Notice deleted successfully");
            }}
            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95"
          >
            Delete
          </button>
        </div>
      </div>
    ), { duration: 5000 });
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const moveUp = async (index: number) => {
    if (index === 0) return;
    const newNotices = [...notices];
    const temp = newNotices[index];
    newNotices[index] = newNotices[index - 1];
    newNotices[index - 1] = temp;
    await saveToFirestore(newNotices, "Order updated");
  };

  const moveDown = async (index: number) => {
    if (index === notices.length - 1) return;
    const newNotices = [...notices];
    const temp = newNotices[index];
    newNotices[index] = newNotices[index + 1];
    newNotices[index + 1] = temp;
    await saveToFirestore(newNotices, "Order updated");
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-gray-400" size={40} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-500/10 rounded-2xl">
            <BellRing className="text-blue-500" size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold dark:text-white">Notification Notice</h1>
            <p className="text-sm text-gray-500">Manage multiple notification notices</p>
          </div>
        </div>
        <button
          onClick={openAddModal}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all active:scale-95 shadow-sm shadow-blue-500/20"
        >
          <Plus size={18} />
          Add Notice
        </button>
      </div>

      {notices.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2.5rem] p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <BellRing className="text-gray-400" size={28} />
          </div>
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">No Notices Found</h3>
          <p className="text-gray-500 mb-6">You haven't added any notification notices yet.</p>
          <button
            onClick={openAddModal}
            className="bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 px-6 py-3 rounded-xl font-bold transition-all active:scale-95 inline-flex items-center gap-2"
          >
            <Plus size={18} />
            Create First Notice
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {notices.map((notice, index) => (
            <div key={index} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row gap-4 md:items-start group">
              <div className="flex-shrink-0 mt-1">
                <div className="w-8 h-8 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center font-bold text-sm">
                  {index + 1}
                </div>
              </div>
              <div className="flex-1">
                <p className="text-gray-800 dark:text-gray-200 font-medium whitespace-pre-wrap leading-relaxed">{notice}</p>
              </div>
              <div className="flex items-center gap-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity self-end md:self-auto shrink-0">
                <button
                  onClick={() => moveUp(index)}
                  disabled={index === 0}
                  className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-gray-300 rounded-lg transition-all disabled:opacity-30"
                  title="Move Up"
                >
                  <ArrowUp size={16} />
                </button>
                <button
                  onClick={() => moveDown(index)}
                  disabled={index === notices.length - 1}
                  className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-gray-300 rounded-lg transition-all disabled:opacity-30"
                  title="Move Down"
                >
                  <ArrowDown size={16} />
                </button>
                <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1"></div>
                <button
                  onClick={() => handleCopy(notice)}
                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 dark:hover:text-blue-400 rounded-lg transition-all"
                  title="Copy"
                >
                  <Copy size={16} />
                </button>
                <button
                  onClick={() => openEditModal(index)}
                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 dark:hover:text-blue-400 rounded-lg transition-all"
                  title="Edit"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => handleDelete(index)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 dark:hover:text-red-400 rounded-lg transition-all"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeModal}></div>
          <div className="relative bg-white dark:bg-gray-900 w-full max-w-lg rounded-[2rem] shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden transform transition-all">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-xl font-bold dark:text-white">
                {editingIndex !== null ? "Edit Notice" : "Add New Notice"}
              </h3>
              <button
                onClick={closeModal}
                className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-full transition-all"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <div className="mb-6">
                <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider ml-1 mb-2 block">
                  Notice Text
                </label>
                <textarea
                  rows={4}
                  placeholder="Enter notice text here..."
                  className="w-full p-4 rounded-2xl border dark:border-gray-800 bg-gray-50 dark:bg-gray-950/50 dark:text-white outline-none focus:ring-2 ring-blue-500/20 font-medium transition-all"
                  value={currentText}
                  onChange={(e) => setCurrentText(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={closeModal}
                  className="flex-1 py-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-2xl font-bold transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <Save size={18} />
                  )}
                  {editingIndex !== null ? "Update" : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
