import { useState, useEffect } from "react";
import { uploadFile } from "../../lib/upload";
import { db } from "../../lib/firebase";
import { collection, doc, addDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { Upload, Loader2, X, ImageIcon, Palette, Coins } from "lucide-react";
import toast from "react-hot-toast";
import { RoomTheme } from "./RoomSkinManager";

interface ThemeModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingTheme: RoomTheme | null;
}

export default function SkinModal({ onClose, editingTheme }: ThemeModalProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [name, setName] = useState(editingTheme?.name || "");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>(editingTheme?.imageURL || "");
  const [tier, setTier] = useState<"free" | "premium">(editingTheme?.tier || "free");
  const [price, setPrice] = useState<number>(editingTheme?.price ?? 0);

  useEffect(() => {
    if (editingTheme) {
      setName(editingTheme.name || "");
      setPreview(editingTheme.imageURL || "");
      setTier(editingTheme.tier || "free");
      setPrice(editingTheme.price ?? 0);
    } else {
      setName("");
      setPreview("");
      setTier("free");
      setPrice(0);
    }
    setSelectedFile(null);
  }, [editingTheme]);

  const isPremium = tier === "premium";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    if (!name || (!preview && !selectedFile)) {
      toast.error("Please fill all required fields");
      return;
    }

    setIsUploading(true);
    const tid = toast.loading(editingTheme ? "Updating Skin..." : "Uploading Skin...");

    try {
      let finalUrl = preview;

      if (selectedFile) {
        finalUrl = await uploadFile(selectedFile);
      }

      const payload = {
        name,
        imageURL: finalUrl,
        category: "RoomSkin",
        tier,
        price: isPremium ? price : 0,
        isActive: true,
        updatedAt: serverTimestamp(),
      };

      if (editingTheme) {
        await updateDoc(doc(db, "store", editingTheme.id), payload);
        toast.success("Skin updated", { id: tid });
      } else {
        await addDoc(collection(db, "store"), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        toast.success("New skin published", { id: tid });
      }

      onClose();
    } catch {
      toast.error("Action failed", { id: tid });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center dark:bg-black/70 bg-black/20 backdrop-blur-sm p-4 lg:pl-64 animate-in fade-in duration-200 mt-10">
      <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl relative animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-gray-400 hover:text-red-500 transition-colors"
        >
          <X size={24} />
        </button>

        <h3 className="text-2xl font-bold dark:text-white mb-8 flex items-center gap-3">
          <Palette size={24} className="text-blue-500" />
          {editingTheme ? "Edit Room Skin" : "New Room Skin"}
        </h3>

        <div className="space-y-6">
          <div
            onClick={() => document.getElementById("theme-upload")?.click()}
            className="aspect-video md:w-8/12 mx-auto border-4 border-dashed border-gray-200 dark:border-gray-800 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all group relative overflow-hidden"
          >
            {preview ? (
              <img src={preview} className="w-full h-full object-cover transition-transform group-hover:scale-105" alt="" />
            ) : (
              <div className="text-center">
                <ImageIcon className="text-gray-300 mx-auto mb-2" size={32} />
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Select Skin Background
                </span>
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <Upload className="text-white" />
            </div>
          </div>
          <input id="theme-upload" type="file" hidden onChange={handleFileChange} />

          <div className="space-y-4">
            <div>
              <label className="text-xs font-black text-gray-500 uppercase ml-1 tracking-wider">Skin Name</label>
              <input
                type="text"
                placeholder="Ex: Pink Galaxy"
                className="w-full mt-1.5 p-4 rounded-2xl border dark:border-gray-800 bg-transparent dark:text-white outline-none focus:ring-2 ring-blue-950 font-bold"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-black text-gray-500 uppercase ml-1 tracking-wider">Tier</label>
                <select
                  value={tier}
                  onChange={(e) => {
                    const val = e.target.value as "free" | "premium";
                    setTier(val);
                    if (val === "free") setPrice(0);
                  }}
                  className="w-full mt-1.5 p-4 rounded-2xl border dark:border-gray-800 bg-transparent dark:text-white outline-none focus:ring-2 ring-blue-950 font-bold appearance-none cursor-pointer"
                >
                  <option className="text-black" value="free">Free</option>
                  <option className="text-black" value="premium">Premium</option>
                </select>
              </div>
              <div>
                <label className={`text-xs font-black uppercase ml-1 tracking-wider ${isPremium ? "text-yellow-500" : "text-gray-400"}`}>
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
            className="w-full py-5 dark:bg-blue-950 dark:hover:bg-blue-900 dark:text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 text-black bg-gray-200 hover:bg-gray-100 border dark:border-blue-900"
          >
            {isUploading ? <Loader2 className="animate-spin" /> : editingTheme ? "Update Skin" : "Publish Skin"}
          </button>
        </div>
      </div>
    </div>
  );
}
