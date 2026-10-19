import { Link } from "react-router";
import { Mic, Users, ArrowRight, Plus, Hash } from "lucide-react";

interface AudioRoom {
  id: string;
  roomName?: string;
  hostId?: string;
  hostName?: string;
  participantCount?: number;
  [key: string]: any;
}

export const AudioRoomCard = ({ room }: { room: AudioRoom }) => {
  const count = room.participantCount || 0;
  const displayAvatars = Math.min(count, 3);
  const extra = count - 3;

  return (
    <div className="bg-white md:w-70 dark:bg-gray-900 rounded-[2rem] p-6 dark:border-gray-800 shadow-sm border border-gray-200 flex flex-col justify-between h-full group ">
      <div>
        <div className="flex justify-between items-start mb-6">
          <div className="h-12 w-12 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Mic size={24} strokeWidth={2.5} />
          </div>

          <div className="flex flex-col items-end">
            <div className="flex items-center -space-x-3 mb-2">
              {count > 0 ? (
                <>
                  {[...Array(displayAvatars)].map((_, i) => (
                    <div
                      key={i}
                      className="h-9 w-9 rounded-full border-2 border-white dark:border-gray-900 bg-gray-100 dark:bg-gray-800 overflow-hidden shrink-0"
                    >
                      <img
                        src={`https://i.pravatar.cc/150?u=${room.id}${i}`}
                        className="w-full h-full object-cover"
                        alt="member"
                      />
                    </div>
                  ))}
                  {extra > 0 && (
                    <div className="h-9 w-9 rounded-full border-2 border-white dark:border-gray-900 bg-emerald-600 text-white flex items-center justify-center text-[9px] font-black z-10 shrink-0">
                      <Plus size={8} />
                      {extra}
                    </div>
                  )}
                </>
              ) : (
                <div className="h-9 w-9 rounded-full border-2 border-dashed border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-300">
                  <Users size={14} />
                </div>
              )}
            </div>
            <span className="text-[9px] font-black tracking-widest text-emerald-600 dark:text-emerald-400 uppercase bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-md">
              {count} Active
            </span>
          </div>
        </div>

        <div className="space-y-1 mb-8">
          <h3 className="text-lg md:text-xl font-black text-black dark:text-white truncate tracking-tight uppercase">
            {room.roomName || room.hostName || "Untitled"}
          </h3>
          <div className="flex items-center gap-1.5 text-gray-400 font-mono text-[9px] tracking-tighter">
            <Hash size={10} className="text-emerald-500" />
            {room.id}
          </div>
        </div>
      </div>

      <Link
        to={`/live-moderate/audio/${room.id}`}
        className="relative md:flex items-center justify-between w-full p-4 hidden md:block bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-[0.2em] overflow-hidden dark:hover:bg-white hover:text-emerald-400  active:scale-[0.98] transition-transform hover:bg-gray-200"
      >
        <span className="relative z-10">Launch Moderator</span>
        <ArrowRight size={16} className="relative z-10" />
      </Link>
      <Link
        to={`/live-moderate/audio/${room.id}`}
        className="relative flex items-center justify-between w-full p-4 md:hidden block bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-[0.2em] overflow-hidden dark:hover:bg-white hover:text-emerald-400  active:scale-[0.98] transition-transform hover:bg-gray-200"
      >
        <span className="relative z-10">Manage</span>
        <ArrowRight size={16} className="relative z-10" />
      </Link>
    </div>
  );
};
