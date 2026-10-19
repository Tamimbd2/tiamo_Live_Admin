import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import {
  collection,
  onSnapshot,
  doc,
  deleteDoc,
  query,
  Timestamp,
  where,
} from "firebase/firestore";
import { Plus, Loader2, Shield } from "lucide-react";
import toast from "react-hot-toast";
import BadgeCard from "./BadgeCard";
import BadgeModal from "./BadgeModal";

export interface LevelBadge {
  id: string;
  level: number;
  imageURL: string;
  name: string;
  category: string;
  tier?: "free" | "premium";
  price?: number;
  createdAt?: Timestamp;
}

export default function LevelBadgeManager() {
  const [badges, setBadges] = useState<LevelBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBadge, setEditingBadge] = useState<LevelBadge | null>(null);
  const [tierFilter, setTierFilter] = useState("All");

  useEffect(() => {
    const q = query(collection(db, "store"), where("category", "==", "LevelBadge"));
    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as LevelBadge));
      const sortedData = data.sort((a, b) => {
        const timeA = a.createdAt?.toMillis() || 0;
        const timeB = b.createdAt?.toMillis() || 0;
        return timeB - timeA;
      });
      setBadges(sortedData);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleDelete = async (id: string) => {
    toast((t) => (
      <div className="flex flex-col gap-3 min-w-[220px]">
        <p className="text-sm font-bold leading-tight">Are you sure you want to delete this badge?</p>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              toast.dismiss(t.id);
              const loadingId = toast.loading("Deleting...");
              try {
                await deleteDoc(doc(db, "store", id));
                toast.success("Badge deleted", { id: loadingId });
              } catch {
                toast.error("Delete failed", { id: loadingId });
              }
            }}
            className="bg-red-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-transform active:scale-95"
          >
            Delete
          </button>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="bg-gray-200 text-gray-800 px-4 py-2 rounded-xl text-xs font-bold transition-transform active:scale-95"
          >
            Cancel
          </button>
        </div>
      </div>
    ), { duration: 6000, position: "top-right" });
  };

  const openEdit = (badge: LevelBadge) => {
    setEditingBadge(badge);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingBadge(null);
  };

  const filteredBadges = badges.filter((b) =>
    tierFilter === "All" || b.tier === tierFilter
  );

  return (
    <div className="min-h-screen">
      <div className="flex flex-row justify-between items-center gap-4 mb-10">
        <div>
          <h1 className="text-2xl font-bold dark:text-white text-black flex items-center gap-2">
            <Shield className="text-blue-500" /> Level Badges
          </h1>
          <p className="text-gray-500 text-sm mt-1">Manage ranking system visual rewards</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center border rounded-2xl w-44 h-12 dark:text-white justify-center dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 transition-all font-bold text-sm shadow-sm active:scale-95 bg-white dark:bg-black"
        >
          <Plus size={18} className="mr-2" /> Add New Badge
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
        <div className="p-6 rounded-2xl border dark:border-gray-800">
          <p className="text-gray-500 text-xs font-bold uppercase mb-1">Total</p>
          <h2 className="text-3xl font-semibold dark:text-white text-black">{badges.length}</h2>
        </div>
        <div className="p-6 rounded-2xl border dark:border-gray-800">
          <p className="text-gray-500 text-xs font-bold uppercase mb-1">Levels</p>
          <h2 className="text-3xl font-semibold dark:text-white text-black">
            {new Set(badges.map((b) => b.level)).size}
          </h2>
        </div>
        <div className="p-6 rounded-2xl border dark:border-gray-800">
          <p className="text-gray-500 text-xs font-bold uppercase mb-1">Free</p>
          <h2 className="text-3xl font-semibold text-green-500">
            {badges.filter((b) => b.tier === "free" || !b.tier).length}
          </h2>
        </div>
        <div className="p-6 rounded-2xl border dark:border-gray-800">
          <p className="text-gray-500 text-xs font-bold uppercase mb-1">Premium</p>
          <h2 className="text-3xl font-semibold text-yellow-500">
            {badges.filter((b) => b.tier === "premium").length}
          </h2>
        </div>
      </div>

      <div className="mb-8 flex justify-between items-center">
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

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-gray-400" size={40} />
        </div>
      ) : (
        <div className="md:flex md:flex-wrap grid grid-cols-2 pt-5 gap-8 justify-center">
          {filteredBadges.map((badge) => (
            <BadgeCard
              key={badge.id}
              badge={badge}
              onEdit={() => openEdit(badge)}
              onDelete={() => handleDelete(badge.id)}
            />
          ))}
        </div>
      )}

      {isModalOpen && (
        <BadgeModal
          isOpen={isModalOpen}
          onClose={closeModal}
          editingBadge={editingBadge}
        />
      )}
    </div>
  );
}
