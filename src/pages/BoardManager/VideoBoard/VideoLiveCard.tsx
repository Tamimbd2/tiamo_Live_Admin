import { Link } from "react-router";
import { Video, ArrowRight, Hash, Users } from "lucide-react";

interface LiveStream {
  id: string;
  title?: string;
  status?: string;
  hostId?: string;
  hostName?: string;
  participantCount?: number;
  [key: string]: any;
}

export const VideoLiveCard = ({ stream }: { stream: LiveStream }) => {
  const count = stream.participantCount || 0;

  return (
    <div className="bg-white md:w-70 dark:bg-gray-900 rounded-[2rem] p-6 dark:border-gray-800 shadow-sm border border-gray-200 flex flex-col justify-between h-full group">
      <div>
        <div className="flex justify-between items-start mb-6">
          <div className="h-12 w-12 bg-purple-50 dark:bg-purple-900/20 rounded-xl flex items-center justify-center text-purple-600 dark:text-purple-400">
            <Video size={24} strokeWidth={2.5} />
          </div>

          <div className="flex flex-col items-end">
            <div className="flex items-center gap-2 mb-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              <span className="text-[10px] font-black tracking-widest text-red-600 dark:text-red-400 uppercase bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-md">
                {stream.status || "Live"}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
              <Users size={12} />
              <span className="text-[10px] font-black uppercase tracking-tight">
                {count} Active
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-1 mb-8">
          <h3 className="text-lg md:text-xl font-black text-black dark:text-white truncate tracking-tight uppercase leading-tight">
            {stream.title || stream.hostName || "Untitled Stream"}
          </h3>
          <div className="flex items-center gap-1.5 text-gray-400 font-mono text-[9px] tracking-tighter">
            <Hash size={10} className="text-purple-500" />
            {stream.id}
          </div>
        </div>
      </div>

      <Link
        to={`/live-moderate/video/${stream.id}`}
        className="relative md:flex items-center justify-between w-full p-4 bg-purple-600 text-white rounded-xl font-black text-[10px] uppercase tracking-[0.2em] overflow-hidden active:scale-[0.98] transition-transform hidden md:block"
      >
        <span className="relative z-10">Manage Stream</span>
        <ArrowRight size={16} className="relative z-10" />
      </Link>
      <Link
        to={`/live-moderate/video/${stream.id}`}
        className="relative flex items-center justify-between w-full p-4 bg-purple-600 text-white rounded-xl font-black text-[10px] uppercase tracking-[0.2em] overflow-hidden active:scale-[0.98] transition-transform md:hidden block"
      >
        <span className="relative z-10">Manage</span>
        <ArrowRight size={16} className="relative z-10" />
      </Link>
    </div>
  );
};
