import { useState, useEffect } from "react";
import { X, UploadCloud, Loader2, Coins } from "lucide-react";
import { IdEntry } from "./IdEntryManager";

interface IdEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<IdEntry>, file: File | null) => void;
  isUploading: boolean;
  initialData?: IdEntry | null;
}

export const IdEntryModal = ({
  isOpen,
  onClose,
  onSubmit,
  isUploading,
  initialData,
}: IdEntryModalProps) => {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Vip");
  const [type, setType] = useState<string>("svga");
  const [tier, setTier] = useState<"free" | "premium">("free");
  const [price, setPrice] = useState<number>(0);
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setCategory(initialData.subCategory || "Vip");
      setType(initialData.type);
      setTier(initialData.tier || "free");
      setPrice(initialData.price ?? 0);
    } else {
      setName("");
      setCategory("Vip");
      setType("svga");
      setTier("free");
      setPrice(0);
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
            {initialData ? "Edit Entry" : "Add ID Entry"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-red-500"
          >
            <X size={24} />
          </button>
        </div>

        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit({ name, category, type, tier, price }, file);
          }}
        >
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase ml-1">
              Name
            </label>
            <input
              type="text"
              required
              placeholder="Entry name.."
              className="w-full mt-1 p-4 rounded-xl outline-none dark:text-white border dark:border-gray-800 text-black focus:border-blue-500 transition-all bg-transparent"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase ml-1">
              Category
            </label>
            <select
              className="w-full mt-1 p-4 rounded-xl outline-none dark:text-white border dark:border-gray-800 text-black cursor-pointer bg-transparent appearance-none"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option className="text-black" value="Vip">
                Vip
              </option>
              <option className="text-black" value="Luxury">
                Luxury
              </option>
              <option className="text-black" value="Special">
                Special
              </option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase ml-1">
                Tier
              </label>
              <select
                className="w-full mt-1 p-4 rounded-xl outline-none dark:text-white border dark:border-gray-800 text-black cursor-pointer bg-transparent appearance-none"
                value={tier}
                onChange={(e) => {
                  const val = e.target.value as "free" | "premium";
                  setTier(val);
                  if (val === "free") setPrice(0);
                }}
              >
                <option className="text-black" value="free">
                  Free
                </option>
                <option className="text-black" value="premium">
                  Premium
                </option>
              </select>
            </div>
            <div>
              <label
                className={`text-xs font-bold uppercase ml-1 ${isPremium ? "text-yellow-500" : "text-gray-400"}`}
              >
                Coin Price
              </label>
              <div
                className={`relative mt-1 flex items-center border rounded-xl transition-all ${
                  isPremium
                    ? "dark:border-yellow-600 border-yellow-400"
                    : "dark:border-gray-800 border-gray-200 opacity-50"
                }`}
              >
                <Coins
                  size={16}
                  className={`absolute left-3 ${isPremium ? "text-yellow-500" : "text-gray-400"}`}
                />
                <input
  type="number"
  min={0}
  disabled={!isPremium}
  placeholder="0"
  className={`w-full pl-9 pr-4 py-4 rounded-xl outline-none bg-transparent text-black dark:text-white transition-all ${
    !isPremium ? "cursor-not-allowed" : ""
  }`}
  value={isPremium ? (price === 0 ? "" : price) : ""}
  onChange={(e) => setPrice(e.target.value === "" ? 0 : Number(e.target.value))}
/>
              </div>
            </div>
          </div>

          <label className="mt-1 flex flex-col items-center justify-center w-full h-32 border-2 border-dashed dark:border-gray-800 rounded-xl cursor-pointer hover:transition-all">
            <UploadCloud className="text-gray-500 mb-2" />
            <span className="text-xs text-gray-400">
              {file
                ? file.name
                : initialData
                  ? "Change Asset (Optional)"
                  : `Select GIF/SVGA File`}
            </span>
            <input
              type="file"
              className="hidden"
              accept=".gif,.svga"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setFile(f);
                  const ext = f.name.split(".").pop()?.toLowerCase();
                  if (ext) setType(ext);
                } else {
                  setFile(null);
                }
              }}
            />
          </label>

          <button
            disabled={isUploading}
            className="w-full text-black h-14 rounded-xl font-bold bg-gray-200 hover:bg-gray-100 transition-all flex items-center justify-center dark:bg-blue-200 disabled:opacity-50 border"
          >
            {isUploading ? (
              <Loader2 className="animate-spin" size={24} />
            ) : (
              "Save Entry"
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
