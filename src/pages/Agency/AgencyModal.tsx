import { useState, FormEvent, useEffect } from "react";
import { db } from "../../lib/firebase";
import { collection, doc, updateDoc, setDoc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { X, Loader2, Search, User } from "lucide-react";
import toast from "react-hot-toast";

interface AgencyModalProps {
  onClose: () => void;
}

export default function AgencyModal({ onClose }: AgencyModalProps) {
  const [loading, setLoading] = useState<boolean>(false);
  const [users, setUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedUser, setSelectedUser] = useState<any | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "users"),
      (snapshot) => {
        const uList = snapshot.docs.map((doc) => ({
          uid: doc.id,
          ...doc.data(),
        }));
        setUsers(uList);
      },
      () => {
        toast.error("Failed to sync users for selection");
      }
    );
    return () => unsubscribe();
  }, []);

  const filteredUsers = searchQuery.trim()
    ? users
        .filter(
          (u) =>
            String(u.displayId || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
            String(u.uid || "").toLowerCase().includes(searchQuery.toLowerCase())
        )
        .slice(0, 5)
    : [];

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedUser) return toast.error("Please select a user first");

    setLoading(true);
    const name = selectedUser.displayName || selectedUser.name || "—";

    try {
      const agencyId = Math.floor(100000 + Math.random() * 900000);
      const appId = `APP_${Date.now()}`;
      const role = "agency";

      // 1. Create agency application document
      await setDoc(doc(db, "agency_applications", appId), {
        agencyName: name,
        holderName: selectedUser.displayName || selectedUser.name || "—",
        location: selectedUser.country || "Bangladesh",
        locationFlag: "",
        nidFrontUrl: "",
        nidBackUrl: "",
        photoUrl: selectedUser.photoUrl || selectedUser.avatar || "",
        logo: selectedUser.photoUrl || selectedUser.avatar || "",
        reference: "Admin Created",
        status: "active",
        submittedAt: serverTimestamp(),
        userId: selectedUser.uid,
        whatsappNumber: selectedUser.phoneNumber || selectedUser.whatsapp || "",
        agencyId,
        role,
      });

      // 2. Create agency document
      await setDoc(doc(db, "agencies", agencyId.toString()), {
        agencyId,
        name,
        holderName: selectedUser.displayName || selectedUser.name || "—",
        whatsapp: selectedUser.phoneNumber || selectedUser.whatsapp || "",
        country: selectedUser.country || "Bangladesh",
        email: selectedUser.email || "",
        ownerId: selectedUser.uid,
        logo: selectedUser.photoUrl || selectedUser.avatar || "",
        nidFront: "",
        nidBack: "",
        status: "active",
        applicationId: appId,
        role,
        createdAt: serverTimestamp(),
      });

      // 3. Update user document
      await updateDoc(doc(db, "users", selectedUser.uid), {
        isAgency: true,
        agencyId,
        role,
      });

      toast.success("Agency registered successfully!");
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
      <div className="bg-white dark:bg-gray-950 border dark:border-gray-800 w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
        <div className="p-8 border-b dark:border-gray-800 flex justify-between items-center">
          <h2 className="text-2xl font-black text-gray-900 dark:text-white">Agency Registration</h2>
          <button onClick={onClose} className="p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl transition-all">
            <X size={24} className="text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 flex flex-col gap-6 max-h-[75vh] overflow-y-auto">
          {/* User ID Search / Selection */}
          <div className="relative">
            <label className="block text-xs font-black uppercase text-gray-450 dark:text-gray-400 tracking-wider mb-2">
              Search & Select User
            </label>
            {selectedUser ? (
              <div className="p-4 rounded-2xl border border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {selectedUser.photoUrl ? (
                    <img src={selectedUser.photoUrl} className="w-12 h-12 rounded-full object-cover border border-blue-200" alt="" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-500">
                      <User size={20} />
                    </div>
                  )}
                  <div>
                    <p className="font-black text-sm md:text-base text-gray-900 dark:text-white">{selectedUser.displayName || "Unknown User"}</p>
                    <p className="text-xs text-gray-500 font-mono">ID: {selectedUser.displayId || selectedUser.uid}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-805 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 text-xs font-bold rounded-xl transition-all"
                >
                  Change User
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Enter User ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-4 bg-gray-50 dark:bg-gray-900 border dark:border-gray-800 rounded-2xl outline-none focus:ring-2 ring-blue-500/20 text-gray-900 dark:text-white placeholder:text-gray-400 transition-all"
                />
                {searchQuery.trim() && (
                  <div className="absolute left-0 right-0 z-50 mt-1.5 bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-2xl shadow-xl overflow-hidden max-h-60 overflow-y-auto">
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map((u) => (
                        <div
                          key={u.uid}
                          onClick={() => {
                            setSelectedUser(u);
                            setSearchQuery("");
                          }}
                          className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800/60 cursor-pointer border-b last:border-0 dark:border-gray-800 transition-colors"
                        >
                          {u.photoUrl ? (
                            <img src={u.photoUrl} className="w-9 h-9 rounded-full object-cover" alt="" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-gray-400">
                              <User size={16} />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm text-gray-900 dark:text-white truncate">{u.displayName || "Unknown User"}</p>
                            <p className="text-xs text-gray-500 font-mono">ID: {u.displayId || u.uid}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-sm text-gray-500">No users found</div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>





          {/* Submit Button */}
          <button
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-[28px] shadow-2xl shadow-blue-600/30 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 text-lg"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" /> Processing Documents...
              </>
            ) : (
              "Create Approved Agency"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
