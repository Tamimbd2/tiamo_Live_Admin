import { useState, useEffect, useMemo } from "react";
import {
  Crown,
  Palette,
  Search,
  Plus,
  Trash2,
  Calendar,
  Clock,
  User as UserIcon,
  Loader2,
  Sparkles,
  RefreshCw,
  Check,
  X,
} from "lucide-react";
import {
  collection,
  query,
  onSnapshot,
  doc,
  updateDoc,
  deleteField,
  where,
  getDocs,
  Timestamp,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import toast from "react-hot-toast";
import { SVGAPreview } from "../../components/SVGAPreview";
import { Gift } from "./types";

interface PackagePurchaseProps {
  categoryName?: string;
}

const isSVGAUrl = (url?: string | null): boolean => {
  if (!url || typeof url !== "string") return false;
  return url.toLowerCase().includes(".svga");
};

export default function PackagePurchase({
  categoryName = "Royal Package",
}: PackagePurchaseProps) {
  const isRoomSkin = categoryName === "RoomSkin";
  const shortName = isRoomSkin ? "Room Skin" : categoryName.replace(" Package", "");

  const [users, setUsers] = useState<any[]>([]);
  const [packages, setPackages] = useState<Gift[]>([]);
  const [loading, setLoading] = useState(true);

  // Search active users in table
  const [tableSearch, setTableSearch] = useState("");

  // Add / Assign Modal states
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [selectedPackage, setSelectedPackage] = useState<Gift | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<number>(365); // 7, 30, 365 (Default 365)
  const [isProcessing, setIsProcessing] = useState(false);

  // Delete confirmation modal
  const [userToDelete, setUserToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // 1. Real-time listener for users
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "users"));
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
        setUsers(data);
        setLoading(false);
      },
      (error) => {
        console.error("Failed to sync users:", error);
        toast.error("Failed to load users");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // 2. Fetch available packages for this category from store
  useEffect(() => {
    const fetchCategoryPackages = async () => {
      try {
        const q = query(collection(db, "store"), where("category", "==", categoryName));
        const snap = await getDocs(q);
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Gift[];
        setPackages(data);
        if (data.length > 0) {
          setSelectedPackage(data[0]);
        }
      } catch (e) {
        console.error(`Failed to fetch ${categoryName}s:`, e);
      }
    };
    fetchCategoryPackages();
  }, [categoryName]);

  // Filter users who ALREADY have this package active
  const activePackageUsers = useMemo(() => {
    return users.filter((u) => {
      const addon = u?.activeAddOns?.[categoryName];
      if (!addon) return false;
      return Boolean(typeof addon === "string" ? addon : addon.imageUrl || addon.imageURL);
    });
  }, [users, categoryName]);

  // Table search filtering on active users
  const filteredActiveUsers = useMemo(() => {
    const q = tableSearch.toLowerCase().trim();
    if (!q) return activePackageUsers;

    return activePackageUsers.filter((u) => {
      const displayId = String(u.displayId || u.userId || u.shortId || u.id || "");
      const name = String(u.displayName || u.fullName || u.name || "").toLowerCase();
      const email = String(u.email || "").toLowerCase();
      const uid = String(u.uid || "").toLowerCase();

      return (
        displayId.toLowerCase().includes(q) ||
        name.includes(q) ||
        email.includes(q) ||
        uid.includes(q)
      );
    });
  }, [activePackageUsers, tableSearch]);

  // Modal user search filtering (all users to give package)
  const filteredModalUsers = useMemo(() => {
    const q = userSearchQuery.toLowerCase().trim();
    if (!q) return users.slice(0, 30);

    return users
      .filter((u) => {
        const displayId = String(u.displayId || u.userId || u.shortId || u.id || "");
        const name = String(u.displayName || u.fullName || u.name || "").toLowerCase();
        const email = String(u.email || "").toLowerCase();
        const uid = String(u.uid || "").toLowerCase();

        return (
          displayId.toLowerCase().includes(q) ||
          name.includes(q) ||
          email.includes(q) ||
          uid.includes(q)
        );
      })
      .slice(0, 50);
  }, [users, userSearchQuery]);

  // Give / Assign Package with Selected Duration (7 Days, 1 Month, 365 Days)
  const handleAssign = async (userToGive: any) => {
    if (!userToGive) return;

    const pkg = selectedPackage || packages[0];
    const imgUrl = pkg ? pkg.imageURL || (pkg as any).imageUrl : "";

    setIsProcessing(true);
    const durationLabel =
      selectedDuration === 7 ? "7 Days" : selectedDuration === 30 ? "1 Month" : "365 Days";

    const tid = toast.loading(
      `Giving ${durationLabel} ${shortName} to ${userToGive.displayName || userToGive.displayId}...`
    );

    try {
      const now = new Date();
      const expiryDate = new Date(now.getTime() + selectedDuration * 24 * 60 * 60 * 1000);
      const expiresAtTimestamp = Timestamp.fromDate(expiryDate);

      const payload = {
        imageUrl: imgUrl || "",
        expiresAt: expiresAtTimestamp,
        name: pkg?.name || categoryName,
        assignedAt: serverTimestamp(),
        validityDays: selectedDuration,
      };

      await updateDoc(doc(db, "users", userToGive.uid), {
        [`activeAddOns.${categoryName}`]: payload,
      });

      toast.success(
        `${shortName} (${durationLabel}) successfully given to ${
          userToGive.displayName || userToGive.displayId
        }!`,
        { id: tid }
      );

      setIsAssignModalOpen(false);
      setUserSearchQuery("");
      setSelectedDuration(365); // Reset to default 365 days
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || `Failed to give ${shortName}`, { id: tid });
    } finally {
      setIsProcessing(false);
    }
  };

  // Remove / Delete Package from user
  const handleRemovePackage = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    const tid = toast.loading(
      `Removing ${shortName} Package from ${userToDelete.displayName || userToDelete.displayId}...`
    );

    try {
      await updateDoc(doc(db, "users", userToDelete.uid), {
        [`activeAddOns.${categoryName}`]: deleteField(),
      });
      toast.success(`${shortName} Package removed successfully`, { id: tid });
      setUserToDelete(null);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to remove package", { id: tid });
    } finally {
      setIsDeleting(false);
    }
  };

  // Renew / Extend 365 Days for existing user
  const handleRenew365Days = async (user: any) => {
    const tid = toast.loading(
      `Renewing 365 Days for ${user.displayName || user.displayId}...`
    );
    try {
      const now = new Date();
      const currentExpiry = user?.activeAddOns?.[categoryName]?.expiresAt;
      let baseDate = now;

      if (currentExpiry) {
        const parsed = currentExpiry.toDate ? currentExpiry.toDate() : new Date(currentExpiry);
        if (parsed.getTime() > now.getTime()) {
          baseDate = parsed;
        }
      }

      const newExpiry = new Date(baseDate.getTime() + 365 * 24 * 60 * 60 * 1000);
      const expiresAtTimestamp = Timestamp.fromDate(newExpiry);

      await updateDoc(doc(db, "users", user.uid), {
        [`activeAddOns.${categoryName}.expiresAt`]: expiresAtTimestamp,
        [`activeAddOns.${categoryName}.updatedAt`]: serverTimestamp(),
      });

      toast.success(`${shortName} Package renewed for 365 Days!`, { id: tid });
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to renew package", { id: tid });
    }
  };

  // Helper to format expiration
  const getExpiryDetails = (expiresAt: any) => {
    if (!expiresAt) {
      return { text: "Permanent", isExpired: false, daysLeft: 365 };
    }
    try {
      const date = expiresAt.toDate ? expiresAt.toDate() : new Date(expiresAt);
      if (isNaN(date.getTime())) return { text: "Permanent", isExpired: false, daysLeft: 365 };

      const diffMs = date.getTime() - Date.now();
      const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      const isExpired = daysLeft <= 0;

      const formatted = date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });

      return {
        text: formatted,
        isExpired,
        daysLeft: Math.max(0, daysLeft),
      };
    } catch {
      return { text: "Permanent", isExpired: false, daysLeft: 365 };
    }
  };

  return (
    <div className="min-h-screen mt-5 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl text-yellow-500 shadow-sm">
            {isRoomSkin ? <Palette size={32} /> : <Crown size={32} />}
          </div>
          <div>
            <h1 className="md:text-3xl text-2xl font-black dark:text-white flex items-center gap-2">
              {shortName} Purchase
            </h1>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mt-0.5">
              Active {shortName} Users & 365-Day Subscriptions
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setUserSearchQuery("");
            setSelectedDuration(365);
            setIsAssignModalOpen(true);
          }}
          className="px-6 py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-black shadow-lg shadow-yellow-500/20 transition-all active:scale-95 self-start md:self-auto"
        >
          <Plus size={20} strokeWidth={2.5} />
          Give {shortName}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className="p-6 rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-black text-gray-400 uppercase tracking-wider">
              Active {shortName} Users
            </span>
            <Crown size={20} className="text-yellow-500" />
          </div>
          <h2 className="text-3xl font-black dark:text-white">{activePackageUsers.length}</h2>
          <p className="text-[11px] text-gray-500 mt-1 font-medium">Currently using {shortName} Package</p>
        </div>

        <div className="p-6 rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-black text-gray-400 uppercase tracking-wider">Default Validity</span>
            <Calendar size={20} className="text-blue-500" />
          </div>
          <h2 className="text-3xl font-black text-blue-500">365 Days</h2>
          <p className="text-[11px] text-gray-500 mt-1 font-medium">Fixed 1-Year subscription duration</p>
        </div>

        <div className="p-6 rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-black text-gray-400 uppercase tracking-wider">Available Assets</span>
            <Sparkles size={20} className="text-purple-500" />
          </div>
          <h2 className="text-3xl font-black text-purple-500">{packages.length}</h2>
          <p className="text-[11px] text-gray-500 mt-1 font-medium">{shortName} Package designs in store</p>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-200 dark:border-gray-800 shadow-xl overflow-hidden">
        {/* Table Search & Filter Bar */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder={`Search active ${shortName} users by ID, Name, or Email...`}
              className="w-full pl-12 pr-4 py-3 rounded-2xl border dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60 outline-none focus:ring-2 ring-yellow-500 text-sm font-medium dark:text-white transition-all"
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
            />
            {tableSearch && (
              <button
                type="button"
                onClick={() => setTableSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div className="text-xs font-bold text-gray-400">
            Showing <span className="text-black dark:text-white font-extrabold">{filteredActiveUsers.length}</span> of{" "}
            {activePackageUsers.length} active users
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 text-gray-400 gap-3">
            <Loader2 className="animate-spin text-yellow-500" size={40} />
            <span className="text-xs font-bold uppercase tracking-wider">Syncing Users...</span>
          </div>
        ) : filteredActiveUsers.length === 0 ? (
          <div className="text-center py-32 p-6">
            <Crown className="mx-auto text-gray-300 dark:text-gray-700 mb-3" size={48} />
            <h3 className="text-base font-bold dark:text-white text-gray-800">
              No active {shortName} users found
            </h3>
            <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
              {tableSearch
                ? "No active user matches your search query."
                : `No users currently have ${shortName} Package. Click 'Give ${shortName} Package' to grant 365 days to a user.`}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20 text-[11px] font-black uppercase tracking-wider text-gray-400">
                  <th className="py-4 px-6">User</th>
                  <th className="py-4 px-6">User ID</th>
                  <th className="py-4 px-6">Package Asset</th>
                  <th className="py-4 px-6">Expiration</th>
                  <th className="py-4 px-6">Days Left</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60 text-sm">
                {filteredActiveUsers.map((user) => {
                  const addon = user?.activeAddOns?.[categoryName];
                  const imgUrl = typeof addon === "string" ? addon : addon?.imageUrl || addon?.imageURL;
                  const expiryInfo = getExpiryDetails(addon?.expiresAt);

                  return (
                    <tr
                      key={user.uid}
                      className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors group"
                    >
                      {/* User Info */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          {user.photoUrl || user.avatar || user.photo ? (
                            <img
                              src={user.photoUrl || user.avatar || user.photo}
                              alt=""
                              className="w-11 h-11 rounded-full object-cover border border-gray-200 dark:border-gray-700 shrink-0"
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 shrink-0">
                              <UserIcon size={20} />
                            </div>
                          )}
                          <div className="min-w-0">
                            <h4 className="font-bold text-sm dark:text-white text-gray-900 truncate">
                              {user.displayName || user.fullName || user.name || "Unknown User"}
                            </h4>
                            <p className="text-xs text-gray-400 truncate">{user.email || "No email"}</p>
                          </div>
                        </div>
                      </td>

                      {/* Display ID */}
                      <td className="py-4 px-6">
                        <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700">
                          {user.displayId || user.userId || user.uid}
                        </span>
                      </td>

                      {/* Package Asset Thumbnail */}
                      <td className="py-4 px-6">
                        <div className="w-14 h-14 rounded-2xl bg-gray-50 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700 p-1 flex items-center justify-center">
                          {isSVGAUrl(imgUrl) ? (
                            <SVGAPreview url={imgUrl} />
                          ) : imgUrl ? (
                            <img src={imgUrl} alt={shortName} className="max-h-full object-contain" />
                          ) : (
                            <Crown size={20} className="text-yellow-500" />
                          )}
                        </div>
                      </td>

                      {/* Expiration Date */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-gray-400" />
                          <span className="font-semibold text-xs dark:text-gray-200 text-gray-700">
                            {expiryInfo.text}
                          </span>
                        </div>
                      </td>

                      {/* Days Left Badge */}
                      <td className="py-4 px-6">
                        {expiryInfo.isExpired ? (
                          <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50">
                            Expired
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-[10px] font-black tracking-wider bg-yellow-100 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-900/50 flex items-center gap-1 w-fit">
                            <Clock size={11} />
                            {expiryInfo.daysLeft} Days Left
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Renew 365 Days */}
                          <button
                            type="button"
                            onClick={() => handleRenew365Days(user)}
                            title="Renew / Add 365 Days"
                            className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-yellow-500 text-gray-500 hover:text-yellow-600 dark:hover:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-950/30 transition-all"
                          >
                            <RefreshCw size={15} />
                          </button>

                          {/* Delete Package */}
                          <button
                            type="button"
                            onClick={() => setUserToDelete(user)}
                            title={`Remove ${shortName} Package`}
                            className="p-2.5 rounded-xl border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-500 hover:text-red-600 transition-all"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: GIVE PACKAGE (365 DAYS) TO SEARCHED USER */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md lg:pl-64 dark:bg-black/80 bg-black/40 animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setIsAssignModalOpen(false)} />
          <div className="relative w-full max-w-2xl rounded-[2.5rem] border bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-yellow-500/10 text-yellow-500">
                  {isRoomSkin ? <Palette size={24} /> : <Crown size={24} />}
                </div>
                <div>
                  <h2 className="text-xl font-black dark:text-white">Give {shortName}</h2>
                  <p className="text-xs text-gray-500 font-medium">Select user & duration (7D, 1M, 365D)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="p-2 rounded-full text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Search Box */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase text-gray-400 tracking-wider">
                  Search User by ID, Name or Email
                </label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="Enter User ID (e.g. 100001), Name, or Email..."
                    className="w-full pl-12 pr-4 py-3.5 rounded-2xl border dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 outline-none focus:ring-2 ring-yellow-500 font-medium text-sm dark:text-white transition-all"
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    autoFocus
                  />
                  {userSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setUserSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>

              {/* Package Asset Selection (if multiple in store) */}
              {packages.length > 0 && (
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase text-gray-400 tracking-wider">
                    Select {shortName} Asset Design
                  </label>
                  <div className="flex gap-3 overflow-x-auto p-1">
                    {packages.map((pkg) => {
                      const isChosen = selectedPackage?.id === pkg.id;
                      const pkgUrl = pkg.imageURL || (pkg as any).imageUrl;

                      return (
                        <div
                          key={pkg.id || pkg.name}
                          onClick={() => setSelectedPackage(pkg)}
                          className={`p-2.5 rounded-2xl border cursor-pointer transition-all flex flex-col items-center shrink-0 w-24 relative ${
                            isChosen
                              ? "border-yellow-500 bg-yellow-50/50 dark:bg-yellow-950/30 ring-2 ring-yellow-500"
                              : "border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40"
                          }`}
                        >
                          {isChosen && (
                            <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-yellow-500 text-black flex items-center justify-center shadow">
                              <Check size={10} strokeWidth={3} />
                            </div>
                          )}
                          <div className="w-14 h-14 rounded-xl overflow-hidden mb-1 flex items-center justify-center">
                            {isSVGAUrl(pkgUrl) ? (
                              <SVGAPreview url={pkgUrl} />
                            ) : pkgUrl ? (
                              <img src={pkgUrl} alt="" className="max-h-full object-contain" />
                            ) : (
                              <Crown size={20} className="text-yellow-500" />
                            )}
                          </div>
                          <span className="text-[10px] font-mono font-bold text-yellow-600 dark:text-yellow-400">
                            {pkg.price ? `${pkg.price} c` : "Free"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Duration Selector: 7 Days, 1 Month, 365 Days (Default 365 Days) */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-black uppercase text-gray-400 tracking-wider flex items-center gap-1.5">
                    <Clock size={14} className="text-yellow-500" />
                    Select Validity / Duration
                  </label>
                  <span className="text-xs font-bold text-yellow-600 dark:text-yellow-400">
                    Selected: {selectedDuration === 7 ? "7 Days" : selectedDuration === 30 ? "1 Month (30 Days)" : "365 Days (1 Year)"}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { days: 7, label: "7 Days", tag: "1 Week" },
                    { days: 30, label: "1 Month", tag: "30 Days" },
                    { days: 365, label: "365 Days", tag: "1 Year (Default)" },
                  ].map((d) => (
                    <button
                      key={d.days}
                      type="button"
                      onClick={() => setSelectedDuration(d.days)}
                      className={`p-3 rounded-2xl border flex flex-col items-center justify-center transition-all ${
                        selectedDuration === d.days
                          ? "bg-yellow-500 text-black border-yellow-500 shadow-md shadow-yellow-500/20 font-black ring-2 ring-yellow-400/50"
                          : "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 font-bold hover:border-gray-300 dark:hover:border-gray-700"
                      }`}
                    >
                      <span className="text-sm font-extrabold">{d.label}</span>
                      <span
                        className={`text-[10px] mt-0.5 ${
                          selectedDuration === d.days ? "text-black/80 font-bold" : "text-gray-400 font-medium"
                        }`}
                      >
                        {d.tag}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Users Search Results */}
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase text-gray-400 tracking-wider">
                  Select User to Give {shortName} Package
                </label>

                {filteredModalUsers.length === 0 ? (
                  <div className="p-8 text-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl">
                    <p className="text-xs font-bold text-gray-400">No user found matching search criteria</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2.5 max-h-60 overflow-y-auto pr-1">
                    {filteredModalUsers.map((u) => {
                      const hasActive = Boolean(u?.activeAddOns?.[categoryName]);
                      const durationTag =
                        selectedDuration === 7 ? "7D" : selectedDuration === 30 ? "1M" : "365D";

                      return (
                        <div
                          key={u.uid}
                          className="p-3.5 rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-yellow-500 dark:hover:border-yellow-500 transition-all flex items-center justify-between gap-3 bg-gray-50/50 dark:bg-gray-800/30"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {u.photoUrl || u.avatar || u.photo ? (
                              <img
                                src={u.photoUrl || u.avatar || u.photo}
                                alt=""
                                className="w-11 h-11 rounded-full object-cover shrink-0 border border-gray-200 dark:border-gray-700"
                              />
                            ) : (
                              <div className="w-11 h-11 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-gray-400 shrink-0">
                                <UserIcon size={20} />
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-sm dark:text-white truncate">
                                  {u.displayName || u.fullName || u.name || "Unknown"}
                                </h4>
                                {hasActive && (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 uppercase">
                                    Already {shortName}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 font-mono font-medium">
                                ID: {u.displayId || u.userId || u.uid}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => handleAssign(u)}
                            className="px-4 py-2.5 rounded-xl bg-yellow-500 hover:bg-yellow-600 text-black font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-yellow-500/20 transition-all active:scale-95 disabled:opacity-50 shrink-0"
                          >
                            {isProcessing ? (
                              <Loader2 className="animate-spin" size={14} />
                            ) : isRoomSkin ? (
                              <Palette size={14} />
                            ) : (
                              <Crown size={14} />
                            )}
                            {hasActive ? `Update (${durationTag})` : `Give ${shortName} (${durationTag})`}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: REMOVE PACKAGE */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md lg:pl-64 dark:bg-black/80 bg-black/40 animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setUserToDelete(null)} />
          <div className="relative w-full max-w-md rounded-3xl border bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 shadow-2xl p-6 text-center">
            <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-center justify-center text-red-500 mx-auto mb-4">
              <Trash2 size={26} />
            </div>
            <h3 className="text-lg font-black dark:text-white">Remove {shortName} Package?</h3>
            <p className="text-xs text-gray-500 mt-1">
              Are you sure you want to remove {shortName} Package access from{" "}
              <span className="font-bold text-black dark:text-white">
                {userToDelete.displayName || userToDelete.displayId}
              </span>
              ?
            </p>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="flex-1 py-3 rounded-2xl border border-gray-200 dark:border-gray-800 font-bold text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleRemovePackage}
                className="flex-1 py-3 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-red-500/20 transition-all active:scale-95 disabled:opacity-50"
              >
                {isDeleting ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                Confirm Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
