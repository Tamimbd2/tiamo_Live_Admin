import { useState, useEffect } from "react";
import { X, UploadCloud, Loader2 } from "lucide-react";

interface Emoji {
  id: string;
  name: string;
  imageURL: string;
  category: string;
  subCategory?: string;
  price?: number;
  tier?: "free" | "premium";
}

interface EmojiModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Emoji>, file: File | null) => void;
  isUploading: boolean;
  initialData?: Emoji | null;
}

export const EmojiModal = ({ isOpen, onClose, onSubmit, isUploading, initialData }: EmojiModalProps) => {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Faces");
  const [price, setPrice] = useState<number | "">("");
  const [file, setFile] = useState<File | null>(null);
  const [tier, setTier] = useState<"free" | "premium">("free");

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setCategory(initialData.subCategory || "Faces");
      setPrice(initialData.price === 0 ? "" : initialData.price || "");
      setTier(initialData.tier || "free");
    } else {
      setName("");
      setCategory("Faces");
      setPrice("");
      setTier("free");
    }
    setFile(null);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const isPremium = tier === "premium";

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center p-4 backdrop-blur-sm lg:pl-64 dark:bg-black/80 bg-black/20">
      <div className="w-full max-w-md rounded-[2rem] p-8 border dark:bg-gray-900 dark:border-gray-800 shadow-2xl bg-white">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold dark:text-white text-black">
            {initialData ? "Edit Emoji" : "Add Emoji"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500">
            <X size={24} />
          </button>
        </div>
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit({ name, category, price: isPremium ? (Number(price) || 0) : 0, tier }, file);
          }}
        >
          <input
            type="text"
            required
            placeholder="Name"
            className="w-full p-4 rounded-xl border dark:border-gray-800 bg-transparent text-black dark:text-white outline-none"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <select
            className="w-full p-4 rounded-xl border dark:border-gray-800 bg-transparent text-black dark:text-white outline-none"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option className="text-black" value="Faces">Faces</option>
            <option className="text-black" value="Symbols">Symbols</option>
            <option className="text-black" value="Nature">Nature</option>
            <option className="text-black" value="Gestures">Gestures</option>
            <option className="text-black" value="Celebration">Celebration</option>
          </select>

          <select
            className="w-full p-4 rounded-xl border dark:border-gray-800 bg-transparent text-black dark:text-white outline-none"
            value={tier}
            onChange={(e) => {
              const t = e.target.value as "free" | "premium";
              setTier(t);
              if (t === "free") setPrice("");
            }}
          >
            <option className="text-black" value="free">Free</option>
            <option className="text-black" value="premium">Premium</option>
          </select>

          <div>
            <label className={`text-[10px] font-black ml-1 uppercase tracking-wider ${isPremium ? "text-gray-400" : "text-gray-300 dark:text-gray-600"}`}>
              Coin Price {!isPremium && <span className="normal-case font-normal">(free tier)</span>}
            </label>
            <input
              type="number"
              placeholder="0"
              disabled={!isPremium}
              className={`w-full mt-1 p-4 rounded-xl border outline-none transition-all ${
                isPremium
                  ? "dark:border-gray-800 bg-transparent text-black dark:text-white cursor-text"
                  : "bg-gray-100 dark:bg-gray-800/40 text-gray-400 dark:text-gray-600 border-gray-100 dark:border-gray-800 cursor-not-allowed"
              }`}
              value={isPremium ? price : ""}
              onChange={(e) => setPrice(e.target.value === "" ? "" : Number(e.target.value))}
            />
          </div>

          <div>
            <label className="mt-1 flex flex-col items-center justify-center w-full h-32 border-2 border-dashed dark:border-gray-800 rounded-xl cursor-pointer">
              <UploadCloud className="text-gray-500 mb-2" />
              <span className="text-xs text-gray-400">
                {file ? file.name : initialData ? "Change Image (Optional)" : "Select Image"}
              </span>
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </label>
          </div>

          <button
            disabled={isUploading}
            className="w-full h-14 rounded-xl font-bold bg-black text-white dark:bg-white dark:text-black disabled:opacity-50"
          >
            {isUploading ? <Loader2 className="animate-spin mx-auto" /> : "Save Changes"}
          </button>
        </form>
      </div>
    </div>
  );
};
