import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import { collection, onSnapshot, query } from "firebase/firestore";
import { Search, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { UserCard } from "./UserCard";
import { ActionPanel } from "./ActionPanel";

export interface UserInfo {
  uid: string;
  displayName: string;
  displayId: string;
  email: string;
  balance: number;
  photoUrl: string;
  role?: string;
  diamonds?: number;
  isHost?: boolean;
}

export default function CoinManager() {
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchId, setSearchId] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    if (selectedUser) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [selectedUser]);

  useEffect(() => {
    const q = query(collection(db, "users"));
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((d) => {
          const docData = d.data();
          return {
            ...docData,
            uid: d.id,
          } as UserInfo;
        });
        setUsers(data);
        setLoading(false);
      },
      () => {
        toast.error("Failed to sync users");
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const filteredUsers = users
    .filter(
      (u) =>
        (roleFilter === "all" || (u.role?.toLowerCase() || "") === roleFilter.toLowerCase()) &&
        (u.displayId?.includes(searchId) ||
        u.email?.toLowerCase().includes(searchId.toLowerCase()) ||
        u.displayName?.toLowerCase().includes(searchId.toLowerCase()))
    )
    .sort((a, b) => (b.balance || 0) - (a.balance || 0));

  return (
    <div className="min-h-screen relative flex flex-col">
      <div className="sticky top-0 z-30 bg-white dark:bg-black border-b dark:border-gray-800 px-4 md:px-8 md:pt-4 pb-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold dark:text-white text-black">User Coin Management</h1>
          <p className="text-gray-500 text-sm mt-1">Manage balances and resets</p>
        </div>
        <div className="flex flex-col md:flex-row gap-4 max-w-4xl">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search ID, Name or Email..."
              className="w-full pl-12 pr-4 py-4 rounded-2xl border dark:border-gray-800 bg-gray-50 dark:bg-gray-900 outline-none focus:ring-2 ring-blue-500 transition-all dark:text-white shadow-sm"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
            />
          </div>
          <select
            className="px-4 py-4 rounded-2xl border dark:border-gray-800 bg-gray-50 dark:bg-gray-900 outline-none focus:ring-2 ring-blue-500 transition-all dark:text-white shadow-sm font-medium"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="all">All Roles</option>
            <option value="host">Host</option>
            <option value="agency">Agency</option>
            <option value="reseller">Reseller</option>
          </select>
        </div>
      </div>

      <div className="p-4 md:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full flex justify-center py-20">
              <Loader2 className="animate-spin text-gray-500" size={40} />
            </div>
          ) : (
            filteredUsers.map((user) => (
              <UserCard
                key={user.uid}
                user={user}
                isSelected={selectedUser?.uid === user.uid}
                onSelect={setSelectedUser}
              />
            ))
          )}
        </div>
      </div>

      {selectedUser && (
        <div className="fixed inset-0 z-40 flex items-center justify-center lg:pl-60 dark:bg-black/80 bg-black/20 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setSelectedUser(null)} />
          <div className="relative w-full max-w-lg animate-in zoom-in-95 duration-200">
            <ActionPanel
              selectedUser={selectedUser}
              onClose={() => setSelectedUser(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
