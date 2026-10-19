import { useState, useEffect, useMemo } from "react";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import {
  ShieldCheck,
  Search,
  UserPlus,
  Trash2,
  User as UserIcon,
  Loader2,
  X,
  AlertCircle,
  Shield,
} from "lucide-react";
import toast from "react-hot-toast";

interface UserItem {
  id: string;
  uid?: string;
  displayId?: string | number;
  userId?: string | number;
  displayName?: string;
  fullName?: string;
  name?: string;
  email?: string;
  photoUrl?: string;
  photo?: string;
  avatar?: string;
  role?: string;
  isHost?: boolean;
  ishost?: boolean;
  isAdmin?: boolean;
  isModerator?: boolean;
  isAgent?: boolean;
  isReseller?: boolean;
  isAgency?: boolean;
  createdAt?: any;
  moderatorAssignedAt?: any;
  [key: string]: any;
}

export default function ModeratorManager() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Search in moderators table
  const [tableSearch, setTableSearch] = useState("");

  // Add Moderator modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Remove confirmation modal
  const [userToRemove, setUserToRemove] = useState<UserItem | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  // Real-time listener for all users
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((d) => ({
          id: d.id,
          uid: d.id,
          ...d.data(),
        })) as UserItem[];
        setUsers(data);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching users for moderator:", error);
        toast.error("Failed to load users");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Filter current active moderators
  const activeModerators = useMemo(() => {
    return users.filter(
      (u) =>
        u.role?.toLowerCase() === "moderator" ||
        u.isModerator === true
    );
  }, [users]);

  // Filter moderators by table search
  const filteredModerators = useMemo(() => {
    const q = tableSearch.toLowerCase().trim();
    if (!q) return activeModerators;

    return activeModerators.filter((u) => {
      const displayId = String(u.displayId || u.userId || u.id || "");
      const name = String(u.displayName || u.fullName || u.name || "").toLowerCase();
      const email = String(u.email || "").toLowerCase();

      return (
        displayId.toLowerCase().includes(q) ||
        name.includes(q) ||
        email.includes(q)
      );
    });
  }, [activeModerators, tableSearch]);

  // Helper to determine if user can be made a moderator
  // Requirement: "tobe jodi role user thake tobei deya jabe, onno kono role thakle modaretor deya jabe na"
  const getEligibilityStatus = (u: UserItem) => {
    const roleLower = (u.role || "user").toLowerCase().trim();
    const isAlreadyModerator = roleLower === "moderator" || u.isModerator === true;

    if (isAlreadyModerator) {
      return {
        eligible: false,
        reason: "already_moderator",
        label: "Already Moderator",
      };
    }

    // Check if role is anything other than "user"
    const hasOtherRole =
      (roleLower !== "user" && roleLower !== "") ||
      u.isHost === true ||
      u.ishost === true ||
      u.isAdmin === true ||
      u.isAgent === true ||
      u.isReseller === true ||
      u.isAgency === true;

    if (hasOtherRole) {
      const displayRole = u.role ? u.role.toUpperCase() : "HOST";
      return {
        eligible: false,
        reason: "other_role",
        label: `Ineligible (Role: ${displayRole})`,
      };
    }

    return {
      eligible: true,
      reason: "eligible",
      label: "Role: User (Eligible)",
    };
  };

  // Filter users in the Add Moderator Modal
  const modalSearchResults = useMemo(() => {
    const q = userSearchQuery.toLowerCase().trim();
    if (!q) {
      // Show initial 30 users
      return users.slice(0, 30);
    }

    return users
      .filter((u) => {
        const displayId = String(u.displayId || u.userId || u.id || "");
        const name = String(u.displayName || u.fullName || u.name || "").toLowerCase();
        const email = String(u.email || "").toLowerCase();
        const uid = String(u.id || "").toLowerCase();

        return (
          displayId.toLowerCase().includes(q) ||
          name.includes(q) ||
          email.includes(q) ||
          uid.includes(q)
        );
      })
      .slice(0, 50);
  }, [users, userSearchQuery]);

  // Make user a Moderator
  // Requirement: "modaretor dile tar role modaretor hoye jabe"
  const handleAssignModerator = async (targetUser: UserItem) => {
    const status = getEligibilityStatus(targetUser);
    if (!status.eligible) {
      toast.error(
        status.reason === "already_moderator"
          ? "User is already a moderator"
          : `Cannot assign moderator: User has role "${targetUser.role || 'Host'}". Only users with role "user" can become moderator.`
      );
      return;
    }

    setIsProcessing(true);
    const tid = toast.loading(
      `Making ${targetUser.displayName || targetUser.displayId} a Moderator...`
    );

    try {
      await updateDoc(doc(db, "users", targetUser.id), {
        role: "moderator",
        isModerator: true,
        moderatorAssignedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast.success(
        `${targetUser.displayName || targetUser.displayId} is now a Moderator!`,
        { id: tid }
      );

      setIsAddModalOpen(false);
      setUserSearchQuery("");
    } catch (e: any) {
      console.error("Failed to assign moderator:", e);
      toast.error(e?.message || "Failed to make moderator", { id: tid });
    } finally {
      setIsProcessing(false);
    }
  };

  // Remove Moderator role
  const handleRemoveModerator = async () => {
    if (!userToRemove) return;

    setIsRemoving(true);
    const tid = toast.loading(
      `Removing Moderator role from ${userToRemove.displayName || userToRemove.displayId}...`
    );

    try {
      await updateDoc(doc(db, "users", userToRemove.id), {
        role: "user",
        isModerator: false,
        moderatorRemovedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast.success("Moderator role removed successfully", { id: tid });
      setUserToRemove(null);
    } catch (e: any) {
      console.error("Failed to remove moderator:", e);
      toast.error(e?.message || "Failed to remove moderator", { id: tid });
    } finally {
      setIsRemoving(false);
    }
  };

  const formatDate = (dateValue: any) => {
    if (!dateValue) return "N/A";
    try {
      const d = dateValue.toDate ? dateValue.toDate() : new Date(dateValue);
      if (isNaN(d.getTime())) return "N/A";
      return d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "N/A";
    }
  };

  return (
    <div className="min-h-screen mt-5 pb-16">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-blue-500 shadow-sm">
            <ShieldCheck size={32} />
          </div>
          <div>
            <h1 className="md:text-3xl text-2xl font-black dark:text-white flex items-center gap-2">
              Moderator Management
            </h1>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mt-0.5">
              Manage Live Stream & Board Moderators
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setUserSearchQuery("");
            setIsAddModalOpen(true);
          }}
          className="px-6 py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/25 transition-all active:scale-95 self-start md:self-auto"
        >
          <UserPlus size={20} strokeWidth={2.5} />
          Add Moderator
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className="p-6 rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-black text-gray-400 uppercase tracking-wider">
              Total Moderators
            </span>
            <ShieldCheck size={20} className="text-blue-500" />
          </div>
          <h2 className="text-3xl font-black dark:text-white">{activeModerators.length}</h2>
          <p className="text-[11px] text-gray-500 mt-1 font-medium">Currently active moderators</p>
        </div>

        <div className="p-6 rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-black text-gray-400 uppercase tracking-wider">
              Moderator Role
            </span>
            <Shield size={20} className="text-green-500" />
          </div>
          <h2 className="text-3xl font-black text-green-500">Active</h2>
          <p className="text-[11px] text-gray-500 mt-1 font-medium">Can moderate Audio & Video boards</p>
        </div>

        <div className="p-6 rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-black text-gray-400 uppercase tracking-wider">
              Eligibility Rule
            </span>
            <AlertCircle size={20} className="text-yellow-500" />
          </div>
          <h2 className="text-xl font-black text-yellow-600 dark:text-yellow-400">User Role Only</h2>
          <p className="text-[11px] text-gray-500 mt-1 font-medium">
            Only users with role "user" can become moderator
          </p>
        </div>
      </div>

      {/* Moderators List Table */}
      <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-200 dark:border-gray-800 shadow-xl overflow-hidden">
        {/* Table Search & Filter Bar */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search moderator by ID, Name, or Email..."
              className="w-full pl-12 pr-4 py-3 rounded-2xl border dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60 outline-none focus:ring-2 ring-blue-500 text-sm font-medium dark:text-white transition-all"
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
            Showing <span className="text-black dark:text-white font-extrabold">{filteredModerators.length}</span> of{" "}
            {activeModerators.length} moderators
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 text-gray-400 gap-3">
            <Loader2 className="animate-spin text-blue-500" size={40} />
            <span className="text-xs font-bold uppercase tracking-wider">Syncing Moderators...</span>
          </div>
        ) : filteredModerators.length === 0 ? (
          <div className="text-center py-32 p-6">
            <ShieldCheck className="mx-auto text-gray-300 dark:text-gray-700 mb-3" size={48} />
            <h3 className="text-base font-bold dark:text-white text-gray-800">No moderators found</h3>
            <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
              {tableSearch
                ? "No active moderator matches your search query."
                : "There are currently no users with Moderator role. Click '+ Add Moderator' to search and assign a user."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20 text-[11px] font-black uppercase tracking-wider text-gray-400">
                  <th className="py-4 px-6">Moderator</th>
                  <th className="py-4 px-6">User ID</th>
                  <th className="py-4 px-6">Role</th>
                  <th className="py-4 px-6">Appointed Date</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60 text-sm">
                {filteredModerators.map((mod) => (
                  <tr
                    key={mod.id}
                    className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors group"
                  >
                    {/* User Info */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        {mod.photoUrl || mod.photo || mod.avatar ? (
                          <img
                            src={mod.photoUrl || mod.photo || mod.avatar}
                            alt=""
                            className="w-11 h-11 rounded-full object-cover border border-gray-200 dark:border-gray-700 shrink-0"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-full bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center text-blue-500 shrink-0">
                            <UserIcon size={20} />
                          </div>
                        )}
                        <div className="min-w-0">
                          <h4 className="font-bold text-sm dark:text-white text-gray-900 truncate">
                            {mod.displayName || mod.fullName || mod.name || "Unknown User"}
                          </h4>
                          <p className="text-xs text-gray-400 truncate">{mod.email || "No email"}</p>
                        </div>
                      </div>
                    </td>

                    {/* Display ID */}
                    <td className="py-4 px-6">
                      <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700">
                        {mod.displayId || mod.userId || mod.id}
                      </span>
                    </td>

                    {/* Role Badge */}
                    <td className="py-4 px-6">
                      <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50 flex items-center gap-1.5 w-fit">
                        <ShieldCheck size={12} />
                        MODERATOR
                      </span>
                    </td>

                    {/* Appointed Date */}
                    <td className="py-4 px-6">
                      <span className="text-xs text-gray-500 font-medium">
                        {formatDate(mod.moderatorAssignedAt || mod.updatedAt || mod.createdAt)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6 text-right">
                      <button
                        type="button"
                        onClick={() => setUserToRemove(mod)}
                        title="Remove Moderator Role"
                        className="p-2.5 rounded-xl border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-500 hover:text-red-600 transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: ADD MODERATOR */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md lg:pl-64 dark:bg-black/80 bg-black/40 animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setIsAddModalOpen(false)} />
          <div className="relative w-full max-w-2xl rounded-[2.5rem] border bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-500">
                  <UserPlus size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black dark:text-white">Add Moderator</h2>
                  <p className="text-xs text-gray-500 font-medium">
                    Search user ID. Only users with role "user" can become moderator.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
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
                    className="w-full pl-12 pr-4 py-3.5 rounded-2xl border dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 outline-none focus:ring-2 ring-blue-500 font-medium text-sm dark:text-white transition-all"
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

              {/* Requirement Notice Alert */}
              <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 flex items-start gap-3">
                <AlertCircle className="text-blue-500 shrink-0 mt-0.5" size={18} />
                <div className="text-xs text-blue-900 dark:text-blue-300">
                  <p className="font-bold">Role Requirement Rule:</p>
                  <p className="text-blue-700 dark:text-blue-400/80 mt-0.5">
                    User must have role <strong>"user"</strong> to be assigned as Moderator. If the user already holds another role (such as Host, Agency, Reseller, or Admin), they cannot be made a moderator.
                  </p>
                </div>
              </div>

              {/* User Results List */}
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase text-gray-400 tracking-wider">
                  Select User to Make Moderator
                </label>

                {modalSearchResults.length === 0 ? (
                  <div className="p-8 text-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl">
                    <p className="text-xs font-bold text-gray-400">No user found matching search query</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2.5 max-h-64 overflow-y-auto pr-1">
                    {modalSearchResults.map((u) => {
                      const status = getEligibilityStatus(u);

                      return (
                        <div
                          key={u.id}
                          className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                            status.eligible
                              ? "border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 hover:border-blue-500"
                              : "border-gray-100 dark:border-gray-800/40 bg-gray-100/30 dark:bg-gray-800/10 opacity-75"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {u.photoUrl || u.photo || u.avatar ? (
                              <img
                                src={u.photoUrl || u.photo || u.avatar}
                                alt=""
                                className="w-11 h-11 rounded-full object-cover shrink-0 border border-gray-200 dark:border-gray-700"
                              />
                            ) : (
                              <div className="w-11 h-11 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-gray-400 shrink-0">
                                <UserIcon size={20} />
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-bold text-sm dark:text-white truncate">
                                  {u.displayName || u.fullName || u.name || "Unknown"}
                                </h4>

                                {status.eligible ? (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 uppercase">
                                    Role: User
                                  </span>
                                ) : status.reason === "already_moderator" ? (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 uppercase">
                                    Already Moderator
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 uppercase">
                                    Ineligible ({u.role ? u.role.toUpperCase() : "HOST"})
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 font-mono font-medium">
                                ID: {u.displayId || u.userId || u.id}
                              </p>
                            </div>
                          </div>

                          {status.eligible ? (
                            <button
                              type="button"
                              disabled={isProcessing}
                              onClick={() => handleAssignModerator(u)}
                              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/20 transition-all active:scale-95 disabled:opacity-50 shrink-0"
                            >
                              {isProcessing ? (
                                <Loader2 className="animate-spin" size={14} />
                              ) : (
                                <ShieldCheck size={14} />
                              )}
                              Make Moderator
                            </button>
                          ) : (
                            <div className="text-right shrink-0">
                              <button
                                type="button"
                                disabled
                                className="px-3.5 py-2 rounded-xl bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-500 font-bold text-xs cursor-not-allowed border border-gray-300 dark:border-gray-700"
                              >
                                {status.reason === "already_moderator"
                                  ? "Moderator"
                                  : "Cannot Assign"}
                              </button>
                            </div>
                          )}
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

      {/* CONFIRMATION MODAL: REMOVE MODERATOR */}
      {userToRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md lg:pl-64 dark:bg-black/80 bg-black/40 animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setUserToRemove(null)} />
          <div className="relative w-full max-w-md rounded-3xl border bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 shadow-2xl p-6 text-center">
            <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-center justify-center text-red-500 mx-auto mb-4">
              <Trash2 size={26} />
            </div>
            <h3 className="text-lg font-black dark:text-white">Remove Moderator Role?</h3>
            <p className="text-xs text-gray-500 mt-1">
              Are you sure you want to remove Moderator privileges from{" "}
              <span className="font-bold text-black dark:text-white">
                {userToRemove.displayName || userToRemove.displayId}
              </span>
              ? Their role will revert back to <strong>"user"</strong>.
            </p>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setUserToRemove(null)}
                className="flex-1 py-3 rounded-2xl border border-gray-200 dark:border-gray-800 font-bold text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isRemoving}
                onClick={handleRemoveModerator}
                className="flex-1 py-3 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-red-500/20 transition-all active:scale-95 disabled:opacity-50"
              >
                {isRemoving ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                Confirm Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
