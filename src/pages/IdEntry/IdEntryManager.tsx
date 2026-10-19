import { useState, useEffect } from "react";
import { uploadFile } from "../../lib/upload";
import { db } from "../../lib/firebase";
import {
  collection,
  onSnapshot,
  doc,
  deleteDoc,
  addDoc,
  updateDoc,
  query,
  serverTimestamp,
  Timestamp,
  where,
} from "firebase/firestore";
import { Plus, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { IdEntryCard } from "./IdEntryCard";
import { IdEntryModal } from "./IdEntryModal";
import { ManualPackageModal } from "../Packages/ManualPackageModal";

export interface IdEntry {
  id: string;
  name: string;
  imageURL: string;
  type: string;
  category: string;
  subCategory?: string;
  tier?: "free" | "premium";
  price?: number;
  createdAt?: Timestamp;
}

export default function IdEntryManager() {
  const [entries, setEntries] = useState<IdEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [editData, setEditData] = useState<IdEntry | null>(null);
  const [filter, setFilter] = useState("All categories");
  const [tierFilter, setTierFilter] = useState("All");
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "store"), where("category", "==", "IdEntry"));
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as IdEntry);
        const sortedData = data.sort((a, b) => {
          const timeA = a.createdAt?.toMillis() || Date.now();
          const timeB = b.createdAt?.toMillis() || Date.now();
          return timeB - timeA;
        });
        setEntries(sortedData);
        setLoading(false);
      },
      (error) => {
        console.error(error);
        toast.error("Sync failed");
        setLoading(false);
      },
    );
    return () => unsubscribe();
  }, []);

  const categories = Array.from(
    new Set(entries.map((e) => e.subCategory).filter(Boolean))
  ) as string[];

  const handleUpload = async (file: File): Promise<string> => {
    return uploadFile(file);
  };

  const handleSubmit = async (formData: Partial<IdEntry>, file: File | null) => {
    setIsUploading(true);
    const tid = toast.loading("Processing...");
    try {
      let finalUrl = editData?.imageURL || "";
      if (file) finalUrl = await handleUpload(file);

      const payload = {
        name: formData.name,
        imageURL: finalUrl,
        type: formData.type,
        category: "IdEntry",
        subCategory: formData.category,
        tier: formData.tier || "free",
        price: formData.tier === "premium" ? (formData.price ?? 0) : 0,
        isActive: true,
        updatedAt: serverTimestamp(),
      };

      if (editData) {
        await updateDoc(doc(db, "store", editData.id), payload);
        toast.success("Updated", { id: tid });
      } else {
        if (!finalUrl) throw new Error("File required");
        await addDoc(collection(db, "store"), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        toast.success("Added", { id: tid });
      }
      setIsModalOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error occurred", { id: tid });
    } finally {
      setIsUploading(false);
    }
  };

  const confirmDelete = (id: string) => {
    toast((t) => (
      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium dark:text-white text-gray-900">Remove this ID Entry?</p>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              toast.dismiss(t.id);
              const tid = toast.loading("Removing...");
              try {
                await deleteDoc(doc(db, "store", id));
                toast.success("Removed", { id: tid });
              } catch {
                toast.error("Failed", { id: tid });
              }
            }}
            className="bg-red-500 text-white px-3 py-1 rounded-lg text-xs"
          >
            Delete
          </button>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="bg-gray-200 text-gray-800 px-3 py-1 rounded-lg text-xs"
          >
            Cancel
          </button>
        </div>
      </div>
    ));
  };

  const filtered = entries.filter((e) => {
    const categoryMatch = filter === "All categories" || e.subCategory === filter;
    const tierMatch = tierFilter === "All" || e.tier === tierFilter;
    return categoryMatch && tierMatch;
  });

  return (
    <div className="min-h-screen">
      <div className="flex justify-between items-end mb-10">
        <div>
          <h1 className="text-2xl font-bold dark:text-white text-black">ID Entry Assets</h1>
          <p className="text-gray-500 text-sm mt-1">Manage SVGA and PNG entry effects</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
        <div className="p-6 rounded-2xl border dark:border-gray-800">
          <p className="text-gray-500 text-xs font-bold uppercase mb-1">Total</p>
          <h2 className="text-3xl font-semibold dark:text-white text-black">{entries.length}</h2>
        </div>
        <div className="p-6 rounded-2xl border dark:border-gray-800">
          <p className="text-gray-500 text-xs font-bold uppercase mb-1">Categories</p>
          <h2 className="text-3xl font-semibold dark:text-white text-black">{categories.length}</h2>
        </div>
        <div className="p-6 rounded-2xl border dark:border-gray-800">
          <p className="text-gray-500 text-xs font-bold uppercase mb-1">Free</p>
          <h2 className="text-3xl font-semibold text-green-500">
            {entries.filter((e) => e.tier === "free" || !e.tier).length}
          </h2>
        </div>
        <div className="p-6 rounded-2xl border dark:border-gray-800">
          <p className="text-gray-500 text-xs font-bold uppercase mb-1">Premium</p>
          <h2 className="text-3xl font-semibold text-yellow-500">
            {entries.filter((e) => e.tier === "premium").length}
          </h2>
        </div>
      </div>

      <div className="mb-8 flex gap-3 text-nowrap justify-between items-center">
        <div className="flex gap-3">
          <select
            className="p-3 border dark:border-gray-800 rounded-xl outline-none text-sm bg-transparent dark:text-white text-black cursor-pointer"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option className="text-black" value="All categories">All categories</option>
            {categories.map((cat) => (
              <option key={cat} className="text-black" value={cat}>{cat}</option>
            ))}
          </select>
          <select
            className="p-3 border dark:border-gray-800 rounded-xl outline-none text-sm bg-transparent dark:text-white text-black cursor-pointer"
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
          >
            <option className="text-black" value="All">All tiers</option>
            <option className="text-black" value="free">Free</option>
            <option className="text-black" value="premium">Premium</option>
          </select>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => { setEditData(null); setIsModalOpen(true); }}
            className="dark:bg-black dark:text-white text-black px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 border dark:border-gray-800 bg-white"
          >
            <Plus size={18} /> Add Entry
          </button>
          <button
            onClick={() => setIsManualModalOpen(true)}
            className="dark:bg-black dark:text-white text-black px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 border dark:border-gray-800 bg-white"
          >
            <Plus size={18} /> Manual Entry
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-gray-500" size={40} />
        </div>
      ) : (
        <div className="md:flex md:flex-wrap grid grid-cols-2 pt-5 gap-8 justify-center">
          {filtered.map((entry) => (
            <IdEntryCard
              key={entry.id}
              entry={entry}
              onEdit={(e) => { setEditData(e); setIsModalOpen(true); }}
              onDelete={confirmDelete}
              isSelected={selectedEntryId === entry.id}
              onSelect={() => setSelectedEntryId(selectedEntryId === entry.id ? null : entry.id)}
            />
          ))}
        </div>
      )}

      <IdEntryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
        isUploading={isUploading}
        initialData={editData}
      />
      <ManualPackageModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        categoryName="IdEntry"
        packages={entries as any}
      />
    </div>
  );
}
