import { useState, useEffect } from "react";
import { uploadFile } from "../../lib/upload";
import { db } from "../../lib/firebase";
import { collection, getDocs, doc, deleteDoc, addDoc, updateDoc, query, serverTimestamp, where } from "firebase/firestore";
import { PackageCard } from "./PackageCard";
import { PackageModal } from "./PackageModal";
import { ManualPackageModal } from "./ManualPackageModal";
import { Plus, Sparkles, Loader2, Users } from "lucide-react";
import { Gift } from "./types";
import toast from "react-hot-toast";

interface PackageManagerProps {
  categoryName: string;
}

export default function PackageManager({ categoryName }: PackageManagerProps) {
  const [packages, setPackages] = useState<Gift[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [preselectedPackage, setPreselectedPackage] = useState<Gift | null>(null);
  const [editData, setEditData] = useState<Gift | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);

  const fetchPackages = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "store"), where("category", "==", categoryName));
      const snap = await getDocs(q);
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Gift);
      setPackages(data.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0)));
    } catch (error) {
      console.error(error);
      toast.error(`Failed to fetch ${categoryName}s`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, [categoryName]);

  const handleUpload = async (file: File): Promise<string> => {
    return uploadFile(file);
  };

  const handleSubmit = async (formData: Partial<Gift>, file: File | null) => {
    if (!editData && !file) {
      toast.error("Please select an image, SVGA, or GIF file!");
      return;
    }
    setIsUploading(true);
    const toastId = toast.loading(editData ? "Updating..." : "Deploying...");
    try {
      let finalImageUrl = editData?.imageURL || "";
      let finalIconUrl = editData?.iconURL || editData?.imageURL || "";

      if (file) {
        finalImageUrl = await handleUpload(file);
        finalIconUrl = finalImageUrl;
      }

      const payload = {
        name: formData.name || (file ? file.name.split('.')[0] : "Unnamed Package"),
        price: Number(formData.price),
        category: categoryName,
        subCategory: "Default",
        tier: "premium",
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
      fetchPackages();
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
                setPackages((prev) => prev.filter((g) => g.id !== id));
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

  const filteredPackages = packages;

  return (
    <div className="min-h-screen mt-5">
      <div className="flex justify-between items-center mb-10">
        <div className="flex items-center gap-2">
          <span className="text-blue-500"><Sparkles size={36} /></span>
          <div>
            <h1 className="md:text-3xl text-xl font-semibold dark:text-white flex items-center gap-3">{categoryName} Manager</h1>
            <p className="text-gray-500 text-xs mt-1 font-bold tracking-widest uppercase text-start">Inventory</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setPreselectedPackage(null); setIsManualModalOpen(true); }}
            className="dark:text-white md:px-6 md:py-4 rounded-2xl font-semibold px-4 py-3 flex border items-center gap-2 active:scale-95 transition-all dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 shadow-sm"
          >
            <Users size={18} className="text-yellow-500" /> Manual {categoryName}
          </button>
          <button
            onClick={() => { setEditData(null); setIsModalOpen(true); }}
            className="dark:text-white md:px-6 md:py-4 rounded-2xl font-semibold px-4 py-3 flex border items-center gap-2 active:scale-95 transition-all dark:border-gray-800 bg-blue-600 text-white border-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20"
          >
            <Plus size={20} /> Add New {categoryName}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-2 gap-6 mb-10">
        <div className="p-6 rounded-2xl border dark:border-gray-800">
          <p className="text-gray-500 text-xs font-bold uppercase mb-1">Total</p>
          <h2 className="text-3xl font-semibold dark:text-white text-black">{packages.length}</h2>
        </div>
        <div className="p-6 rounded-2xl border dark:border-gray-800">
          <p className="text-gray-500 text-xs font-bold uppercase mb-1">Premium Items</p>
          <h2 className="text-3xl font-semibold text-yellow-500">
            {packages.length}
          </h2>
        </div>
      </div>



      {loading ? (
        <div className="flex flex-col items-center justify-center py-40 gap-4">
          <Loader2 className="animate-spin text-blue-500" size={48} />
          <p className="text-gray-400 font-black text-xs">SYNCING DATABASE</p>
        </div>
      ) : filteredPackages.length === 0 ? (
        <div className="text-center py-40 border-4 border-dashed border-gray-100 dark:border-gray-800 rounded-[3rem]">
          <p className="text-gray-400 font-black">NO {categoryName.toUpperCase()} DEPLOYED</p>
        </div>
      ) : (
        <div className="md:flex md:flex-wrap grid grid-cols-2 pt-5 gap-8 justify-center">
          {filteredPackages.map((gift) => (
            <PackageCard
              key={gift.id}
              gift={gift}
              onDelete={handleDelete}
              onEdit={(g) => { setEditData(g); setIsModalOpen(true); }}
              onAssign={(g) => { setPreselectedPackage(g); setIsManualModalOpen(true); }}
              isSelected={selectedPackageId === gift.id}
              onSelect={() => setSelectedPackageId(selectedPackageId === gift.id ? null : (gift.id || null))}
            />
          ))}
        </div>
      )}

      <PackageModal
        isOpen={isModalOpen}
        isUploading={isUploading}
        initialData={editData}
        categoryName={categoryName}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
      />

      <ManualPackageModal
        isOpen={isManualModalOpen}
        categoryName={categoryName}
        packages={packages}
        preselectedPackage={preselectedPackage}
        onClose={() => {
          setIsManualModalOpen(false);
          setPreselectedPackage(null);
        }}
      />
    </div>
  );
}
