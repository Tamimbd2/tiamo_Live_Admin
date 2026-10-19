import { useState } from "react";
import { db } from "../../lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs } from "firebase/firestore";
import { X, Search } from "lucide-react";
import toast from "react-hot-toast";

interface BlockDeviceModalProps {
  onClose: () => void;
}

export default function BlockDeviceModal({ onClose }: BlockDeviceModalProps) {
  const [userId, setUserId] = useState("");
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

  const handleBlockDevice = async () => {
    if (!userFound) return;
    
    const deviceId = userFound.deviceId || userFound.device_id || "Unknown Device ID";
    const deviceName = userFound.deviceName || userFound.device_name || userFound.deviceModel || "Unknown Device";

    if (deviceId === "Unknown Device ID") {
        if (!window.confirm("No Device ID found for this user. Block with 'Unknown Device ID'?")) {
            return;
        }
    }

    setLoading(true);
    try {
      const banRef = doc(collection(db, "banned_devices"));
      await setDoc(banRef, {
        userId: userFound.displayId || userFound.id,
        name: userFound.name || userFound.fullName || userFound.displayName || "Unknown User",
        deviceId: deviceId,
        deviceName: deviceName,
        photoUrl: userFound.photoUrl || userFound.avatar || userFound.photo || "",
        timestamp: serverTimestamp(),
      });
      
      toast.success("Device blocked successfully");
      onClose();
    } catch (error) {
      console.error("Error blocking device:", error);
      toast.error("Failed to block device");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-xl font-bold dark:text-white">Block Device by User ID</h2>
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
              Enter User ID to Block Their Device
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
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold transition-all disabled:opacity-50"
              >
                {loading ? "Searching..." : <Search size={20} />}
              </button>
            </div>
          </div>

          {userFound && (
            <div className="mt-6 bg-rose-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-900/30 p-4 rounded-xl">
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
                <p><span className="font-semibold">Device Name:</span> {userFound.deviceName || userFound.deviceModel || "Unknown"}</p>
                <p><span className="font-semibold">Device ID:</span> {userFound.deviceId || userFound.device_id || "Unknown"}</p>
              </div>

              <button
                onClick={handleBlockDevice}
                disabled={loading}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white py-2.5 rounded-xl font-bold transition-all disabled:opacity-50"
              >
                {loading ? "Blocking..." : "Confirm Device Block"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
