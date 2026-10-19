import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import { collection, onSnapshot, doc, deleteDoc, query } from "firebase/firestore";
import { Plus, Loader2, Diamond, ChevronsRight, Edit2, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import UserLevelModal, { UserLevel } from "./UserLevelModal";

export default function UserLevelManager() {
  const [levels, setLevels] = useState<UserLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState<UserLevel | null>(null);
  const [selectedLevels, setSelectedLevels] = useState<Set<string>>(new Set());

  useEffect(() => {
    const q = query(collection(db, "userLevels"));
    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as UserLevel));
      const sortedData = data.sort((a, b) => a.level - b.level);
      setLevels(sortedData);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleDelete = async (id: string) => {
    toast((t) => (
      <div className="flex flex-col gap-3 min-w-[220px]">
        <p className="text-sm font-bold leading-tight">Are you sure you want to delete this level?</p>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              toast.dismiss(t.id);
              const loadingId = toast.loading("Deleting...");
              try {
                await deleteDoc(doc(db, "userLevels", id));
                toast.success("Level deleted", { id: loadingId });
              } catch {
                toast.error("Delete failed", { id: loadingId });
              }
            }}
            className="bg-red-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-transform active:scale-95"
          >
            Delete
          </button>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="bg-gray-200 text-gray-800 px-4 py-2 rounded-xl text-xs font-bold transition-transform active:scale-95"
          >
            Cancel
          </button>
        </div>
      </div>
    ), { duration: 6000, position: "top-right" });
  };

  const openEdit = (level: UserLevel) => {
    setEditingLevel(level);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingLevel(null);
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedLevels);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedLevels(newSet);
  };

  return (
    <div className="min-h-screen">
      <div className="flex flex-row justify-between items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold dark:text-white text-blue-600 flex items-center gap-2">
            Total Levels: <span className="border border-blue-500 px-3 py-1 rounded-xl">{levels.length}</span>
          </h1>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-5 py-2.5 transition-all font-bold text-sm shadow-sm active:scale-95"
        >
          <Plus size={18} className="mr-2" /> Add Level
        </button>
      </div>

      <div className="flex justify-between items-center mb-4">
        <p className="text-gray-500 text-sm">
          {selectedLevels.size} of {levels.length} selected
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-blue-500" size={40} />
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-xl overflow-hidden border dark:border-gray-800 shadow-sm">
          {levels.map((level) => {
            const isSelected = selectedLevels.has(level.id);
            return (
              <div
                key={level.id}
                className={`flex items-center justify-between p-4 border-b dark:border-gray-800 last:border-none transition-colors ${
                  isSelected ? "bg-red-50 dark:bg-red-950/20" : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                }`}
              >
                <div className="flex items-center gap-6 flex-1 cursor-pointer" onClick={() => toggleSelect(level.id)}>
                  <input
                    type="checkbox"
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    checked={isSelected}
                    onChange={() => {}}
                  />
                  <div className="flex items-center gap-4 flex-1">
                    <span className="font-bold text-blue-600 w-16">L.V.{level.level}</span>
                    <ChevronsRight size={18} className="text-blue-500" />
                    <div className="flex items-center text-blue-600 gap-1.5 ml-2 font-bold">
                      <Diamond size={16} />
                      <span>{level.diamondsRequired.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => openEdit(level)} className="p-2 text-gray-400 hover:text-blue-500 transition-colors">
                    <Edit2 size={18} />
                  </button>
                  <button onClick={() => handleDelete(level.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            );
          })}
          {levels.length === 0 && (
            <div className="p-8 text-center text-gray-500 font-bold">
              No levels configured yet.
            </div>
          )}
        </div>
      )}

      <UserLevelModal
        isOpen={isModalOpen}
        onClose={closeModal}
        editingLevel={editingLevel}
      />
    </div>
  );
}
