import { useState } from "react";
import { db } from "../../lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs } from "firebase/firestore";
import { X, Search } from "lucide-react";
import toast from "react-hot-toast";

interface BlockEmailByUserIdModalProps {
  onClose: () => void;
}

export default function BlockEmailByUserIdModal({ onClose }: BlockEmailByUserIdModalProps) {
  const [userId, setUserId] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [userFound, setUserFound] = useState<any>(null);

  const handleSearchUser = async () => {
    if (!userId.trim()) {
      toast.error("Please enter a User ID");
      return;
    }
    
    setLoading(true);
    setUserFound(null);
    try {
      // Trying to fetch by displayId or UID
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("displayId", "==", userId.trim()));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const docSnap = querySnapshot.docs[0];
        setUserFound({ id: docSnap.id, ...docSnap.data() });
      } else {
         // Fallback to searching by UID
         const docRef = doc(db, "users", userId.trim());
         const docSnap = await getDoc(docRef);
         if (docSnap.exists()) {
             setUserFound({ id: docSnap.id, ...docSnap.data() });
         } else {
             toast.error("User not found");
         }
      }
    } catch (error) {
      console.error(error);
      toast.error("Error searching for user");
    } finally {
      setLoading(false);
    }
  };

  const handleBlockEmail = async () => {
    if (!userFound) return;
    
    const email = userFound.email;

    if (!email) {
      toast.error("This user does not have an email address associated with their profile.");
      return;
    }

    setLoading(true);
    try {
      const banRef = doc(collection(db, "banned_emails"));
      await setDoc(banRef, {
        userId: userFound.displayId || userFound.id,
        name: userFound.name || userFound.fullName || userFound.displayName || "Unknown User",
        email: email.trim().toLowerCase(),
        reason: reason.trim() || "No reason provided",
        photoUrl: userFound.photoUrl || userFound.avatar || userFound.photo || "",
        timestamp: serverTimestamp(),
      });
      
      toast.success("Email blocked successfully");
      onClose();
    } catch (error) {
      console.error("Error blocking email:", error);
      toast.error("Failed to block email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-xl font-bold dark:text-white">Block Email by User ID</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded-xl transition-all"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
              Enter User ID
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. 10001"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="flex-1 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-xl px-4 py-2 focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={handleSearchUser}
                disabled={loading}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-xl font-bold transition-all disabled:opacity-50"
              >
                {loading ? "Searching..." : <Search size={20} />}
              </button>
            </div>
          </div>

          {userFound && (
            <div className="mt-6 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 p-4 rounded-xl">
              <div className="flex items-center gap-4 mb-4">
                <img
                  src={
                    userFound.photoUrl ||
                    userFound.avatar ||
                    userFound.photo ||
                    `https://ui-avatars.com/api/?name=${userFound.name || "U"}`
                  }
                  alt="Avatar"
                  className="w-12 h-12 rounded-full border border-gray-200 object-cover"
                />
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">
                    {userFound.name || userFound.fullName || userFound.displayName}
                  </h3>
                  <p className="text-sm text-gray-500">ID: {userFound.displayId || userFound.id}</p>
                </div>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-4 bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                <p><span className="font-semibold">Email:</span> {userFound.email || <span className="text-red-500">Not Found</span>}</p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
                  Reason (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Why is this email being blocked?"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-900 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 text-sm"
                />
              </div>

              <button
                onClick={handleBlockEmail}
                disabled={loading || !userFound.email}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2.5 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Blocking..." : !userFound.email ? "No Email to Block" : "Confirm Email Block"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
