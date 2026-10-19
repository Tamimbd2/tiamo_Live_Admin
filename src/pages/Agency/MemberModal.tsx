import { useState } from "react";
import { db } from "../../lib/firebase";
import { collection, query, where, getDocs, setDoc, doc, serverTimestamp } from "firebase/firestore";
import { Search, X, UserPlus, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

interface UserResult {
  uid: string;
  displayId: string;
  displayName: string;
  email: string;
  photoUrl: string;
}

export default function MemberModal({ agencyId, onClose }: { agencyId: string, onClose: () => void }) {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);

  const searchUsers = async () => {
    if (!term.trim()) return;
    setLoading(true);
    try {
      const q = query(collection(db, "users"), where("displayId", "==", term.trim()));
      const snap = await getDocs(q);
      const users = snap.docs.map(d => ({
        uid: d.id,
        ...d.data()
      })) as UserResult[];
      
      setResults(users);
      if (users.length === 0) toast.error("No user found");
    } catch {
      toast.error("Search failed");
    } finally {
      setLoading(false);
    }
  };

  const addMember = async (user: UserResult) => {
    try {
      await setDoc(doc(db, "agency_members", `${agencyId}_${user.uid}`), {
        agencyId,
        uid: user.uid,
        displayName: user.displayName,
        displayId: user.displayId,
        email: user.email,
        photoUrl: user.photoUrl,
        status: "active",
        joinedAt: serverTimestamp()
      });
      toast.success("Member added");
      onClose();
    } catch {
      toast.error("Error adding member");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-gray-950 border border-gray-800 w-full max-w-md rounded-[32px] p-8 shadow-2xl animate-in zoom-in duration-200">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-xl font-black text-white">Add Member</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-full transition-colors">
            <X className="text-gray-400" />
          </button>
        </div>

        <div className="flex gap-2 mb-8">
          <input 
            value={term} 
            onChange={(e) => setTerm(e.target.value)} 
            onKeyDown={(e) => e.key === 'Enter' && searchUsers()}
            className="flex-1 bg-gray-900 border border-gray-800 p-4 rounded-2xl outline-none focus:ring-2 ring-blue-500/20 text-white text-sm" 
            placeholder="Search Display ID..." 
          />
          <button 
            onClick={searchUsers} 
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 rounded-2xl transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : <Search size={20}/>}
          </button>
        </div>
        
        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
          {results.map(user => (
            <div key={user.uid} className="bg-gray-900/50 p-4 rounded-2xl flex items-center justify-between border border-gray-800 group hover:border-blue-500/50 transition-all">
              <div className="flex items-center gap-4">
                <img src={user.photoUrl} className="w-12 h-12 rounded-full object-cover ring-2 ring-gray-800" alt="" />
                <div>
                  <p className="font-bold text-white text-sm">{user.displayName}</p>
                  <p className="text-[10px] text-gray-500 font-mono">ID: {user.displayId}</p>
                </div>
              </div>
              <button 
                onClick={() => addMember(user)} 
                className="bg-blue-600 hover:bg-blue-700 p-3 rounded-xl text-white shadow-lg shadow-blue-500/20 transition-all active:scale-90"
              >
                <UserPlus size={18}/>
              </button>
            </div>
          ))}
          {!loading && results.length === 0 && term && (
            <p className="text-center text-gray-600 text-xs py-10 font-medium">Search for users by their Display ID</p>
          )}
        </div>
      </div>
    </div>
  );
}
