import { useState, useEffect } from "react";
import { X, UploadCloud, Loader2 } from "lucide-react";
import { FrameAsset } from "./FrameManager";

interface FrameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<FrameAsset>, file: File | null) => void;
  isUploading: boolean;
  initialData?: FrameAsset | null;
}

export const FrameModal = ({ isOpen, onClose, onSubmit, isUploading, initialData }: FrameModalProps) => {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Basic");
  const [type, setType] = useState<"png" | "svga">("png");
  const [tier, setTier] = useState<"free" | "premium">("free");
  const [price, setPrice] = useState<number | "">("");
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setCategory(initialData.subCategory || "Basic");
      setType(initialData.type);
      setTier(initialData.tier || "free");
      setPrice(initialData.price === 0 ? "" : initialData.price || "");
    } else {
      setName("");
      setCategory("Basic");
      setType("png");
      setTier("free");
      setPrice("");
    }
    setFile(null);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const isPremium = tier === "premium";

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center p-4 backdrop-blur-sm lg:pl-64 dark:bg-black/80 bg-black/20 mt-10">
      <div className="w-full max-w-md rounded-[2rem] p-8 border dark:bg-gray-900 dark:border-gray-800 shadow-2xl bg-white">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold dark:text-white text-black">{initialData ? "Edit Frame" : "Add Frame Asset"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500"><X size={24} /></button>
        </div>

        <form 
          className="space-y-5" 
          onSubmit={(e) => { 
            e.preventDefault(); 
            onSubmit({ 
              name, 
              category, 
              type, 
              tier, 
              price: isPremium ? (Number(price) || 0) : 0 
            }, file); 
          }}
        >
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase ml-1">Name</label>
            <input
              type="text"
              required
              placeholder="Frame name.."
              className="w-full mt-1 p-4 rounded-xl outline-none dark:text-white border dark:border-gray-800 text-black bg-transparent"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase ml-1">Category</label>
              <select
                className="w-full mt-1 p-4 rounded-xl outline-none dark:text-white border dark:border-gray-800 text-black bg-transparent appearance-none"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option className="text-black" value="Basic">Basic</option>
                <option className="text-black" value="Premium">Premium</option>
                <option className="text-black" value="Event">Event</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase ml-1">File Type</label>
              <select
                className="w-full mt-1 p-4 rounded-xl outline-none dark:text-white border dark:border-gray-800 text-black bg-transparent appearance-none"
                value={type}
                onChange={(e) => setType(e.target.value as "png" | "svga")}
              >
                <option className="text-black" value="png">PNG</option>
                <option className="text-black" value="svga">SVGA</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase ml-1">Tier</label>
            <select
              className="w-full mt-1 p-4 rounded-xl outline-none dark:text-white border dark:border-gray-800 text-black bg-transparent appearance-none"
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
          </div>

          <div>
            <label className={`text-xs font-bold uppercase ml-1 ${isPremium ? "text-gray-500" : "text-gray-300 dark:text-gray-600"}`}>
              Coin Price {!isPremium && <span className="normal-case font-normal">(free tier)</span>}
            </label>
            <input
              type="number"
              placeholder="0"
              disabled={!isPremium}
              className={`w-full mt-1 p-4 rounded-xl outline-none border transition-all ${
                isPremium
                  ? "dark:border-gray-800 bg-transparent dark:text-white text-black cursor-text"
                  : "bg-gray-100 dark:bg-gray-800/40 text-gray-400 dark:text-gray-600 border-gray-100 dark:border-gray-800 cursor-not-allowed"
              }`}
              value={isPremium ? price : ""}
              onChange={(e) => setPrice(e.target.value === "" ? "" : Number(e.target.value))}
            />
          </div>

          <label className="mt-1 flex flex-col items-center justify-center w-full h-32 border-2 border-dashed dark:border-gray-800 rounded-xl cursor-pointer">
            <UploadCloud className="text-gray-500 mb-2" />
            <span className="text-xs text-gray-400">{file ? file.name : initialData ? "Change Asset (Optional)" : `Select ${type.toUpperCase()}`}</span>
            <input type="file" className="hidden" accept={type === "png" ? "image/png" : ".svga"} onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </label>

          <button disabled={isUploading} className="w-full text-black h-14 rounded-xl font-bold bg-gray-200 dark:bg-blue-200 disabled:opacity-50 border">
            {isUploading ? <Loader2 className="animate-spin mx-auto" /> : "Save Frame"}
          </button>
        </form>
      </div>
    </div>
  );
};
