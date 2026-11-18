import { useState, useEffect, FormEvent } from "react";
import { X, Loader2, Image as ImageIcon, Film, Sparkles } from "lucide-react";
import { Gift } from "./types";

interface GiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    data: Partial<Gift>,
    iconFile: File | null,
    animationFile: File | null,
    format: "svga" | "gif"
  ) => void;
  initialData?: Gift | null;
  initialFormat?: "svga" | "gif";
  isUploading: boolean;
}

const CATEGORIES = ["Lucky", "Luxury", "Romantic", "Event"];

export const GiftModal = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  initialFormat = "svga",
  isUploading,
}: GiftModalProps) => {
  const [formData, setFormData] = useState<Partial<Gift>>({
    name: "",
    price: "",
    category: "Lucky",
    tier: "free",
  });
  const [format, setFormat] = useState<"svga" | "gif">(initialFormat);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [animationFile, setAnimationFile] = useState<File | null>(null);
  const [gifPreviewUrl, setGifPreviewUrl] = useState<string>("");

  useEffect(() => {
    if (initialData) {
      const resolvedSubCat =
        initialData.subCategory && initialData.subCategory !== "Gift"
          ? initialData.subCategory
          : initialData.category && initialData.category !== "Gift"
            ? initialData.category
            : "Lucky";
      setFormData({ ...initialData, category: resolvedSubCat });

      const isGif =
        initialData.format === "gif" ||
        initialData.animationType === "gif" ||
        Boolean(initialData.imageURL?.toLowerCase().includes(".gif"));
      setFormat(isGif ? "gif" : "svga");
      if (isGif && initialData.imageURL) {
        setGifPreviewUrl(initialData.imageURL);
      } else {
        setGifPreviewUrl("");
      }
    } else {
      setFormData({ name: "", price: "", category: "Lucky", tier: "free" });
      setFormat(initialFormat || "svga");
      setGifPreviewUrl("");
    }
    setIconFile(null);
    setAnimationFile(null);
  }, [initialData, initialFormat, isOpen]);

  // Clean up object URLs on unmount/change
  useEffect(() => {
    return () => {
      if (gifPreviewUrl && gifPreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(gifPreviewUrl);
      }
    };
  }, [gifPreviewUrl]);

  if (!isOpen) return null;

  const isPremium = formData.tier === "premium";

  const handleAnimationChange = (file: File | null) => {
    setAnimationFile(file);
    if (file) {
      // Auto-detect format by extension
      const fileName = file.name.toLowerCase();
      if (fileName.endsWith(".gif")) {
        setFormat("gif");
        const url = URL.createObjectURL(file);
        setGifPreviewUrl(url);
      } else if (fileName.endsWith(".svga")) {
        setFormat("svga");
        setGifPreviewUrl("");
      }
    } else {
      setGifPreviewUrl("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md lg:pl-64 dark:bg-black/80 bg-black/40 overflow-y-auto">
      <div className="dark:bg-gray-900 bg-white w-full max-w-md rounded-[2.5rem] p-7 shadow-2xl relative border md:border-gray-100 dark:border-gray-800 my-auto">
        <div className="flex justify-between items-center mb-5">
          <div>
            <h2 className="text-xl font-black dark:text-white">
              {initialData ? "Edit Gift Asset" : "Deploy New Gift"}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Upload {format.toUpperCase()} animated gift
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full dark:text-white transition-colors hover:text-red-500"
          >
            <X size={20} />
          </button>
        </div>

        {/* Format Switcher Tab */}
        <div className="mb-4 p-1 bg-gray-100 dark:bg-gray-800/80 rounded-2xl flex gap-1 border border-gray-200/50 dark:border-gray-700/50">
          <button
            type="button"
            onClick={() => {
              setFormat("svga");
              setAnimationFile(null);
              setGifPreviewUrl("");
            }}
            className={`flex-1 py-2.5 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all ${
              format === "svga"
                ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            <Film size={15} />
            SVGA Gift (.svga)
          </button>
          <button
            type="button"
            onClick={() => {
              setFormat("gif");
              setAnimationFile(null);
              setGifPreviewUrl("");
            }}
            className={`flex-1 py-2.5 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all ${
              format === "gif"
                ? "bg-white dark:bg-gray-700 text-pink-600 dark:text-pink-400 shadow-sm"
                : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            <Sparkles size={15} />
            GIF Gift (.gif)
          </button>
        </div>

        <form
          className="space-y-4"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            onSubmit(formData, iconFile, animationFile, format);
          }}
        >
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 ml-1 uppercase tracking-wider">
              Gift Name
            </label>
            <input
              type="text"
              placeholder="e.g. Heart Rose / Luxury Car"
              required
              className="w-full p-3.5 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none dark:text-white border focus:border-blue-500 text-sm transition-all"
              value={formData.name || ""}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 ml-1 uppercase tracking-wider">
                Category
              </label>
              <select
                className="w-full p-3.5 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none dark:text-white border focus:border-blue-500 text-sm transition-all appearance-none cursor-pointer"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 ml-1 uppercase tracking-wider">
                Tier
              </label>
              <select
                className="w-full p-3.5 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none dark:text-white border focus:border-blue-500 text-sm transition-all appearance-none cursor-pointer"
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
            <label
              className={`text-[10px] font-black ml-1 uppercase tracking-wider ${
                isPremium ? "text-gray-400" : "text-gray-300 dark:text-gray-600"
              }`}
            >
              Coin Price {!isPremium && <span className="normal-case font-normal">(free tier)</span>}
            </label>
            <input
              type="number"
              placeholder="0"
              disabled={!isPremium}
              className={`w-full p-3.5 rounded-2xl outline-none font-mono border text-sm transition-all ${
                isPremium
                  ? "bg-gray-50 dark:bg-gray-800 dark:text-white border focus:border-blue-500 cursor-text"
                  : "bg-gray-100 dark:bg-gray-800/40 text-gray-400 dark:text-gray-600 border-gray-100 dark:border-gray-800 cursor-not-allowed"
              }`}
              value={isPremium ? formData.price || "" : 0}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            />
          </div>

          {/* Animation & Icon Upload Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Animation File (.svga or .gif) */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 ml-1 uppercase tracking-wider flex items-center gap-1">
                {format === "gif" ? (
                  <>
                    <Sparkles size={11} className="text-pink-500" />
                    GIF File (.gif)
                  </>
                ) : (
                  <>
                    <Film size={11} className="text-blue-500" />
                    SVGA File (.svga)
                  </>
                )}
              </label>
              <label
                className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-2xl cursor-pointer transition-all group overflow-hidden relative ${
                  format === "gif"
                    ? "border-pink-300 dark:border-pink-800/50 hover:bg-pink-50/50 dark:hover:bg-pink-950/20"
                    : "border-gray-200 dark:border-gray-700 hover:bg-blue-50/50 dark:hover:bg-blue-900/10"
                }`}
              >
                {gifPreviewUrl ? (
                  <div className="w-full h-full p-2 flex flex-col items-center justify-center">
                    <img
                      src={gifPreviewUrl}
                      alt="GIF Preview"
                      className="max-h-20 object-contain rounded-lg"
                    />
                    <span className="text-[10px] font-bold text-pink-600 dark:text-pink-400 mt-1 truncate max-w-[120px]">
                      {animationFile ? animationFile.name : "Current GIF"}
                    </span>
                  </div>
                ) : (
                  <>
                    {format === "gif" ? (
                      <Sparkles className="text-pink-400 group-hover:text-pink-500 transition-colors" />
                    ) : (
                      <Film className="text-gray-400 group-hover:text-blue-500 transition-colors" />
                    )}
                    <span className="text-xs text-gray-500 mt-2 font-medium px-2 text-center line-clamp-2">
                      {animationFile ? animationFile.name : `Select .${format}`}
                    </span>
                  </>
                )}
                <input
                  type="file"
                  className="hidden"
                  accept={format === "gif" ? ".gif,image/gif" : ".svga"}
                  onChange={(e) => handleAnimationChange(e.target.files?.[0] || null)}
                />
              </label>
            </div>

            {/* Icon File (PNG/JPG or optional for GIF) */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 ml-1 uppercase tracking-wider flex items-center justify-between">
                <span>Icon {format === "gif" ? "(Optional)" : "(PNG/JPG)"}</span>
              </label>
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl cursor-pointer hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all group overflow-hidden">
                <ImageIcon className="text-gray-400 group-hover:text-blue-500 transition-colors" />
                <span className="text-xs text-gray-500 mt-2 font-medium px-2 text-center line-clamp-2">
                  {iconFile
                    ? iconFile.name
                    : format === "gif"
                      ? "Auto from GIF or Pick Icon"
                      : "Select Icon Image"}
                </span>
                <input
                  type="file"
                  className="hidden"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={(e) => setIconFile(e.target.files?.[0] || null)}
                />
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={isUploading}
            className={`w-full h-14 rounded-2xl font-bold shadow transition-all mt-4 flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50 ${
              format === "gif"
                ? "bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white shadow-pink-500/25"
                : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/25"
            }`}
          >
            {isUploading ? (
              <Loader2 className="animate-spin" size={24} />
            ) : (
              <>
                {format === "gif" ? <Sparkles size={18} /> : <Film size={18} />}
                <span>
                  {initialData
                    ? "Update Gift Database"
                    : `Deploy ${format.toUpperCase()} Gift`}
                </span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
