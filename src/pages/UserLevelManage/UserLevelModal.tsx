import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import { collection, doc, addDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { Loader2, X, Diamond } from "lucide-react";
import toast from "react-hot-toast";

export interface UserLevel {
  id: string;
  level: number;
  diamondsRequired: number;
}

interface UserLevelModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingLevel: UserLevel | null;
}

export default function UserLevelModal({ isOpen, onClose, editingLevel }: UserLevelModalProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [level, setLevel] = useState("");
  const [diamondsRequired, setDiamondsRequired] = useState("");

  useEffect(() => {
    if (editingLevel) {
      setLevel(editingLevel.level.toString());
      setDiamondsRequired(editingLevel.diamondsRequired.toString());
    } else {
      setLevel("");
      setDiamondsRequired("");
    }
  }, [editingLevel, isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!level || !diamondsRequired) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsUploading(true);
    const tid = toast.loading(editingLevel ? "Updating..." : "Creating...");

    try {
      const payload = {
        level: Number(level),
        diamondsRequired: Number(diamondsRequired),
        updatedAt: serverTimestamp(),
      };

      if (editingLevel) {
        await updateDoc(doc(db, "userLevels", editingLevel.id), payload);
        toast.success("Level updated", { id: tid });
      } else {
        await addDoc(collection(db, "userLevels"), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        toast.success("Level created", { id: tid });
      }

      onClose();
    } catch (error) {
      toast.error("Action failed", { id: tid });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center dark:bg-black/70 backdrop-blur-sm p-4 lg:pl-64 bg-black/20">
      <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-red-500 transition-colors">
          <X size={24} />
        </button>

        <div className="mb-8">
          <h3 className="text-3xl font-bold dark:text-white text-gray-900">
            {editingLevel ? "Edit Level" : "Create New Level"}
          </h3>
          <p className="text-sm text-gray-500 mt-2">Configure requirements for this progression tier.</p>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-black text-gray-500 uppercase ml-1">
                Level Number <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                placeholder="e.g. 5"
                className="w-full mt-1.5 p-4 rounded-2xl border dark:border-gray-800 bg-transparent dark:text-white outline-none focus:ring-2 ring-blue-500 font-bold"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
              />
              <p className="text-[10px] text-gray-400 mt-1 ml-1">Must be a unique integer.</p>
            </div>
            <div>
              <label className="text-xs font-black text-gray-500 uppercase ml-1">
                Diamonds Required <span className="text-red-500">*</span>
              </label>
              <div className="relative mt-1.5 flex items-center border dark:border-gray-800 border-gray-200 rounded-2xl transition-all focus-within:ring-2 focus-within:ring-blue-500">
                <Diamond size={18} className="absolute left-4 text-blue-500" />
                <input
                  type="number"
                  min={0}
                  placeholder="e.g. 500000"
                  className="w-full pl-11 pr-4 py-4 rounded-2xl outline-none bg-transparent dark:text-white font-bold"
                  value={diamondsRequired}
                  onChange={(e) => setDiamondsRequired(e.target.value)}
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-1 ml-1">Total spent diamonds to reach this level.</p>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              disabled={isUploading}
              onClick={handleSave}
              className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-blue-500/30"
            >
              {isUploading ? <Loader2 className="animate-spin" /> : editingLevel ? "Update Level" : "Save Level"}
            </button>
            <button
              onClick={onClose}
              className="flex-1 py-4 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-white text-gray-900 rounded-2xl font-bold text-base transition-all active:scale-[0.98]"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
