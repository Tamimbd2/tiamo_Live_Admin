import { useState, useEffect } from "react";
import { uploadFile } from "../../lib/upload";
import { db } from "../../lib/firebase";
import { collection, getDocs, doc, deleteDoc, addDoc, updateDoc, query, serverTimestamp, where } from "firebase/firestore";
import { GiftCard } from "./GiftCard";
import { GiftModal } from "./GiftModal";
import { Plus, Sparkles, Loader2 } from "lucide-react";
import { Gift } from "./types";
import toast from "react-hot-toast";

export default function GiftingManager() {
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalFormat, setModalFormat] = useState<"svga" | "gif">("svga");
  const [editData, setEditData] = useState<Gift | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedGiftId, setSelectedGiftId] = useState<string | null>(null);
  const [filter, setFilter] = useState("All categories");
  const [tierFilter, setTierFilter] = useState("All");
  const [formatFilter, setFormatFilter] = useState<"All" | "svga" | "gif">("All");

  const fetchGifts = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "store"), where("category", "==", "Gift"));
      const snap = await getDocs(q);
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Gift);
      setGifts(data.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0)));
    } catch (error) {
      console.error(error);
      toast.error("Failed to fetch assets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchGifts(); }, []);

  const categories = Array.from(
    new Set(gifts.map((g) => g.subCategory).filter(Boolean))
  ) as string[];

  const handleUpload = async (file: File): Promise<string> => {
    return uploadFile(file);
  };

  const handleSubmit = async (
    formData: Partial<Gift>,
    iconFile: File | null,
    animationFile: File | null,
    format: "svga" | "gif"
  ) => {
    if (!editData) {
      if (format === "svga" && (!iconFile || !animationFile)) {
        toast.error("Please select both an icon and an SVGA file!");
        return;
      }
      if (format === "gif" && !animationFile) {
        toast.error("Please select a GIF file!");
        return;
      }
    }
    setIsUploading(true);
    const toastId = toast.loading(editData ? "Updating..." : "Deploying...");
    try {
      let finalImageUrl = editData?.imageURL || "";
      let finalIconUrl = editData?.iconURL || editData?.imageURL || "";

      if (animationFile) {
        finalImageUrl = await handleUpload(animationFile);
      }
      if (iconFile) {
        finalIconUrl = await handleUpload(iconFile);
      } else if (format === "gif" && !finalIconUrl) {
        finalIconUrl = finalImageUrl;
      }

      const tier = formData.tier || "free";
      const safeSubCategory =
        formData.category && formData.category !== "Gift"
          ? formData.category
          : formData.subCategory && formData.subCategory !== "Gift"
            ? formData.subCategory
            : "Lucky";
      const payload = {
        name: formData.name,
        price: tier === "free" ? 0 : Number(formData.price || 0),
        category: "Gift",
        subCategory: safeSubCategory,
        tier,
        imageURL: finalImageUrl,
        iconURL: finalIconUrl,
        format,
        animationType: format,
        isActive: true,
        updatedAt: serverTimestamp(),
      };

      if (editData?.id) {
        await updateDoc(doc(db, "store", editData.id), payload);
        toast.success("Successfully updated", { id: toastId });
      } else {
        await addDoc(collection(db, "store"), { ...payload, createdAt: serverTimestamp() });
        toast.success("Successfully added", { id: toastId });
      }

      setIsModalOpen(false);
      fetchGifts();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error", { id: toastId });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    toast((t) => (
      <div className="flex items-center gap-4">
        <span className="text-sm font-bold">Remove asset?</span>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              toast.dismiss(t.id);
              const delId = toast.loading("Deleting...");
              try {
                await deleteDoc(doc(db, "store", id));
                setGifts((prev) => prev.filter((g) => g.id !== id));
                toast.success("Deleted", { id: delId });
              } catch {
                toast.error("Error", { id: delId });
              }
            }}
            className="bg-red-500 text-white px-3 py-1 rounded-lg text-xs font-bold"
          >
            Confirm
          </button>
          <button onClick={() => toast.dismiss(t.id)} className="bg-gray-700 text-white px-3 py-1 rounded-lg text-xs font-bold">
            No
          </button>
        </div>
      </div>
    ), { duration: 5000 });
  };

  const filteredGifts = gifts.filter((g) => {
    const categoryMatch = filter === "All categories" || g.subCategory === filter;
    const tierMatch = tierFilter === "All" || g.tier === tierFilter;
    const isGif =
      g.format === "gif" ||
      g.animationType === "gif" ||
      Boolean(g.imageURL?.toLowerCase().includes(".gif"));
    const formatMatch =
      formatFilter === "All" ||
      (formatFilter === "gif" && isGif) ||
      (formatFilter === "svga" && !isGif);
    return categoryMatch && tierMatch && formatMatch;
  });

  const totalGifs = gifts.filter(
    (g) =>
      g.format === "gif" ||
      g.animationType === "gif" ||
      Boolean(g.imageURL?.toLowerCase().includes(".gif"))
  ).length;
  const totalSvgsa = gifts.length - totalGifs;

  return (
    <div className="min-h-screen mt-5">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div className="flex items-center gap-3">
          <span className="text-blue-500 p-2.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50">
            <Sparkles size={32} />
          </span>
          <div>
            <h1 className="md:text-3xl text-xl font-bold dark:text-white flex items-center gap-3">
              Gift Asset Manager
            </h1>
            <p className="text-gray-500 text-xs mt-0.5 font-bold tracking-widest uppercase">
              Manage SVGA & GIF Animations
            </p>
          </div>
        </div>

        {/* Action Buttons: Upload GIF and Add SVGA */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <button
            type="button"
            onClick={() => {
              setEditData(null);
              setModalFormat("gif");
              setIsModalOpen(true);
            }}
            className="flex-1 md:flex-initial px-5 py-3 rounded-2xl font-extrabold text-xs flex items-center justify-center gap-2 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white shadow-lg shadow-pink-500/25 active:scale-95 transition-all"
            title="Upload GIF Format Gift"
          >
            <Sparkles size={16} />
            <span>+ Upload GIF Gift (GIF গিফট)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditData(null);
              setModalFormat("svga");
              setIsModalOpen(true);
            }}
            className="flex-1 md:flex-initial dark:text-white px-5 py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 border dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 shadow-sm active:scale-95 transition-all"
            title="Add SVGA Format Gift"
          >
            <Plus size={16} />
            <span>+ Add SVGA Gift</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="p-5 rounded-2xl border dark:border-gray-800 bg-white dark:bg-gray-900/40 shadow-sm">
          <p className="text-gray-500 text-[10px] font-black uppercase mb-1">Total Gifts</p>
          <h2 className="text-2xl font-extrabold dark:text-white text-black">{gifts.length}</h2>
        </div>
        <div className="p-5 rounded-2xl border border-pink-200/60 dark:border-pink-900/40 bg-pink-50/40 dark:bg-pink-950/20 shadow-sm">
          <p className="text-pink-600 dark:text-pink-400 text-[10px] font-black uppercase mb-1 flex items-center gap-1">
            <Sparkles size={11} /> GIF Gifts
          </p>
          <h2 className="text-2xl font-extrabold text-pink-600 dark:text-pink-400">{totalGifs}</h2>
        </div>
        <div className="p-5 rounded-2xl border border-blue-200/60 dark:border-blue-900/40 bg-blue-50/40 dark:bg-blue-950/20 shadow-sm">
          <p className="text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase mb-1">SVGA Gifts</p>
          <h2 className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">{totalSvgsa}</h2>
        </div>
        <div className="p-5 rounded-2xl border dark:border-gray-800 bg-white dark:bg-gray-900/40 shadow-sm">
          <p className="text-gray-500 text-[10px] font-black uppercase mb-1">Categories</p>
          <h2 className="text-2xl font-extrabold dark:text-white text-black">{categories.length}</h2>
        </div>
        <div className="p-5 rounded-2xl border dark:border-gray-800 bg-white dark:bg-gray-900/40 shadow-sm">
          <p className="text-gray-500 text-[10px] font-black uppercase mb-1">Premium</p>
          <h2 className="text-2xl font-extrabold text-amber-500">
            {gifts.filter((g) => g.tier === "premium").length}
          </h2>
        </div>
      </div>

      <div className="flex gap-3 mb-8 justify-between items-center flex-wrap">
        <div className="flex flex-wrap gap-2.5">
          {/* Format Filter */}
          <select
            className="px-3.5 py-2.5 border dark:border-gray-800 rounded-xl outline-none text-xs font-semibold bg-white dark:bg-gray-900 dark:text-white text-black cursor-pointer"
            value={formatFilter}
            onChange={(e) => setFormatFilter(e.target.value as "All" | "svga" | "gif")}
          >
            <option value="All">All Formats (SVGA & GIF)</option>
            <option value="gif">GIF Only (🖼️)</option>
            <option value="svga">SVGA Only (🎬)</option>
          </select>

          {/* Category Filter */}
          <select
            className="px-3.5 py-2.5 border dark:border-gray-800 rounded-xl outline-none text-xs font-semibold bg-white dark:bg-gray-900 dark:text-white text-black cursor-pointer"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="All categories">All categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Tier Filter */}
          <select
            className="px-3.5 py-2.5 border dark:border-gray-800 rounded-xl outline-none text-xs font-semibold bg-white dark:bg-gray-900 dark:text-white text-black cursor-pointer"
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
          >
            <option value="All">All tiers</option>
            <option value="free">Free</option>
            <option value="premium">Premium</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-40 gap-4">
          <Loader2 className="animate-spin text-blue-500" size={48} />
          <p className="text-gray-400 font-black text-xs">SYNCING DATABASE</p>
        </div>
      ) : filteredGifts.length === 0 ? (
        <div className="text-center py-40 border-4 border-dashed border-gray-100 dark:border-gray-800 rounded-[3rem]">
          <p className="text-gray-400 font-black">NO GIFTS DEPLOYED</p>
        </div>
      ) : (
        <div className="md:flex md:flex-wrap grid grid-cols-2 pt-5 gap-8 justify-center">
          {filteredGifts.map((gift) => (
            <GiftCard
              key={gift.id}
              gift={gift}
              onDelete={handleDelete}
              onEdit={(g) => {
                setEditData(g);
                const isG =
                  g.format === "gif" ||
                  g.animationType === "gif" ||
                  Boolean(g.imageURL?.toLowerCase().includes(".gif"));
                setModalFormat(isG ? "gif" : "svga");
                setIsModalOpen(true);
              }}
              isSelected={selectedGiftId === gift.id}
              onSelect={() => setSelectedGiftId(selectedGiftId === gift.id ? null : (gift.id || null))}
            />
          ))}
        </div>
      )}

      <GiftModal
        isOpen={isModalOpen}
        isUploading={isUploading}
        initialData={editData}
        initialFormat={modalFormat}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
