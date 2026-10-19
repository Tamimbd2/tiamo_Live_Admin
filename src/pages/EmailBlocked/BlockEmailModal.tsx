import { useState } from "react";
import { db } from "../../lib/firebase";
import { doc, setDoc, serverTimestamp, collection } from "firebase/firestore";
import { X } from "lucide-react";
import toast from "react-hot-toast";

interface BlockEmailModalProps {
  onClose: () => void;
}

export default function BlockEmailModal({ onClose }: BlockEmailModalProps) {
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleBlockEmail = async () => {
    if (!email.trim()) {
      toast.error("Please enter an email address");
      return;
    }
    
    // basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast.error("Please enter a valid email address");
      return;
    }

    setLoading(true);
    try {
      const banRef = doc(collection(db, "banned_emails"));
      await setDoc(banRef, {
        email: email.trim().toLowerCase(),
        reason: reason.trim() || "No reason provided",
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
          <h2 className="text-xl font-bold dark:text-white">Block Email Address</h2>
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
              Email Address
            </label>
            <input
              type="email"
              placeholder="e.g. user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-xl px-4 py-2 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
              Reason (Optional)
            </label>
            <textarea
              placeholder="Why is this email being blocked?"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-xl px-4 py-2 focus:outline-none focus:border-blue-500 resize-none h-24"
            />
          </div>

          <button
            onClick={handleBlockEmail}
            disabled={loading}
            className="w-full bg-[#ef4444] hover:bg-red-600 text-white py-2.5 rounded-xl font-bold transition-all disabled:opacity-50"
          >
            {loading ? "Blocking..." : "Confirm Email Block"}
          </button>
        </div>
      </div>
    </div>
  );
}
