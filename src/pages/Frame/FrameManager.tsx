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
import { Plus, Loader2, Search, User as UserIcon, X } from "lucide-react";
import toast from "react-hot-toast";
import { FrameCard } from "./FrameCard";
import { FrameModal } from "./FrameModal";
import { SVGAPreview } from "../../components/SVGAPreview";

export interface FrameAsset {
  id: string;
  name: string;
  imageURL: string;
  type: "png" | "svga";
  category: string;
  subCategory?: string;
  tier?: "free" | "premium";
  price?: number;
  createdAt?: Timestamp;
}

export default function FrameManager() {
  const [frames, setFrames] = useState<FrameAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [editData, setEditData] = useState<FrameAsset | null>(null);
  const [filter, setFilter] = useState("All categories");
  const [tierFilter, setTierFilter] = useState("All");
  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(null);

  // Manual assignment states
  const [users, setUsers] = useState<any[]>([]);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignSearchQuery, setAssignSearchQuery] = useState("");
  const [selectedUserForAssign, setSelectedUserForAssign] = useState<any | null>(null);
  const [isFrameModalOpenForAssign, setIsFrameModalOpenForAssign] = useState(false);
  const [isAssigningInProgress, setIsAssigningInProgress] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "store"), where("category", "==", "Frame"));
    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as FrameAsset);
      const sortedData = data.sort((a, b) => {
        const timeA = a.createdAt?.toMillis() || Date.now();
        const timeB = b.createdAt?.toMillis() || Date.now();
        return timeB - timeA;
      });
      setFrames(sortedData);
      setLoading(false);
    }, (error) => {
      console.error(error);
      toast.error("Sync failed");
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Fetch users for manual assignment
  useEffect(() => {
    const q = query(collection(db, "users"));
    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
      setUsers(data);
    }, (error) => {
      console.error("Users sync failed:", error);
    });
    return () => unsubscribe();
  }, []);

  const categories = Array.from(
    new Set(frames.map((f) => f.subCategory).filter(Boolean))
  ) as string[];

  const handleUpload = async (file: File): Promise<string> => {
    return uploadFile(file);
  };

  const handleSubmit = async (formData: Partial<FrameAsset>, file: File | null) => {
    setIsUploading(true);
    const tid = toast.loading("Processing...");
    try {
      let finalUrl = editData?.imageURL || "";
      if (file) {
        finalUrl = await handleUpload(file);
      }

      const tier = formData.tier || "free";
      const payload = {
        name: formData.name,
        imageURL: finalUrl,
        type: formData.type,
        category: "Frame",
        subCategory: formData.category,
        tier,
        price: tier === "free" ? 0 : Number(formData.price || 0),
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
      toast.error(e instanceof Error ? e.message : "Error", { id: tid });
    } finally {
      setIsUploading(false);
    }
  };

  const confirmDelete = (id: string) => {
    toast((t) => (
      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium dark:text-white">Remove this Frame?</p>
        <div className="flex gap-2">
          <button onClick={async () => {
            toast.dismiss(t.id);
            const tid = toast.loading("Removing...");
            try {
              await deleteDoc(doc(db, "store", id));
              toast.success("Removed", { id: tid });
            } catch { toast.error("Failed", { id: tid }); }
          }} className="bg-red-500 text-white px-3 py-1 rounded-lg text-xs">Delete</button>
          <button onClick={() => toast.dismiss(t.id)} className="bg-gray-200 text-black px-3 py-1 rounded-lg text-xs">Cancel</button>
        </div>
      </div>
    ));
  };

  const filtered = frames.filter((f) => {
    const categoryMatch = filter === "All categories" || f.subCategory === filter;
    const tierMatch = tierFilter === "All" || f.tier === tierFilter;
    return categoryMatch && tierMatch;
  });

  const filteredUsersForAssign = users.filter((u) => {
    const q = assignSearchQuery.toLowerCase();
    return (
      u.displayId?.includes(q) ||
      u.displayName?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen">
      <div className="flex justify-between items-end mb-10">
        <div>
          <h1 className="text-2xl font-bold dark:text-white text-black">Frame Assets</h1>
          <p className="text-gray-500 text-sm mt-1">Manage SVGA and PNG frame overlays</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
        <div className="p-6 rounded-2xl border dark:border-gray-800">
          <p className="text-gray-500 text-xs font-bold uppercase mb-1">Total</p>
          <h2 className="text-3xl font-semibold dark:text-white text-black">{frames.length}</h2>
        </div>
        <div className="p-6 rounded-2xl border dark:border-gray-800">
          <p className="text-gray-500 text-xs font-bold uppercase mb-1">Categories</p>
          <h2 className="text-3xl font-semibold dark:text-white text-black">{categories.length}</h2>
        </div>
        <div className="p-6 rounded-2xl border dark:border-gray-800">
          <p className="text-gray-500 text-xs font-bold uppercase mb-1">Free</p>
          <h2 className="text-3xl font-semibold text-green-500">
            {frames.filter((f) => f.tier === "free" || !f.tier).length}
          </h2>
        </div>
        <div className="p-6 rounded-2xl border dark:border-gray-800">
          <p className="text-gray-500 text-xs font-bold uppercase mb-1">Premium</p>
          <h2 className="text-3xl font-semibold text-yellow-500">
            {frames.filter((f) => f.tier === "premium").length}
          </h2>
        </div>
      </div>

      <div className="mb-8 flex gap-3 justify-between items-center flex-wrap">
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
        <div className="flex gap-3">
          <button
            onClick={() => { setEditData(null); setIsModalOpen(true); }}
            className="dark:bg-black dark:text-white border dark:border-gray-800 bg-white text-black px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2"
          >
            <Plus size={18} /> Add Frame
          </button>
          <button
            onClick={() => { setAssignSearchQuery(""); setIsAssignModalOpen(true); }}
            className="dark:bg-black dark:text-white border dark:border-gray-800 bg-white text-black px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2"
          >
            <Plus size={18} /> Manual frame
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gray-500" size={40} /></div>
      ) : (
        <div className="md:flex md:flex-wrap grid grid-cols-2 pt-5 gap-8 justify-center">
          {filtered.map((frame) => (
            <FrameCard
              key={frame.id}
              frame={frame}
              onEdit={(f) => { setEditData(f); setIsModalOpen(true); }}
              onDelete={confirmDelete}
              isSelected={selectedFrameId === frame.id}
              onSelect={() => setSelectedFrameId(selectedFrameId === frame.id ? null : frame.id)}
            />
          ))}
        </div>
      )}

      <FrameModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleSubmit} isUploading={isUploading} initialData={editData} />

      {/* Step 1: User Selection Modal */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 backdrop-blur-sm lg:pl-64 dark:bg-black/80 bg-black/20 mt-10">
          <div className="absolute inset-0" onClick={() => setIsAssignModalOpen(false)} />
          <div className="relative w-full max-w-lg rounded-[2rem] p-8 border dark:bg-gray-900 dark:border-gray-800 shadow-2xl bg-white flex flex-col max-h-[80vh]">
            <div className="flex justify-between items-center mb-6 shrink-0">
              <h2 className="text-xl font-bold dark:text-white text-black">Select User</h2>
              <button onClick={() => setIsAssignModalOpen(false)} className="text-gray-400 hover:text-red-500"><X size={24} /></button>
            </div>

            <div className="relative mb-6 shrink-0">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search ID, Name or Email..."
                className="w-full pl-12 pr-4 py-3 rounded-xl border dark:border-gray-800 bg-gray-50 dark:bg-gray-900 outline-none focus:ring-2 ring-blue-500 transition-all dark:text-white"
                value={assignSearchQuery}
                onChange={(e) => setAssignSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {filteredUsersForAssign.length === 0 ? (
                <p className="text-center text-gray-500 py-10">No users found</p>
              ) : (
                filteredUsersForAssign.map((u) => (
                  <div
                    key={u.uid}
                    onClick={() => {
                      setSelectedUserForAssign(u);
                      setIsAssignModalOpen(false);
                      setIsFrameModalOpenForAssign(true);
                    }}
                    className="p-4 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-blue-500 cursor-pointer transition-all flex items-center gap-3 dark:bg-gray-950/20"
                  >
                    {u.photoUrl ? (
                      <img src={u.photoUrl} className="w-10 h-10 rounded-full object-cover shrink-0" alt="" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-gray-400 shrink-0">
                        <UserIcon size={18} />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-sm dark:text-white truncate">{u.displayName || "Unknown User"}</h4>
                      <p className="text-xs text-gray-500 truncate">ID: {u.displayId || u.uid}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Frame Selection Modal */}
      {isFrameModalOpenForAssign && selectedUserForAssign && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 backdrop-blur-sm lg:pl-64 dark:bg-black/80 bg-black/20 mt-10">
          <div className="absolute inset-0" onClick={() => setIsFrameModalOpenForAssign(false)} />
          <div className="relative w-full max-w-2xl rounded-[2rem] p-8 border dark:bg-gray-900 dark:border-gray-800 shadow-2xl bg-white flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center mb-4 shrink-0">
              <div>
                <h2 className="text-xl font-bold dark:text-white text-black">Select Frame</h2>
                <p className="text-xs text-gray-500">Assigning to: <span className="font-semibold text-blue-500">{selectedUserForAssign.displayName} (ID: {selectedUserForAssign.displayId})</span></p>
              </div>
              <button onClick={() => setIsFrameModalOpenForAssign(false)} className="text-gray-400 hover:text-red-500"><X size={24} /></button>
            </div>

            <button
              disabled={isAssigningInProgress}
              onClick={async () => {
                const tid = toast.loading("Removing frame...");
                try {
                  setIsAssigningInProgress(true);
                  await updateDoc(doc(db, "users", selectedUserForAssign.uid), {
                    "activeAddOns.Frame": null
                  });
                  toast.success("Frame removed", { id: tid });
                  setIsFrameModalOpenForAssign(false);
                } catch (e) {
                  toast.error("Failed to remove frame", { id: tid });
                } finally {
                  setIsAssigningInProgress(false);
                }
              }}
              className="mb-4 text-xs font-bold text-red-500 border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 py-2.5 px-4 rounded-xl hover:bg-red-100 transition-colors self-start shrink-0"
            >
              Remove Current Frame
            </button>

            <div className="flex-1 overflow-y-auto pr-1">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {frames.map((frame) => (
                  <div
                    key={frame.id}
                    onClick={async () => {
                      if (isAssigningInProgress) return;
                      const tid = toast.loading("Assigning frame...");
                      try {
                        setIsAssigningInProgress(true);
                        await updateDoc(doc(db, "users", selectedUserForAssign.uid), {
                          "activeAddOns.Frame": {
                            imageUrl: frame.imageURL,
                            expiresAt: null
                          }
                        });
                        toast.success("Frame assigned successfully!", { id: tid });
                        setIsFrameModalOpenForAssign(false);
                      } catch (e) {
                        toast.error("Assignment failed", { id: tid });
                      } finally {
                        setIsAssigningInProgress(false);
                      }
                    }}
                    className="p-3 rounded-2xl border dark:border-gray-800 bg-gray-50 dark:bg-gray-950/20 hover:border-blue-500 cursor-pointer transition-all flex flex-col items-center text-center group"
                  >
                    <div className="w-20 h-20 rounded-xl overflow-hidden mb-3 relative flex items-center justify-center bg-white dark:bg-gray-900 border dark:border-gray-800">
                      {frame.type === "png" ? (
                        <img src={frame.imageURL} alt={frame.name} className="w-full h-full object-contain" />
                      ) : (
                        <div className="w-full h-full"><SVGAPreview url={frame.imageURL} /></div>
                      )}
                    </div>
                    <h4 className="font-bold text-xs dark:text-white truncate max-w-full group-hover:text-blue-500">{frame.name}</h4>
                    <span className="text-[9px] text-gray-500 uppercase mt-0.5">{frame.subCategory || "Basic"}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
