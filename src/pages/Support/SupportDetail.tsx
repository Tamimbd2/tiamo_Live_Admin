import { useLocation, useNavigate, useParams } from "react-router";
import { ref, remove } from "firebase/database";
import { rtdb } from "../../lib/firebase";
import { ArrowLeft, CheckCircle, Clock, Mail, User, ShieldAlert, FileText } from "lucide-react";
import { SupportTicket } from "./Support";

export default function SupportDetail() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { id } = useParams();
  const ticket = state as SupportTicket;

  if (!ticket) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500 animate-pulse">Loading support data...</p>
      </div>
    );
  }

  const handleSolve = async () => {
    if (window.confirm("Mark as resolved? This will remove the ticket permanently.")) {
      await remove(ref(rtdb, `support_tickets/${id}`));
      navigate("/admin/support");
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-10 bg-[#FDFCF9] dark:bg-gray-950 transition-colors duration-500">
      <div className="max-w-5xl mx-auto">
        
        <button 
          onClick={() => navigate(-1)}
          className="group flex items-center gap-2 text-gray-500 hover:text-black dark:hover:text-white mb-8 transition-all"
        >
          <div className="p-2 rounded-full group-hover:bg-gray-100 dark:group-hover:bg-gray-900">
            <ArrowLeft size={20} />
          </div>
          <span className="font-bold text-sm uppercase tracking-widest">Back to Queue</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-8 border border-gray-100 dark:border-gray-800 shadow-sm">
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-4">
                  {ticket.photoUrl ? (
                    <img src={ticket.photoUrl} className="w-24 h-24 rounded-[2rem] object-cover ring-4 ring-emerald-500/10" />
                  ) : (
                    <div className="w-24 h-24 rounded-[2rem] bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400">
                      <User size={40} />
                    </div>
                  )}
                  <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-1.5 rounded-xl border-4 border-white dark:border-gray-900">
                    <ShieldAlert size={14} />
                  </div>
                </div>
                
                <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">{ticket.name}</h2>
                <p className="text-xs text-gray-400 font-mono mb-6">{ticket.uid}</p>
                
                <div className="w-full space-y-3 text-left">
                  <div className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/50">
                    <Mail size={16} className="text-emerald-600" />
                    <span className="text-xs font-medium truncate dark:text-gray-300">{ticket.email}</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/50">
                    <Clock size={16} className="text-emerald-600" />
                    <span className="text-xs font-medium dark:text-gray-300">
                      {new Date(ticket.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <button 
              onClick={handleSolve}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white p-5 rounded-[2rem] font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all shadow-xl shadow-emerald-500/20 active:scale-95"
            >
              <CheckCircle size={20} />
              Resolve Ticket
            </button>
          </div>

          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-8 md:p-10 border border-gray-100 dark:border-gray-800 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-600">
                  <FileText size={20} />
                </div>
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-gray-400">Issue Description</h3>
              </div>
              
              <p className="text-lg text-gray-700 dark:text-gray-200 leading-relaxed font-medium mb-10">
                {ticket.description}
              </p>

              {ticket.attachments && ticket.attachments.length > 0 && (
                <div className="space-y-6">
                  <div className="h-px bg-gray-100 dark:bg-gray-800 w-full" />
                  <h3 className="text-sm font-black uppercase tracking-[0.2em] text-gray-400">Evidence Attachments ({ticket.attachments.length})</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {ticket.attachments.map((file, index) => (
                      <div key={index} className="group relative rounded-3xl overflow-hidden bg-black aspect-video border border-gray-200 dark:border-gray-700 shadow-inner">
                        {file.type === "video" ? (
                          <video 
                            src={file.url} 
                            controls 
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <img 
                            src={file.url} 
                            alt={`Evidence ${index + 1}`} 
                            className="w-full h-full object-contain cursor-zoom-in group-hover:scale-105 transition-transform duration-700"
                            onClick={() => window.open(file.url, '_blank')}
                          />
                        )}
                        <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase">
                          {file.type}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
