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
  const [editData, setEditData] = useState<Gift | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedGiftId, setSelectedGiftId] = useState<string | null>(null);
  const [filter, setFilter] = useState("All categories");
  const [tierFilter, setTierFilter] = useState("All");

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

  const handleSubmit = async (formData: Partial<Gift>, iconFile: File | null, svgaFile: File | null) => {
    if (!editData && (!iconFile || !svgaFile)) {
      toast.error("Please select both an icon and an SVGA file!");
      return;
    }
    setIsUploading(true);
    const toastId = toast.loading(editData ? "Updating..." : "Deploying...");
    try {
      let finalImageUrl = editData?.imageURL || "";
      let finalIconUrl = editData?.iconURL || editData?.imageURL || "";

      if (iconFile) finalIconUrl = await handleUpload(iconFile);
      if (svgaFile) finalImageUrl = await handleUpload(svgaFile);

      const tier = formData.tier || "free";
      const payload = {
        name: formData.name,
        price: tier === "free" ? 0 : Number(formData.price),
        category: "Gift",
        subCategory: formData.category,
        tier,
        imageURL: finalImageUrl,
        iconURL: finalIconUrl,
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
    return categoryMatch && tierMatch;
  });

  return (
    <div className="min-h-screen mt-5">
      <div className="flex justify-between items-center mb-10">
        <div className="flex items-center gap-2">
          <span className="text-blue-500"><Sparkles size={36} /></span>
          <div>
            <h1 className="md:text-3xl text-xl font-semibold dark:text-white flex items-center gap-3">Gift Manager</h1>
            <p className="text-gray-500 text-xs mt-1 font-bold tracking-widest uppercase text-start">Inventory</p>
          </div>
        </div>
        <button
          onClick={() => { setEditData(null); setIsModalOpen(true); }}
          className="dark:text-white md:px-8 md:py-4 rounded-2xl font-semibold px-4 py-4 flex border items-center gap-2 active:scale-95 transition-all dark:border-gray-800"
        >
          <Plus size={20} /> Add New Gift
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
        <div className="p-6 rounded-2xl border dark:border-gray-800">
          <p className="text-gray-500 text-xs font-bold uppercase mb-1">Total</p>
          <h2 className="text-3xl font-semibold dark:text-white text-black">{gifts.length}</h2>
        </div>
        <div className="p-6 rounded-2xl border dark:border-gray-800">
          <p className="text-gray-500 text-xs font-bold uppercase mb-1">Categories</p>
          <h2 className="text-3xl font-semibold dark:text-white text-black">{categories.length}</h2>
        </div>
        <div className="p-6 rounded-2xl border dark:border-gray-800">
          <p className="text-gray-500 text-xs font-bold uppercase mb-1">Free</p>
          <h2 className="text-3xl font-semibold text-green-500">
            {gifts.filter((g) => g.tier === "free" || !g.tier).length}
          </h2>
        </div>
        <div className="p-6 rounded-2xl border dark:border-gray-800">
          <p className="text-gray-500 text-xs font-bold uppercase mb-1">Premium</p>
          <h2 className="text-3xl font-semibold text-yellow-500">
            {gifts.filter((g) => g.tier === "premium").length}
          </h2>
        </div>
      </div>

      <div className="flex gap-3 mb-8 justify-between items-center flex-wrap">
        <div className="flex gap-3">
          <select
            className="p-3 border dark:border-gray-800 rounded-xl outline-none text-sm bg-transparent dark:text-white text-black"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option className="text-black" value="All categories">All categories</option>
            {categories.map((cat) => (
              <option key={cat} className="text-black" value={cat}>{cat}</option>
            ))}
          </select>
          <select
            className="p-3 border dark:border-gray-800 rounded-xl outline-none text-sm bg-transparent dark:text-white text-black"
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
          >
            <option className="text-black" value="All">All tiers</option>
            <option className="text-black" value="free">Free</option>
            <option className="text-black" value="premium">Premium</option>
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
              onEdit={(g) => { setEditData(g); setIsModalOpen(true); }}
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
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
