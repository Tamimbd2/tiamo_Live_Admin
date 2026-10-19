import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { Plus, X, Loader2, Diamond } from "lucide-react";
import toast from "react-hot-toast";

interface RechargePackage {
  id: string;
  diamonds: number;
  price: number;
  isActive: boolean;
  createdAt: any;
}

export default function RechargePackageManager() {
  const [packages, setPackages] = useState<RechargePackage[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [diamonds, setDiamonds] = useState("");
  const [price, setPrice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Bulk actions state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState("");
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "recharge_packages"), orderBy("price", "asc"));
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as RechargePackage[];
        setPackages(data);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching packages:", error);
        toast.error("Failed to load packages");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleAddPackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!diamonds || !price || isNaN(Number(diamonds)) || isNaN(Number(price))) {
      toast.error("Please enter valid numbers for diamonds and price");
      return;
    }

    setIsSubmitting(true);
    const tid = toast.loading("Adding package...");
    try {
      await addDoc(collection(db, "recharge_packages"), {
        diamonds: Number(diamonds),
        price: Number(price),
        isActive: true,
        createdAt: serverTimestamp(),
      });
      toast.success("Package added successfully", { id: tid });
      setIsModalOpen(false);
      setDiamonds("");
      setPrice("");
    } catch (error) {
      console.error(error);
      toast.error("Failed to add package", { id: tid });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (pkg: RechargePackage) => {
    try {
      await updateDoc(doc(db, "recharge_packages", pkg.id), {
        isActive: !pkg.isActive,
      });
      toast.success(`Package ${!pkg.isActive ? "enabled" : "disabled"}`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to update status");
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(packages.map((p) => p.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleBulkAction = async () => {
    if (selectedIds.size === 0) {
      toast.error("Please select at least one package.");
      return;
    }
    if (bulkAction !== "delete") {
      toast.error("Invalid action.");
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ${selectedIds.size} package(s)?`)) {
      return;
    }

    setIsBulkProcessing(true);
    const tid = toast.loading("Deleting packages...");
    try {
      const promises = Array.from(selectedIds).map((id) =>
        deleteDoc(doc(db, "recharge_packages", id))
      );
      await Promise.all(promises);
      toast.success(`Successfully deleted ${selectedIds.size} package(s)`, { id: tid });
      setSelectedIds(new Set());
      setBulkAction("");
    } catch (error) {
      console.error("Error with bulk delete:", error);
      toast.error("Failed to delete packages", { id: tid });
    } finally {
      setIsBulkProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full min-h-[400px]">
        <Loader2 className="animate-spin text-blue-500" size={40} />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-[1200px] mx-auto min-h-[calc(100vh-64px)] font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-blue-600 dark:text-blue-400">Total Recharge Packages:</h1>
          <div className="bg-white dark:bg-gray-800 border border-blue-500 text-blue-600 dark:text-blue-400 font-bold px-3 py-1 rounded-lg text-lg">
            {packages.length}
          </div>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-semibold transition-colors"
        >
          <Plus size={20} />
          Add Package
        </button>
      </div>

      {/* Bulk Action */}
      <div className="flex flex-col sm:flex-row gap-3 mb-2 items-center">
        <select
          value={bulkAction}
          onChange={(e) => setBulkAction(e.target.value)}
          className="w-full sm:w-64 border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none dark:text-white"
        >
          <option value="">----------</option>
          <option value="delete">Delete Selected</option>
        </select>
        <button
          onClick={handleBulkAction}
          disabled={isBulkProcessing}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-semibold text-sm transition-colors disabled:opacity-50"
        >
          Go
        </button>
      </div>
      
      <div className="text-gray-500 text-sm mb-4">
        {selectedIds.size} of {packages.length} selected
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-x-auto shadow-sm">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead>
            <tr className="bg-[#ffe4e6] dark:bg-pink-900/30 border-b border-gray-200 dark:border-gray-700">
              <th className="p-4 w-12 text-center">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-gray-300 accent-blue-600 cursor-pointer"
                  checked={selectedIds.size === packages.length && packages.length > 0}
                  onChange={handleSelectAll}
                />
              </th>
              <th className="p-4 text-sm font-bold text-blue-600 dark:text-blue-400">Diamonds</th>
              <th className="p-4 text-sm font-bold text-blue-600 dark:text-blue-400">Status</th>
              <th className="p-4 text-sm font-bold text-blue-600 dark:text-blue-400">Price</th>
            </tr>
          </thead>
          <tbody>
            {packages.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-gray-500 dark:text-gray-400">
                  No packages found. Click "Add Package" to create one.
                </td>
              </tr>
            ) : (
              packages.map((pkg, index) => {
                const isEven = index % 2 === 0;
                return (
                  <tr
                    key={pkg.id}
                    className={`${
                      isEven ? "bg-white dark:bg-gray-900" : "bg-gray-50 dark:bg-gray-800"
                    } hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-colors border-b border-gray-100 dark:border-gray-800 last:border-0`}
                  >
                    <td className="p-4 text-center">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-gray-300 accent-blue-600 cursor-pointer"
                        checked={selectedIds.has(pkg.id)}
                        onChange={() => handleSelectOne(pkg.id)}
                      />
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-blue-500 font-bold font-mono">
                        <Diamond size={16} className="text-blue-400" />
                        {pkg.diamonds.toLocaleString()}
                      </div>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => handleToggleStatus(pkg)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          pkg.isActive ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-600"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            pkg.isActive ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </td>
                    <td className="p-4 font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                      ৳ {pkg.price.toLocaleString()}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-xl font-bold dark:text-white">Add Package</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-500"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleAddPackage} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  Diamonds Amount
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400">
                    <Diamond size={16} />
                  </span>
                  <input
                    type="number"
                    required
                    min="1"
                    value={diamonds}
                    onChange={(e) => setDiamonds(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 dark:text-white font-mono"
                    placeholder="e.g. 100000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  Price (৳)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500 font-bold">
                    ৳
                  </span>
                  <input
                    type="number"
                    required
                    min="1"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full pl-8 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 dark:text-white font-mono"
                    placeholder="e.g. 1000"
                  />
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting || !diamonds || !price}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <><Loader2 className="animate-spin" size={20} /> Saving...</>
                  ) : (
                    "Save Package"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
