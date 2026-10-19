import { useEffect, useState } from "react";
import { Pagination } from "../../components/Pagination/Pagination";
import {
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  deleteDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import UserTable, { User } from "./UserTable";
import UserDetailsModal from "./UserDetailsModal";
import { Trash2, AlertTriangle, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

type FilterType = "All" | "Active" | "Inactive";

export default function UserList() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("All");
  const [currentPage, setCurrentPage] = useState(1);

  // Marked / Selected Users state
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  // Delete modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // User Details & Edit modal state
  const [selectedUserForDetails, setSelectedUserForDetails] = useState<User | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const usersPerPage = 10;

  const fetchUsers = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const usersData = querySnapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as User[];
      setUsers(usersData);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      toast.error("Failed to load users");
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(true);
  }, []);

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.displayName?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.displayId?.includes(search) ||
      u.id?.includes(search);

    const matchesFilter =
      filter === "All" ||
      (filter === "Active" && u.isActive) ||
      (filter === "Inactive" && !u.isActive);

    return matchesSearch && matchesFilter;
  });

  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

  // Checkbox toggle single user
  const handleToggleSelect = (id: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Checkbox toggle select all on current page
  const handleToggleSelectAll = () => {
    const currentPageIds = currentUsers.map((u) => u.id);
    const allSelected = currentPageIds.every((id) => selectedUserIds.includes(id));

    if (allSelected) {
      // Deselect all on this page
      setSelectedUserIds((prev) => prev.filter((id) => !currentPageIds.includes(id)));
    } else {
      // Select all on this page
      setSelectedUserIds((prev) => Array.from(new Set([...prev, ...currentPageIds])));
    }
  };

  const isAllSelected =
    currentUsers.length > 0 &&
    currentUsers.every((u) => selectedUserIds.includes(u.id));

  // Single Delete
  const handleDeleteSingleUser = (id: string) => {
    setUserToDelete(id);
    setIsBulkDeleting(false);
    setIsDeleteModalOpen(true);
  };

  // Bulk Delete
  const handleOpenBulkDeleteModal = () => {
    if (selectedUserIds.length === 0) return;
    setUserToDelete(null);
    setIsBulkDeleting(true);
    setIsDeleteModalOpen(true);
  };

  // Open Details Modal
  const handleOpenDetails = (user: User) => {
    setSelectedUserForDetails(user);
    setIsDetailsModalOpen(true);
  };

  // Callback when user details (name/photo/etc) are updated
  const handleUserUpdated = (updatedUser: User) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === updatedUser.id ? { ...u, ...updatedUser } : u))
    );
    setSelectedUserForDetails((prev) =>
      prev?.id === updatedUser.id ? { ...prev, ...updatedUser } : prev
    );
  };

  // Confirm Delete
  const confirmDelete = async () => {
    setIsDeleting(true);
    const loadingToast = toast.loading(
      isBulkDeleting
        ? `Deleting ${selectedUserIds.length} marked users...`
        : "Deleting user..."
    );

    try {
      if (isBulkDeleting) {
        // Bulk delete via batch
        const batch = writeBatch(db);
        selectedUserIds.forEach((id) => {
          batch.delete(doc(db, "users", id));
        });
        await batch.commit();

        toast.success(`${selectedUserIds.length} users deleted successfully`, {
          id: loadingToast,
        });
        setSelectedUserIds([]);
      } else if (userToDelete) {
        // Single delete
        await deleteDoc(doc(db, "users", userToDelete));
        setSelectedUserIds((prev) => prev.filter((id) => id !== userToDelete));
        toast.success("User deleted successfully", { id: loadingToast });
      }

      setIsDeleteModalOpen(false);
      setUserToDelete(null);
      setIsBulkDeleting(false);
      fetchUsers(false);
    } catch (error) {
      console.error("Delete failed:", error);
      toast.error("Failed to delete", { id: loadingToast });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:text-white p-5 dark:border-gray-800 dark:bg-white/[0.03] relative">
      {/* Top Search & Filter Bar */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:justify-between items-start md:items-center">
        <input
          type="text"
          placeholder="Search users by name, email, or ID..."
          className="border dark:border-gray-800 p-2.5 rounded-xl bg-transparent outline-none focus:ring-2 ring-blue-500 w-full md:w-80 text-sm"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
        />

        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          {/* Delete Marked Users Button (Visible when 1 or more are marked) */}
          {selectedUserIds.length > 0 && (
            <button
              type="button"
              onClick={handleOpenBulkDeleteModal}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-600/25 transition-all active:scale-95"
            >
              <Trash2 size={16} />
              Delete Marked Users ({selectedUserIds.length})
            </button>
          )}

          <select
            className="rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 cursor-pointer outline-none font-medium"
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value as FilterType);
              setCurrentPage(1);
            }}
          >
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Bulk Selection Notification Bar */}
      {selectedUserIds.length > 0 && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-red-600 dark:text-red-400">
            <AlertTriangle size={16} />
            <span>{selectedUserIds.length} user(s) marked for action</span>
          </div>
          <button
            type="button"
            onClick={() => setSelectedUserIds([])}
            className="text-xs font-semibold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 underline"
          >
            Clear Selection
          </button>
        </div>
      )}

      {/* User Table */}
      <div className="max-w-full overflow-x-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
            <Loader2 className="animate-spin text-blue-500" size={32} />
            <p className="text-sm font-medium">Loading users...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 dark:text-gray-400 text-lg">
              No {filter !== "All" ? filter.toLowerCase() : ""} users found.
            </p>
          </div>
        ) : (
          <UserTable
            users={currentUsers}
            selectedUserIds={selectedUserIds}
            onToggleSelect={handleToggleSelect}
            onToggleSelectAll={handleToggleSelectAll}
            isAllSelected={isAllSelected}
            handleDeleteUser={handleDeleteSingleUser}
            onViewUser={handleOpenDetails}
          />
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      {/* Confirmation Modal: Delete (Single or Bulk) */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 w-full max-w-md shadow-2xl border border-gray-200 dark:border-gray-800 text-center">
            <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-950/50 border border-red-200 dark:border-red-900/50 flex items-center justify-center text-red-500 mx-auto mb-4">
              <Trash2 size={26} />
            </div>

            <h3 className="text-xl font-bold mb-2 text-gray-800 dark:text-white">
              {isBulkDeleting
                ? `Delete ${selectedUserIds.length} Marked Users?`
                : "Delete User?"}
            </h3>

            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              {isBulkDeleting
                ? `Are you sure you want to permanently delete all ${selectedUserIds.length} marked users? This action cannot be undone.`
                : "Are you sure you want to delete this user? This action cannot be undone."}
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setUserToDelete(null);
                  setIsBulkDeleting(false);
                }}
                className="flex-1 px-4 py-3 rounded-2xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold text-xs hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDelete}
                className="flex-1 px-4 py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-lg shadow-red-600/25 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isDeleting ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <Trash2 size={16} />
                )}
                {isBulkDeleting
                  ? `Delete All (${selectedUserIds.length})`
                  : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Details & Edit Modal */}
      {isDetailsModalOpen && selectedUserForDetails && (
        <UserDetailsModal
          user={selectedUserForDetails}
          isOpen={isDetailsModalOpen}
          onClose={() => {
            setIsDetailsModalOpen(false);
            setSelectedUserForDetails(null);
          }}
          onUserUpdated={handleUserUpdated}
        />
      )}
    </div>
  );
}
