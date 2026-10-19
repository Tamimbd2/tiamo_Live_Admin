import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import { collection, onSnapshot, query } from "firebase/firestore";
import { Search, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { GiftingUserCard } from "./GiftingUserCard";
import { GiftingActionPanel } from "./GiftingActionPanel";

export interface UserInfo {
  uid: string;
  displayName: string;
  displayId: string;
  email: string;
  giftingCoin: number;
  photoUrl: string;
}

export default function GiftingCoinManager() {
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchId, setSearchId] = useState("");
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
            giftingCoin: docData.giftingCoin ?? 0,
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

  const filteredUsers = users.filter(
    (u) =>
      u.displayId?.includes(searchId) ||
      u.email?.toLowerCase().includes(searchId.toLowerCase()) ||
      u.displayName?.toLowerCase().includes(searchId.toLowerCase())
  );

  return (
    <div className="min-h-screen relative flex flex-col">
      <div className="sticky top-0 z-30 bg-white dark:bg-black border-b dark:border-gray-800 px-4 md:px-8 md:pt-4 pb-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold dark:text-white text-black">User Gifting Coin Management</h1>
          <p className="text-gray-500 text-sm mt-1">Manage gifting coins and resets</p>
        </div>
        <div className="relative max-w-4xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search ID, Name or Email..."
            className="w-full pl-12 pr-4 py-4 rounded-2xl border dark:border-gray-800 bg-gray-50 dark:bg-gray-900 outline-none focus:ring-2 ring-blue-500 transition-all dark:text-white shadow-sm"
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
          />
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
              <GiftingUserCard
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
            <GiftingActionPanel
              selectedUser={selectedUser}
              onClose={() => setSelectedUser(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
