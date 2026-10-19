import { useState } from "react";
import { uploadFile } from "../../lib/upload";
import { db } from "../../lib/firebase";
import { collection, doc, addDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { Upload, Loader2, X, Image as ImageIcon, Coins } from "lucide-react";
import toast from "react-hot-toast";
import { LevelBadge } from "./LevelBadgeManager";

interface BadgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingBadge: LevelBadge | null;
}

export default function BadgeModal({ onClose, editingBadge }: BadgeModalProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [level, setLevel] = useState(editingBadge?.level.toString() || "");
  const [name, setName] = useState(editingBadge?.name || "");
  const [tier, setTier] = useState<"free" | "premium">(editingBadge?.tier || "free");
  const [price, setPrice] = useState<number>(editingBadge?.price ?? 0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>(editingBadge?.imageURL || "");

  const isPremium = tier === "premium";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    if (!level || (!preview && !selectedFile)) {
      toast.error("Please provide level and image");
      return;
    }

    setIsUploading(true);
    const tid = toast.loading(editingBadge ? "Updating..." : "Uploading...");

    try {
      let finalUrl = editingBadge?.imageURL || "";

      if (selectedFile) {
        finalUrl = await uploadFile(selectedFile);
      }

      const payload = {
        level: Number(level),
        name: name || `Level ${level}`,
        imageURL: finalUrl,
        category: "LevelBadge",
        tier,
        price: isPremium ? price : 0,
        isActive: true,
        updatedAt: serverTimestamp(),
      };

      if (editingBadge) {
        await updateDoc(doc(db, "store", editingBadge.id), payload);
        toast.success("Badge updated", { id: tid });
      } else {
        await addDoc(collection(db, "store"), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        toast.success("Badge added", { id: tid });
      }

      onClose();
    } catch {
      toast.error("Action failed", { id: tid });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center dark:bg-black/70 backdrop-blur-sm p-4 lg:pl-64 bg-black/20">
      <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-red-500 transition-colors">
          <X size={24} />
        </button>

        <h3 className="text-2xl font-bold dark:text-white mb-8">
          {editingBadge ? "Edit Badge" : "Create New Badge"}
        </h3>

        <div className="space-y-6">
          <div
            onClick={() => document.getElementById("badge-upload")?.click()}
            className="aspect-square w-40 mx-auto border-4 border-dashed border-gray-200 dark:border-gray-800 rounded-[2.5rem] flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all group relative overflow-hidden"
          >
            {preview ? (
              <img src={preview} className="w-full h-full object-contain p-4 transition-transform group-hover:scale-110" alt="" />
            ) : (
              <div className="text-center">
                <ImageIcon className="text-gray-300 mx-auto mb-2" size={32} />
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Click to Upload PNG</span>
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <Upload className="text-white" />
            </div>
          </div>
          <input id="badge-upload" type="file" hidden accept="image/png" onChange={handleFileChange} />

          <div className="space-y-4">
            <div>
              <label className="text-xs font-black text-gray-500 uppercase ml-1">Target Level</label>
              <input
                type="number"
                placeholder="Ex: 5"
                className="w-full mt-1.5 p-4 rounded-2xl border dark:border-gray-800 bg-transparent dark:text-white outline-none focus:ring-2 ring-blue-500 font-bold"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-black text-gray-500 uppercase ml-1">Badge Title</label>
              <input
                type="text"
                placeholder="Ex: Bronze Warrior"
                className="w-full mt-1.5 p-4 rounded-2xl border dark:border-gray-800 bg-transparent dark:text-white outline-none focus:ring-2 ring-blue-500 font-bold"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-black text-gray-500 uppercase ml-1">Tier</label>
                <select
                  className="w-full mt-1.5 p-4 rounded-2xl border dark:border-gray-800 bg-transparent dark:text-white outline-none focus:ring-2 ring-blue-500 font-bold appearance-none cursor-pointer"
                  value={tier}
                  onChange={(e) => {
                    const val = e.target.value as "free" | "premium";
                    setTier(val);
                    if (val === "free") setPrice(0);
                  }}
                >
                  <option className="text-black" value="free">Free</option>
                  <option className="text-black" value="premium">Premium</option>
                </select>
              </div>
              <div>
                <label className={`text-xs font-black uppercase ml-1 ${isPremium ? "text-yellow-500" : "text-gray-400"}`}>
                  Coin Price
                </label>
                <div className={`relative mt-1.5 flex items-center border rounded-2xl transition-all ${
                  isPremium
                    ? "dark:border-yellow-600 border-yellow-400"
                    : "dark:border-gray-800 border-gray-200 opacity-50"
                }`}>
                  <Coins size={16} className={`absolute left-3 ${isPremium ? "text-yellow-500" : "text-gray-400"}`} />
                  <input
                    type="number"
                    min={0}
                    disabled={!isPremium}
                    placeholder="0"
                    className={`w-full pl-9 pr-4 py-4 rounded-2xl outline-none bg-transparent dark:text-white font-bold transition-all ${
                      !isPremium ? "cursor-not-allowed" : ""
                    }`}
                    value={isPremium ? (price === 0 ? "" : price) : ""}
                    onChange={(e) => setPrice(e.target.value === "" ? 0 : Number(e.target.value))}
                  />
                </div>
              </div>
            </div>
          </div>

          <button
            disabled={isUploading}
            onClick={handleSave}
            className="w-full py-5 dark:bg-blue-950 dark:hover:bg-blue-900 dark:text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 bg-gray-200 hover:bg-gray-100 text-black border dark:border-blue-900"
          >
            {isUploading ? <Loader2 className="animate-spin" /> : editingBadge ? "Update Badge" : "Publish Badge"}
          </button>
        </div>
      </div>
    </div>
  );
}
