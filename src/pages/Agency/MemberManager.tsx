import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc, 
  updateDoc, 
  serverTimestamp,
  Timestamp 
} from "firebase/firestore";
import { Trash2 , ShieldAlert, Search, Users, CheckCircle2, XCircle } from "lucide-react";
import toast from "react-hot-toast";

interface Member {
  id: string;
  email: string;
  displayName?: string;
  photoUrl?: string;
  role: "admin" | "editor" | "viewer";
  status: "active" | "blocked";
  joinedAt?: Timestamp;
}

export default function MemberManager({ agencyId }: { agencyId: string }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [email, setEmail] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "agencies", agencyId, "members"), (snap) => {
      setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() } as Member)));
    });
    return () => unsub();
  }, [agencyId]);

  const activeCount = members.filter(m => m.status === "active").length;
  const blockedCount = members.filter(m => m.status === "blocked").length;

  const addMember = async () => {
    if (!email) return toast.error("Enter email");
    const tid = toast.loading("Adding...");
    try {
      const memberId = crypto.randomUUID();
      const newMember: Omit<Member, "id"> = {
        email,
        role: "editor",
        status: "active",
        joinedAt: serverTimestamp() as unknown as Timestamp
      };

      await setDoc(doc(db, "agencies", agencyId, "members", memberId), newMember);
      toast.success("Member Added", { id: tid });
      setEmail("");
    } catch {
      toast.error("Error", { id: tid });
    }
  };

  const toggleBlock = async (id: string, current: Member["status"]) => {
    try {
      await updateDoc(doc(db, "agencies", agencyId, "members", id), {
        status: current === "active" ? "blocked" : "active"
      });
      toast.success("Status Updated");
    } catch {
      toast.error("Failed");
    }
  };

  const removeMember = async (id: string) => {
    if (!window.confirm("Remove member?")) return;
    try {
      await deleteDoc(doc(db, "agencies", agencyId, "members", id));
      toast.success("Removed");
    } catch {
      toast.error("Failed");
    }
  };

  const filteredMembers = members.filter(m => 
    m.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="mt-10 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-[2rem] border border-blue-100 dark:border-blue-900/20">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500 rounded-2xl text-white"><Users size={24}/></div>
            <div>
              <p className="text-sm text-blue-600 font-bold uppercase tracking-wider">Total Members</p>
              <h3 className="text-3xl font-black dark:text-white">{members.length}</h3>
            </div>
          </div>
        </div>
        <div className="bg-green-50 dark:bg-green-900/10 p-6 rounded-[2rem] border border-green-100 dark:border-green-900/20">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-500 rounded-2xl text-white"><CheckCircle2 size={24}/></div>
            <div>
              <p className="text-sm text-green-600 font-bold uppercase tracking-wider">Active</p>
              <h3 className="text-3xl font-black dark:text-white">{activeCount}</h3>
            </div>
          </div>
        </div>
        <div className="bg-red-50 dark:bg-red-900/10 p-6 rounded-[2rem] border border-red-100 dark:border-red-900/20">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-500 rounded-2xl text-white"><XCircle size={24}/></div>
            <div>
              <p className="text-sm text-red-600 font-bold uppercase tracking-wider">Blocked</p>
              <h3 className="text-3xl font-black dark:text-white">{blockedCount}</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text"
            placeholder="Search name, email or UID..." 
            className="w-full pl-12 pr-4 py-4 bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <input 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            placeholder="Member Email" 
            className="flex-1 md:w-64 p-4 bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-2xl outline-none" 
          />
          <button onClick={addMember} className="bg-blue-600 hover:bg-blue-700 text-white px-8 rounded-2xl font-bold transition-all shadow-lg active:scale-95">
            Add
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-[2.5rem] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-gray-800/50 border-b dark:border-gray-800">
              <tr>
                <th className="p-6 text-[10px] font-black uppercase text-gray-400 tracking-widest">User Details</th>
                <th className="p-6 text-[10px] font-black uppercase text-gray-400 tracking-widest">Unique UID</th>
                <th className="p-6 text-[10px] font-black uppercase text-gray-400 tracking-widest">Status</th>
                <th className="p-6 text-right text-[10px] font-black uppercase text-gray-400 tracking-widest">Management</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-gray-800">
              {filteredMembers.map(m => (
                <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                  <td className="p-6">
                    <div className="flex items-center gap-4">
                      <img 
                        src={m.photoUrl || "https://ui-avatars.com/api/?name=" + m.email} 
                        className="w-12 h-12 rounded-2xl object-cover border dark:border-gray-700" 
                        alt="" 
                      />
                      <div>
                        <p className="font-bold dark:text-white">{m.displayName || "Unknown User"}</p>
                        <p className="text-xs text-gray-500">{m.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-6">
                    <span className="text-[11px] font-mono bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-lg text-gray-500 uppercase tracking-tighter">
                      {m.id}
                    </span>
                  </td>
                  <td className="p-6">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${m.status === 'active' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                      <span className={`text-[10px] font-black uppercase tracking-tighter ${m.status === 'active' ? 'text-green-600' : 'text-red-600'}`}>
                        {m.status}
                      </span>
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => toggleBlock(m.id, m.status)} 
                        className="p-3 bg-yellow-50 text-yellow-600 rounded-xl hover:bg-yellow-600 hover:text-white transition-all shadow-sm"
                      >
                        <ShieldAlert size={18}/>
                      </button>
                      <button 
                        onClick={() => removeMember(m.id)} 
                        className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm"
                      >
                        <Trash2 size={18}/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredMembers.length === 0 && (
            <div className="p-20 text-center text-gray-500">No members found in this agency.</div>
          )}
        </div>
      </div>
    </div>
  );
}
