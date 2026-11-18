import { useState, useEffect, useRef, FormEvent } from "react";
import {
  X,
  Loader2,
  Image as ImageIcon,
  Film,
  Sparkles,
  Volume2,
  Play,
  Pause,
} from "lucide-react";
import { Gift } from "./types";
import toast from "react-hot-toast";

interface GiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    data: Partial<Gift>,
    iconFile: File | null,
    animationFile: File | null,
    format: "svga" | "gif",
    soundFile: File | null
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
  const [duration, setDuration] = useState<string>("4");
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [animationFile, setAnimationFile] = useState<File | null>(null);
  const [gifPreviewUrl, setGifPreviewUrl] = useState<string>("");

  // Sound / Audio state
  const [soundFile, setSoundFile] = useState<File | null>(null);
  const [soundPreviewUrl, setSoundPreviewUrl] = useState<string>("");
  const [isPlayingSound, setIsPlayingSound] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
      setDuration(
        initialData.duration != null
          ? String(initialData.duration)
          : isGif
            ? "4"
            : "10"
      );

      if (isGif && initialData.imageURL) {
        setGifPreviewUrl(initialData.imageURL);
      } else {
        setGifPreviewUrl("");
      }

      const existingSound =
        initialData.soundURL || initialData.soundUrl || "";
      setSoundPreviewUrl(existingSound);
    } else {
      setFormData({ name: "", price: "", category: "Lucky", tier: "free" });
      const defFormat = initialFormat || "svga";
      setFormat(defFormat);
      setDuration(defFormat === "gif" ? "4" : "10");
      setGifPreviewUrl("");
      setSoundPreviewUrl("");
    }
    setIconFile(null);
    setAnimationFile(null);
    setSoundFile(null);
    setIsPlayingSound(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  }, [initialData, initialFormat, isOpen]);

  // Clean up object URLs on unmount/change
  useEffect(() => {
    return () => {
      if (gifPreviewUrl && gifPreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(gifPreviewUrl);
      }
      if (soundPreviewUrl && soundPreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(soundPreviewUrl);
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [gifPreviewUrl, soundPreviewUrl]);

  if (!isOpen) return null;

  const isPremium = formData.tier === "premium";

  const handleAnimationChange = (file: File | null) => {
    setAnimationFile(file);
    if (file) {
      const fileName = file.name.toLowerCase();
      if (fileName.endsWith(".gif")) {
        setFormat("gif");
        setDuration("4");
        const url = URL.createObjectURL(file);
        setGifPreviewUrl(url);
      } else if (fileName.endsWith(".svga")) {
        setFormat("svga");
        setDuration("10");
        setGifPreviewUrl("");
      }
    } else {
      setGifPreviewUrl("");
    }
  };

  const handleSoundChange = (file: File | null) => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlayingSound(false);
    }
    setSoundFile(file);
    if (file) {
      const url = URL.createObjectURL(file);
      setSoundPreviewUrl(url);
    } else {
      setSoundPreviewUrl(initialData?.soundURL || initialData?.soundUrl || "");
    }
  };

  const handleRemoveSound = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlayingSound(false);
    }
    setSoundFile(null);
    setSoundPreviewUrl("");
    setFormData((prev) => ({ ...prev, soundURL: "", soundUrl: "" }));
  };

  const togglePlaySound = () => {
    if (!soundPreviewUrl) return;
    if (isPlayingSound && audioRef.current) {
      audioRef.current.pause();
      setIsPlayingSound(false);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(soundPreviewUrl);
      audioRef.current = audio;
      audio.onended = () => setIsPlayingSound(false);
      audio.onerror = () => {
        setIsPlayingSound(false);
        toast.error("Failed to play audio preview");
      };
      audio.play().catch(() => setIsPlayingSound(false));
      setIsPlayingSound(true);
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
              Upload {format.toUpperCase()} animated gift & sound
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
              setDuration("10");
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
              setDuration("4");
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
          className="space-y-3.5"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            onSubmit(
              {
                ...formData,
                duration: Number(duration) || (format === "gif" ? 4 : 10),
                soundURL: soundPreviewUrl ? (formData.soundURL || formData.soundUrl || "") : "",
                soundUrl: soundPreviewUrl ? (formData.soundURL || formData.soundUrl || "") : "",
              },
              iconFile,
              animationFile,
              format,
              soundFile
            );
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
              className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none dark:text-white border focus:border-blue-500 text-sm transition-all"
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
                className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none dark:text-white border focus:border-blue-500 text-sm transition-all appearance-none cursor-pointer"
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
                className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none dark:text-white border focus:border-blue-500 text-sm transition-all appearance-none cursor-pointer"
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

          {/* Coin Price & Display Duration Grid */}
          <div className="grid grid-cols-2 gap-3">
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
                className={`w-full p-3 rounded-2xl outline-none font-mono border text-sm transition-all ${
                  isPremium
                    ? "bg-gray-50 dark:bg-gray-800 dark:text-white border focus:border-blue-500 cursor-text"
                    : "bg-gray-100 dark:bg-gray-800/40 text-gray-400 dark:text-gray-600 border-gray-100 dark:border-gray-800 cursor-not-allowed"
                }`}
                value={isPremium ? formData.price || "" : 0}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 ml-1 uppercase tracking-wider flex items-center justify-between">
                <span>Duration</span>
                <span className="text-pink-600 dark:text-pink-400 font-bold">{duration || (format === "gif" ? 4 : 10)}s</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="30"
                  placeholder={format === "gif" ? "4" : "10"}
                  className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none dark:text-white border focus:border-blue-500 text-sm font-mono transition-all pr-12"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                />
                <span className="absolute right-3.5 top-3 text-xs font-bold text-gray-400 pointer-events-none">
                  sec
                </span>
              </div>
            </div>
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
                className={`flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-2xl cursor-pointer transition-all group overflow-hidden relative ${
                  format === "gif"
                    ? "border-pink-300 dark:border-pink-800/50 hover:bg-pink-50/50 dark:hover:bg-pink-950/20"
                    : "border-gray-200 dark:border-gray-700 hover:bg-blue-50/50 dark:hover:bg-blue-900/10"
                }`}
              >
                {gifPreviewUrl ? (
                  <div className="w-full h-full p-1.5 flex flex-col items-center justify-center">
                    <img
                      src={gifPreviewUrl}
                      alt="GIF Preview"
                      className="max-h-16 object-contain rounded-lg"
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
                    <span className="text-xs text-gray-500 mt-1 font-medium px-2 text-center line-clamp-2">
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
              <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl cursor-pointer hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all group overflow-hidden">
                <ImageIcon className="text-gray-400 group-hover:text-blue-500 transition-colors" />
                <span className="text-xs text-gray-500 mt-1 font-medium px-2 text-center line-clamp-2">
                  {iconFile
                    ? iconFile.name
                    : format === "gif"
                      ? "Auto from GIF or Pick"
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

          {/* Sound Effect (Optional Audio for GIF / SVGA) */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 ml-1 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Volume2 size={12} className="text-amber-500" />
                Gift Sound Effect (অডিও / সাউন্ড)
              </span>
              <span className="text-[10px] font-medium text-gray-400">
                MP3 / WAV (Optional)
              </span>
            </label>

            <div className="p-2.5 bg-gray-50 dark:bg-gray-800/60 rounded-2xl border border-gray-200 dark:border-gray-700/80 flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 overflow-hidden flex-1">
                <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Volume2 size={16} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">
                    {soundFile
                      ? soundFile.name
                      : soundPreviewUrl
                        ? "Attached Sound Effect"
                        : "No Sound Attached"}
                  </span>
                  <span className="text-[10px] text-gray-400 truncate">
                    {soundFile || soundPreviewUrl
                      ? `Plays for ${duration || 4}s with gift`
                      : "Optional audio played with gift"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {soundPreviewUrl && (
                  <button
                    type="button"
                    onClick={togglePlaySound}
                    className="p-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white transition-all shadow-sm flex items-center justify-center"
                    title={isPlayingSound ? "Pause Sound" : "Play Sound Preview"}
                  >
                    {isPlayingSound ? <Pause size={13} /> : <Play size={13} />}
                  </button>
                )}

                <label className="px-2.5 py-1.5 rounded-xl border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-xs font-bold text-gray-700 dark:text-gray-200 cursor-pointer transition-colors">
                  <span>{soundFile || soundPreviewUrl ? "Change" : "Add Sound"}</span>
                  <input
                    type="file"
                    className="hidden"
                    accept="audio/*,.mp3,.wav,.aac,.m4a,.ogg"
                    onChange={(e) => handleSoundChange(e.target.files?.[0] || null)}
                  />
                </label>

                {(soundFile || soundPreviewUrl) && (
                  <button
                    type="button"
                    onClick={handleRemoveSound}
                    className="p-1.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 text-gray-400 hover:text-red-500 transition-colors"
                    title="Remove Sound"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isUploading}
            className={`w-full h-13 rounded-2xl font-bold shadow transition-all mt-2 flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50 ${
              format === "gif"
                ? "bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white shadow-pink-500/25"
                : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/25"
            }`}
          >
            {isUploading ? (
              <Loader2 className="animate-spin" size={22} />
            ) : (
              <>
                {format === "gif" ? <Sparkles size={17} /> : <Film size={17} />}
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
