import { useState, useEffect, FormEvent } from "react";
import { X, Loader2, Image as ImageIcon, Film } from "lucide-react";
import { Gift } from "./types";

interface GiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Gift>, iconFile: File | null, svgaFile: File | null) => void;
  initialData?: Gift | null;
  isUploading: boolean;
}

const CATEGORIES = ["Lucky", "Luxury", "Romantic", "Event"];

export const GiftModal = ({ isOpen, onClose, onSubmit, initialData, isUploading }: GiftModalProps) => {
  const [formData, setFormData] = useState<Partial<Gift>>({
    name: "",
    price: "",
    category: "Lucky",
    tier: "free",
  });
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [svgaFile, setSvgaFile] = useState<File | null>(null);

  useEffect(() => {
    if (initialData) {
      setFormData({ ...initialData });
    } else {
      setFormData({ name: "", price: "", category: "Lucky", tier: "free" });
    }
    setIconFile(null);
    setSvgaFile(null);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const isPremium = formData.tier === "premium";

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center p-4 backdrop-blur-md lg:pl-64 dark:bg-black/80 bg-black/20">
      <div className="dark:bg-gray-900 bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl relative border md:border-gray-100 dark:border-gray-800">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black dark:text-white">{initialData ? "Edit Asset" : "New Asset"}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full dark:text-white transition-colors hover:text-red-500">
            <X size={20} />
          </button>
        </div>

        <form className="space-y-4" onSubmit={(e: FormEvent) => { e.preventDefault(); onSubmit(formData, iconFile, svgaFile); }}>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 ml-1 uppercase tracking-wider">Asset Identity</label>
            <input
              type="text"
              placeholder="e.g. Diamond Ring"
              required
              className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none dark:text-white border focus:border-blue-500 transition-all"
              value={formData.name || ""}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 ml-1 uppercase tracking-wider">Collection Category</label>
              <select
                className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none dark:text-white border focus:border-blue-500 transition-all appearance-none cursor-pointer"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 ml-1 uppercase tracking-wider">Tier</label>
              <select
                className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none dark:text-white border focus:border-blue-500 transition-all appearance-none cursor-pointer"
                value={formData.tier || "free"}
                onChange={(e) => {
                  const tier = e.target.value as "free" | "premium";
                  setFormData({ ...formData, tier, price: tier === "free" ? 0 : formData.price });
                }}
              >
                <option value="free">Free</option>
                <option value="premium">Premium</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className={`text-[10px] font-black ml-1 uppercase tracking-wider ${isPremium ? "text-gray-400" : "text-gray-300 dark:text-gray-600"}`}>
              Coin Price {!isPremium && <span className="normal-case font-normal">(free tier)</span>}
            </label>
            <input
              type="number"
              placeholder="0"
              disabled={!isPremium}
              className={`w-full p-4 rounded-2xl outline-none font-mono border transition-all ${
                isPremium
                  ? "bg-gray-50 dark:bg-gray-800 dark:text-white border focus:border-blue-500 cursor-text"
                  : "bg-gray-100 dark:bg-gray-800/40 text-gray-400 dark:text-gray-600 border-gray-100 dark:border-gray-800 cursor-not-allowed"
              }`}
              value={isPremium ? (formData.price || "") : 0}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 ml-1 uppercase tracking-wider">Icon Image (PNG/JPG)</label>
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl cursor-pointer hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all group">
                <ImageIcon className="text-gray-400 group-hover:text-blue-500 transition-colors" />
                <span className="text-xs text-gray-500 mt-2 font-medium px-4 text-center line-clamp-1">
                  {iconFile ? iconFile.name : `Select Image`}
                </span>
                <input type="file" className="hidden" accept="image/*" onChange={(e) => setIconFile(e.target.files?.[0] || null)} />
              </label>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 ml-1 uppercase tracking-wider">SVGA Animation</label>
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl cursor-pointer hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all group">
                <Film className="text-gray-400 group-hover:text-blue-500 transition-colors" />
                <span className="text-xs text-gray-500 mt-2 font-medium px-4 text-center line-clamp-1">
                  {svgaFile ? svgaFile.name : `Select .svga`}
                </span>
                <input type="file" className="hidden" accept=".svga" onChange={(e) => setSvgaFile(e.target.files?.[0] || null)} />
              </label>
            </div>
          </div>

          <button
            disabled={isUploading}
            className="w-full dark:bg-blue-200 h-14 rounded-2xl font-semibold shadow shadow-blue-500/25 bg-gray-200 text-black disabled:bg-gray-400 transition-all mt-4 hover:bg-gray-100 flex items-center justify-center"
          >
            {isUploading ? <Loader2 className="animate-spin" size={24} /> : initialData ? "Update Database" : "Deploy Asset"}
          </button>
        </form>
      </div>
    </div>
  );
};
