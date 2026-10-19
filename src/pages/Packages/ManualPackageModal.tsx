import { useState, useEffect, useMemo } from "react";
import {
  X,
  Search,
  User as UserIcon,
  Trash2,
  Check,
  Clock,
  Sparkles,
  ChevronLeft,
  Loader2,
  Calendar,
  AlertCircle,
  Crown,
} from "lucide-react";
import {
  doc,
  updateDoc,
  deleteField,
  collection,
  query,
  onSnapshot,
  Timestamp,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import toast from "react-hot-toast";
import { Gift } from "./types";
import { SVGAPreview } from "../../components/SVGAPreview";

interface ManualPackageModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryName: string;
  packages: Gift[];
  preselectedPackage?: Gift | null;
}

const isSVGAUrl = (url?: string | null): boolean => {
  if (!url || typeof url !== "string") return false;
  return url.toLowerCase().includes(".svga");
};

export const ManualPackageModal = ({
  isOpen,
  onClose,
  categoryName,
  packages = [],
  preselectedPackage,
}: ManualPackageModalProps) => {
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [userFilter, setUserFilter] = useState<"all" | "active" | "none">("all");

  // Selected state
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [chosenPackage, setChosenPackage] = useState<Gift | null>(null);
  const [validity, setValidity] = useState<string>("permanent"); // 'permanent', '7', '15', '30', '90'
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch users in real-time (Only depends on isOpen to avoid infinite re-render loops)
  useEffect(() => {
    if (!isOpen) return;

    setLoadingUsers(true);
    const q = query(collection(db, "users"));
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
        setUsers(data);
        setLoadingUsers(false);

        // Keep selected user data updated without triggering useEffect loop
        setSelectedUser((current: any) => {
          if (!current) return null;
          const updated = data.find((u) => u.uid === current.uid);
          return updated || current;
        });
      },
      (error) => {
        console.error("Failed to sync users:", error);
        toast.error("Could not sync users");
        setLoadingUsers(false);
      }
    );

    return () => unsubscribe();
  }, [isOpen]);

  // Set initial package selection
  useEffect(() => {
    if (preselectedPackage) {
      setChosenPackage(preselectedPackage);
    } else if (packages && packages.length > 0) {
      setChosenPackage((prev) => prev || packages[0]);
    }
  }, [preselectedPackage, packages]);

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedUser(null);
      setSearchQuery("");
      setUserFilter("all");
      setValidity("permanent");
    }
  }, [isOpen]);

  // Filter users
  const filteredUsers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return users.filter((u) => {
      const activeItem = u?.activeAddOns?.[categoryName];
      const hasActive = Boolean(
        activeItem &&
          (typeof activeItem === "string"
            ? activeItem
            : activeItem?.imageUrl || activeItem?.imageURL)
      );

      if (userFilter === "active" && !hasActive) return false;
      if (userFilter === "none" && hasActive) return false;

      if (!q) return true;

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
  }, [users, searchQuery, userFilter, categoryName]);

  if (!isOpen) return null;

  // Active package of selected user safely extracted
  const userActiveAddon = selectedUser?.activeAddOns?.[categoryName];
  const hasCurrentActive = Boolean(
    userActiveAddon &&
      (typeof userActiveAddon === "string"
        ? userActiveAddon
        : userActiveAddon?.imageUrl || userActiveAddon?.imageURL)
  );

  const currentImageUrl: string =
    typeof userActiveAddon === "string"
      ? userActiveAddon
      : (userActiveAddon?.imageUrl || userActiveAddon?.imageURL || "");

  const currentExpiresAt = userActiveAddon?.expiresAt;

  const formatExpiry = (expiresAt: any) => {
    if (!expiresAt) return "Permanent / Lifetime";
    try {
      const date =
        typeof expiresAt?.toDate === "function"
          ? expiresAt.toDate()
          : expiresAt instanceof Date
          ? expiresAt
          : new Date(expiresAt);

      if (!date || isNaN(date.getTime())) return "Permanent / Lifetime";
      const isExpired = date.getTime() < Date.now();
      return `${isExpired ? "Expired on" : "Expires"}: ${date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })}`;
    } catch {
      return "Permanent / Lifetime";
    }
  };

  // Assign or Update package for user
  const handleAssignOrUpdate = async () => {
    if (!selectedUser) {
      toast.error("Please select a user first");
      return;
    }
    if (!chosenPackage) {
      toast.error("Please select a package to assign");
      return;
    }

    const pkgUrl = chosenPackage.imageURL || (chosenPackage as any).imageUrl || "";
    if (!pkgUrl) {
      toast.error("Selected package does not have a valid image URL");
      return;
    }

    setIsProcessing(true);
    const isUpdate = hasCurrentActive;
    const tid = toast.loading(
      isUpdate ? `Updating ${categoryName}...` : `Assigning ${categoryName}...`
    );

    try {
      let expiresAtValue: Timestamp | null = null;
      if (validity !== "permanent") {
        const days = Number(validity);
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + days);
        expiresAtValue = Timestamp.fromDate(targetDate);
      }

      const payload = {
        imageUrl: pkgUrl,
        expiresAt: expiresAtValue,
        name: chosenPackage.name || categoryName,
        assignedAt: serverTimestamp(),
      };

      await updateDoc(doc(db, "users", selectedUser.uid), {
        [`activeAddOns.${categoryName}`]: payload,
      });

      toast.success(
        `${categoryName} successfully ${isUpdate ? "updated" : "assigned"} for ${
          selectedUser.displayName || selectedUser.displayId || "user"
        }!`,
        { id: tid }
      );
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Failed to update user package", { id: tid });
    } finally {
      setIsProcessing(false);
    }
  };

  // Remove / Delete active package from user
  const handleDeleteFromUser = async () => {
    if (!selectedUser) return;

    setIsProcessing(true);
    const tid = toast.loading(`Removing ${categoryName}...`);
    try {
      await updateDoc(doc(db, "users", selectedUser.uid), {
        [`activeAddOns.${categoryName}`]: deleteField(),
      });

      toast.success(
        `${categoryName} successfully removed from ${
          selectedUser.displayName || selectedUser.displayId || "user"
        }`,
        { id: tid }
      );
    } catch (error: any) {
      console.error(error);
      toast.error("Failed to remove package", { id: tid });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md lg:pl-64 dark:bg-black/80 bg-black/40 animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative w-full max-w-3xl rounded-[2.5rem] border bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
          <div className="flex items-center gap-3">
            {selectedUser && (
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="p-2 -ml-2 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500 hover:text-black dark:hover:text-white transition-all"
                title="Back to user list"
              >
                <ChevronLeft size={22} />
              </button>
            )}
            <div>
              <h2 className="text-xl font-black dark:text-white flex items-center gap-2">
                <Crown className="text-yellow-500" size={24} />
                Manual {categoryName}
              </h2>
              <p className="text-xs text-gray-500 font-medium">
                {selectedUser
                  ? `Manage for: ${selectedUser.displayName || selectedUser.fullName || selectedUser.name || "User"} (ID: ${
                      selectedUser.displayId || selectedUser.userId || selectedUser.uid
                    })`
                  : `Search user to give, update, or remove ${categoryName}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!selectedUser ? (
            /* STEP 1: USER SEARCH & LIST */
            <div className="space-y-4">
              {/* Search Bar & Filter Tabs */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                    size={18}
                  />
                  <input
                    type="text"
                    placeholder="Search User by ID (e.g. 100001), Name, or Email..."
                    className="w-full pl-12 pr-4 py-3.5 rounded-2xl border dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 outline-none focus:ring-2 ring-blue-500 dark:text-white font-medium text-sm transition-all"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                {/* Filter Tabs */}
                <div className="flex bg-gray-100 dark:bg-gray-800/60 p-1 rounded-2xl gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setUserFilter("all")}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                      userFilter === "all"
                        ? "bg-white dark:bg-gray-900 text-black dark:text-white shadow-sm"
                        : "text-gray-500 hover:text-black dark:hover:text-white"
                    }`}
                  >
                    All ({users.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserFilter("active")}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                      userFilter === "active"
                        ? "bg-white dark:bg-gray-900 text-yellow-600 dark:text-yellow-400 shadow-sm"
                        : "text-gray-500 hover:text-black dark:hover:text-white"
                    }`}
                  >
                    Has Active
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserFilter("none")}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                      userFilter === "none"
                        ? "bg-white dark:bg-gray-900 text-black dark:text-white shadow-sm"
                        : "text-gray-500 hover:text-black dark:hover:text-white"
                    }`}
                  >
                    No Package
                  </button>
                </div>
              </div>

              {/* Users Results */}
              {loadingUsers ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
                  <Loader2 className="animate-spin text-blue-500" size={36} />
                  <p className="text-xs font-bold uppercase tracking-wider">Syncing Users...</p>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-3xl p-8">
                  <UserIcon className="mx-auto text-gray-300 dark:text-gray-700 mb-2" size={40} />
                  <p className="text-gray-500 dark:text-gray-400 font-bold text-sm">No users found</p>
                  <p className="text-xs text-gray-400 mt-1">Try a different search query or filter</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[55vh] overflow-y-auto pr-1">
                  {filteredUsers.map((u) => {
                    const addon = u?.activeAddOns?.[categoryName];
                    const hasActive = Boolean(
                      addon &&
                        (typeof addon === "string" ? addon : addon?.imageUrl || addon?.imageURL)
                    );
                    const imgUrl: string =
                      typeof addon === "string"
                        ? addon
                        : (addon?.imageUrl || addon?.imageURL || "");

                    return (
                      <div
                        key={u.uid}
                        onClick={() => setSelectedUser(u)}
                        className="p-3.5 rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-blue-500 dark:hover:border-blue-500 cursor-pointer transition-all flex items-center justify-between gap-3 bg-gray-50/50 dark:bg-gray-800/30 hover:bg-white dark:hover:bg-gray-800/80 group"
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
                            <h4 className="font-bold text-sm dark:text-white truncate group-hover:text-blue-500 transition-colors">
                              {u.displayName || u.fullName || u.name || "Unknown"}
                            </h4>
                            <p className="text-xs text-gray-500 font-mono font-medium">
                              ID: {u.displayId || u.userId || u.uid}
                            </p>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="shrink-0 flex items-center gap-2">
                          {hasActive ? (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800/50 rounded-xl">
                              {imgUrl && (
                                <div className="w-5 h-5 rounded overflow-hidden shrink-0 flex items-center justify-center">
                                  {isSVGAUrl(imgUrl) ? (
                                    <SVGAPreview url={imgUrl} />
                                  ) : (
                                    <img src={imgUrl} alt="" className="w-full h-full object-contain" />
                                  )}
                                </div>
                              )}
                              <span className="text-[10px] font-black text-yellow-600 dark:text-yellow-400 uppercase tracking-wider">
                                Active
                              </span>
                            </div>
                          ) : (
                            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-gray-800/80">
                              None
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* STEP 2: USER PACKAGE MANAGEMENT (ADD / UPDATE / DELETE) */
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Selected User Header Card */}
              <div className="p-4 rounded-3xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  {selectedUser.photoUrl || selectedUser.avatar || selectedUser.photo ? (
                    <img
                      src={selectedUser.photoUrl || selectedUser.avatar || selectedUser.photo}
                      alt=""
                      className="w-12 h-12 rounded-full object-cover border-2 border-white dark:border-gray-700 shadow"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-gray-400">
                      <UserIcon size={24} />
                    </div>
                  )}
                  <div>
                    <h3 className="font-extrabold text-base dark:text-white">
                      {selectedUser.displayName || selectedUser.fullName || selectedUser.name || "User"}
                    </h3>
                    <p className="text-xs text-gray-500 font-mono font-medium">
                      Display ID: {selectedUser.displayId || selectedUser.userId || "N/A"} &bull; UID: {selectedUser.uid}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="text-xs font-bold text-blue-500 hover:underline px-3 py-1.5 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-all"
                >
                  Change User
                </button>
              </div>

              {/* CURRENT ACTIVE PACKAGE STATUS & DELETE OPTION */}
              <div className="p-5 rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
                <h4 className="text-xs font-black uppercase text-gray-400 tracking-wider mb-4 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-yellow-500" />
                  Current {categoryName} Status
                </h4>

                {hasCurrentActive ? (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-yellow-50/50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900/40">
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                      <div className="w-20 h-20 rounded-2xl bg-white dark:bg-gray-900 border border-yellow-300 dark:border-yellow-800 p-2 flex items-center justify-center shrink-0 shadow-sm">
                        {isSVGAUrl(currentImageUrl) ? (
                          <SVGAPreview url={currentImageUrl} />
                        ) : currentImageUrl ? (
                          <img src={currentImageUrl} alt="Active Package" className="max-h-full object-contain" />
                        ) : (
                          <Crown className="text-yellow-500" size={32} />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-yellow-500 text-black">
                            Active
                          </span>
                          <h5 className="font-extrabold text-sm dark:text-white">
                            {categoryName}
                          </h5>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 font-medium flex items-center gap-1.5">
                          <Calendar size={13} className="text-gray-400" />
                          {formatExpiry(currentExpiresAt)}
                        </p>
                      </div>
                    </div>

                    {/* DELETE / REMOVE BUTTON */}
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={handleDeleteFromUser}
                      className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 shadow-md shadow-red-500/20 shrink-0"
                    >
                      {isProcessing ? (
                        <Loader2 className="animate-spin" size={16} />
                      ) : (
                        <Trash2 size={16} />
                      )}
                      Delete / Remove Package
                    </button>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 flex items-center gap-3">
                    <AlertCircle className="text-gray-400 shrink-0" size={20} />
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                      This user does not currently have an active {categoryName}. You can select one below to give manually.
                    </p>
                  </div>
                )}
              </div>

              {/* ASSIGN OR UPDATE PACKAGE SECTION */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-black uppercase text-gray-400 tracking-wider">
                    {hasCurrentActive ? `Update / Replace With Another Package` : `Select Package to Assign`}
                  </h4>
                  <span className="text-[11px] text-gray-400 font-semibold">
                    {packages?.length || 0} packages available
                  </span>
                </div>

                {!packages || packages.length === 0 ? (
                  <div className="p-8 text-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl">
                    <p className="text-xs font-bold text-gray-400">
                      No packages found in inventory for {categoryName}. Please add one first from the main screen.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-56 overflow-y-auto p-1">
                    {packages.map((pkg) => {
                      const isChosen = chosenPackage?.id === pkg.id;
                      const pkgUrl = pkg.imageURL || (pkg as any).imageUrl || "";
                      const isSVGA = isSVGAUrl(pkgUrl);

                      return (
                        <div
                          key={pkg.id || pkg.name}
                          onClick={() => setChosenPackage(pkg)}
                          className={`p-3 rounded-2xl border cursor-pointer transition-all flex flex-col items-center text-center relative group ${
                            isChosen
                              ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 ring-2 ring-blue-500"
                              : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800/30 hover:border-gray-300 dark:hover:border-gray-700"
                          }`}
                        >
                          {isChosen && (
                            <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center shadow">
                              <Check size={12} strokeWidth={3} />
                            </div>
                          )}

                          <div className="w-16 h-16 rounded-xl overflow-hidden mb-2 bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-1">
                            {isSVGA && pkgUrl ? (
                              <SVGAPreview url={pkgUrl} />
                            ) : pkgUrl ? (
                              <img
                                src={pkgUrl}
                                alt="Package"
                                className="max-h-full object-contain"
                              />
                            ) : (
                              <Crown className="text-yellow-500" size={24} />
                            )}
                          </div>

                          <span className="text-xs font-mono font-black text-yellow-600 dark:text-yellow-400 mt-1">
                            {pkg.price ? `${pkg.price} Coins` : "Free"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* VALIDITY / EXPIRY SELECTOR */}
                <div className="pt-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-2 flex items-center gap-1.5">
                    <Clock size={13} />
                    Package Validity / Duration
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {[
                      { id: "permanent", label: "Permanent" },
                      { id: "7", label: "7 Days" },
                      { id: "15", label: "15 Days" },
                      { id: "30", label: "30 Days" },
                      { id: "90", label: "90 Days" },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setValidity(item.id)}
                        className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all border ${
                          validity === item.id
                            ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20"
                            : "border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* SUBMIT BUTTON */}
                <div className="pt-4">
                  <button
                    type="button"
                    disabled={isProcessing || !chosenPackage}
                    onClick={handleAssignOrUpdate}
                    className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30 transition-all active:scale-[0.99] disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <Loader2 className="animate-spin" size={20} />
                    ) : (
                      <Crown size={20} />
                    )}
                    {hasCurrentActive
                      ? `Update ${categoryName} for ${selectedUser.displayName || selectedUser.displayId || "User"}`
                      : `Assign ${categoryName} to ${selectedUser.displayName || selectedUser.displayId || "User"}`}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
