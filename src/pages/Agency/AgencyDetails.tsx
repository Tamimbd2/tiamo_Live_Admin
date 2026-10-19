import { useState, useEffect } from "react";
import { useParams } from "react-router";
import { db } from "../../lib/firebase";
import { doc, getDoc, collection, onSnapshot, query, where, updateDoc, deleteDoc } from "firebase/firestore";
import { Search, UserPlus, Trash2, ShieldAlert } from "lucide-react";
import MemberModal from "./MemberModal";
import toast from "react-hot-toast";

interface Agency {
  name: string;
  holderName: string;
  whatsapp: string;
  status: string;
  logo: string;
}

interface Member {
  id: string;
  displayName: string;
  displayId: string;
  email: string;
  photoUrl: string;
  status: "active" | "blocked";
  agencyId: string;
}

export default function AgencyDetails() {
  const { id } = useParams<{ id: string }>();
  const [agency, setAgency] = useState<Agency | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState("");
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchAgency = async () => {
      const docSnap = await getDoc(doc(db, "agencies", id));
      if (docSnap.exists()) {
        setAgency(docSnap.data() as Agency);
      }
    };

    fetchAgency();

    const q = query(collection(db, "agency_members"), where("agencyId", "==", id));
    const unsubscribe = onSnapshot(q, (snap) => {
      setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() } as Member)));
    });

    return () => unsubscribe();
  }, [id]);

  const toggleMemberStatus = async (memberId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === "blocked" ? "active" : "blocked";
      await updateDoc(doc(db, "agency_members", memberId), { status: newStatus });
      toast.success(`Member ${newStatus}`);
    } catch {
      toast.error("Failed to update status");
    }
  };

  const deleteMember = async (memberId: string) => {
    if (!confirm("Remove this member?")) return;
    try {
      await deleteDoc(doc(db, "agency_members", memberId));
      toast.success("Member removed");
    } catch {
      toast.error("Failed to delete");
    }
  };

  const filteredMembers = members.filter(m =>
    m.displayName?.toLowerCase().includes(search.toLowerCase()) ||
    m.displayId?.includes(search)
  );

  return (
    <div className="p-6">
      {agency && (
        <div className="bg-gray-900 p-8 rounded-3xl flex flex-col md:flex-row gap-8 mb-8 border border-gray-800">
          <img src={agency.logo} className="w-32 h-32 rounded-3xl object-cover ring-2 ring-gray-800" alt="Logo" />
          <div className="grid grid-cols-2 flex-1 gap-4">
            <div><p className="text-gray-500 text-[10px] uppercase font-black">Agency Name</p><p className="text-xl font-bold text-white">{agency.name}</p></div>
            <div><p className="text-gray-500 text-[10px] uppercase font-black">Holder</p><p className="text-xl font-bold text-white">{agency.holderName}</p></div>
            <div><p className="text-gray-500 text-[10px] uppercase font-black">WhatsApp</p><p className="text-blue-400 font-bold">{agency.whatsapp}</p></div>
            <div><p className="text-gray-500 text-[10px] uppercase font-black">Status</p><p className="capitalize font-bold text-green-500">{agency.status}</p></div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 text-center">
          <p className="text-gray-500 text-sm font-medium">Total Members</p>
          <p className="text-3xl font-black text-white">{members.length}</p>
        </div>
        <div className="bg-green-500/10 p-6 rounded-2xl border border-green-500/20 text-center text-green-500">
          <p className="text-sm font-medium opacity-70">Active</p>
          <p className="text-3xl font-black">{members.filter(m => m.status === 'active').length}</p>
        </div>
        <div className="bg-red-500/10 p-6 rounded-2xl border border-red-500/20 text-center text-red-500">
          <p className="text-sm font-medium opacity-70">Blocked</p>
          <p className="text-3xl font-black">{members.filter(m => m.status === 'blocked').length}</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
        <div className="relative w-full md:w-1/3">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18}/>
          <input 
            onChange={(e) => setSearch(e.target.value)} 
            className="w-full bg-gray-900 border border-gray-800 p-4 pl-12 rounded-2xl outline-none focus:ring-2 ring-blue-500/20 text-white text-sm" 
            placeholder="Search by name or ID..." 
          />
        </div>
        <button 
          onClick={() => setIsMemberModalOpen(true)} 
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
        >
          <UserPlus size={18}/> Add Member
        </button>
      </div>

      <div className="bg-gray-950 border border-gray-800 rounded-[32px] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-900/50 text-[10px] text-gray-500 uppercase font-black tracking-widest">
              <tr>
                <th className="p-6">Member</th>
                <th className="p-6">ID / Email</th>
                <th className="p-6">Status</th>
                <th className="p-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filteredMembers.map(m => (
                <tr key={m.id} className="hover:bg-gray-900/30 transition-colors">
                  <td className="p-6 flex items-center gap-4">
                    <img src={m.photoUrl} className="w-10 h-10 rounded-full border-2 border-gray-800" alt="" />
                    <span className="font-bold text-gray-200">{m.displayName}</span>
                  </td>
                  <td className="p-6">
                    <p className="text-sm font-mono text-blue-400">{m.displayId}</p>
                    <p className="text-xs text-gray-500">{m.email}</p>
                  </td>
                  <td className="p-6">
                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${
                      m.status === 'active' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                    }`}>
                      {m.status}
                    </span>
                  </td>
                  <td className="p-6 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => toggleMemberStatus(m.id, m.status)} 
                        className="p-3 hover:bg-yellow-500/10 text-yellow-500 rounded-xl transition-all"
                        title="Toggle Block"
                      >
                        <ShieldAlert size={18}/>
                      </button>
                      <button 
                        onClick={() => deleteMember(m.id)} 
                        className="p-3 hover:bg-red-500/10 text-red-500 rounded-xl transition-all"
                        title="Remove Member"
                      >
                        <Trash2 size={18}/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredMembers.length === 0 && (
          <div className="p-20 text-center text-gray-600 font-medium">No members found</div>
        )}
      </div>
      {isMemberModalOpen && <MemberModal agencyId={id!} onClose={() => setIsMemberModalOpen(false)} />}
    </div>
  );
}
