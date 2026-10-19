import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  collection,
  query,
  onSnapshot,
  deleteDoc,
  doc,
  orderBy,
} from "firebase/firestore";
import { db } from "../../lib/firebase"; 
import { CheckCircle, Eye, UserCircle, Paperclip } from "lucide-react";

export interface Attachment {
  url: string;
  type: "image" | "video";
}

export interface SupportTicket {
  id: string;
  uid: string;
  name: string;
  email: string;
  photoUrl?: string;
  description: string;
  attachments?: Attachment[];
  status: "pending" | "solved";
  timestamp: number;
}

export default function SupportList() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const q = query(
      collection(db, "support_tickets"),
      orderBy("timestamp", "desc"),
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTickets(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        } as SupportTicket))
      );
    });
    return () => unsubscribe();
  }, []);

  const handleSolve = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Ticket-ti solve hoyeche?")) {
      await deleteDoc(doc(db, "support_tickets", id));
    }
  };

  return (
    <div className="p-6 bg-white dark:bg-gray-950 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white uppercase tracking-tighter">
          Support Requests (Firestore)
        </h1>
        <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-gray-800">
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="p-4 text-[10px] font-black uppercase text-gray-400">
                  User
                </th>
                <th className="p-4 text-[10px] font-black uppercase text-gray-400">
                  Email
                </th>
                <th className="p-4 text-[10px] font-black uppercase text-gray-400">
                  Files
                </th>
                <th className="p-4 text-[10px] font-black uppercase text-gray-400 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {tickets.map((ticket) => (
                <tr
                  key={ticket.id}
                  onClick={() =>
                    navigate(`/admin/support/${ticket.id}`, { state: ticket })
                  }
                  className="hover:bg-gray-50 dark:hover:bg-gray-900/40 cursor-pointer"
                >
                  <td className="p-4 flex items-center gap-3">
                    {ticket.photoUrl ? (
                      <img
                        src={ticket.photoUrl}
                        className="w-8 h-8 rounded-xl object-cover"
                      />
                    ) : (
                      <UserCircle className="w-8 h-8 text-gray-300" />
                    )}
                    <span className="font-bold text-gray-900 dark:text-gray-100">
                      {ticket.name}
                    </span>
                  </td>
                  <td className="p-4 text-xs text-gray-500">{ticket.email}</td>
                  <td className="p-4">
                    {ticket.attachments && ticket.attachments.length > 0 && (
                      <div className="flex items-center gap-1 text-[10px] bg-emerald-500/10 text-emerald-600 px-2 py-1 rounded-full w-fit font-bold">
                        <Paperclip size={10} /> {ticket.attachments.length}
                      </div>
                    )}
                  </td>
                  <td className="p-4 text-right space-x-2">
                    <button className="p-2 text-blue-500">
                      <Eye size={18} />
                    </button>
                    <button
                      onClick={(e) => handleSolve(ticket.id, e)}
                      className="p-2 text-emerald-500"
                    >
                      <CheckCircle size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
