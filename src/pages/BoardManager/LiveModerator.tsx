import { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router";
import { ref, onValue, Unsubscribe, remove } from "firebase/database";
import { rtdb } from "../../lib/firebase";
import { Search, ShieldAlert, PowerOff } from "lucide-react";
import ModeratorTable from "./ModeratorTable";
import toast from "react-hot-toast";
import { useNavigate } from "react-router";

interface ParticipantData {
  isOnline?: boolean;
  isMuted?: boolean;
  joinedAt?: number;
  role?: string;
  [key: string]: unknown;
}

interface Participant extends ParticipantData {
  id: string;
}

export default function LiveModerator() {
  const { mode, roomId } = useParams<{ mode: "audio" | "video"; roomId: string }>();
  const [users, setUsers] = useState<Participant[]>([]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [ending, setEnding] = useState(false);
  const isAudio = mode === "audio";
  const navigate = useNavigate();

  useEffect(() => {
    if (!mode || !roomId) return;
    const path = isAudio ? `room_participants/${roomId}` : `live_participants/${roomId}`;
    const refPoint = ref(rtdb, path);
    const unsub: Unsubscribe = onValue(refPoint, (snap) => {
      const data = snap.val();
      setUsers(
        data
          ? Object.keys(data).map((id) => ({
              id,
              ...(data[id] as ParticipantData),
            }))
          : []
      );
    });
    return () => unsub();
  }, [roomId, mode, isAudio]);

  const filtered = useMemo(
    () => users.filter((u) => u.id.toLowerCase().includes(query.toLowerCase())),
    [users, query]
  );

  const handleEndStream = async () => {
    if (!roomId) return;
    
    if (!window.confirm("Are you sure you want to completely remove and end this live stream?")) {
      return;
    }

    setEnding(true);
    try {
      const streamPath = isAudio ? `rooms/${roomId}` : `live_streams/${roomId}`;
      const participantsPath = isAudio ? `room_participants/${roomId}` : `live_participants/${roomId}`;
      
      await Promise.all([
        remove(ref(rtdb, streamPath)),
        remove(ref(rtdb, participantsPath))
      ]);

      toast.success("Stream ended successfully");
      navigate(isAudio ? "/audio-board" : "/video-board");
    } catch (error) {
      console.error("Error ending stream:", error);
      toast.error("Failed to end stream");
      setEnding(false);
    }
  };

  if (!mode || !roomId) {
    return (
      <div className="h-screen flex items-center justify-center dark:bg-black">
        <ShieldAlert size={40} className="text-red-500 opacity-20" />
      </div>
    );
  }

  return (
    <div className="bg-[#FAFAFA] dark:bg-black md:p-12 min-h-screen transition-all duration-700">
      <div>
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8 mb-16">
          <div className="space-y-3">
            <div
              className={`px-4 py-1 rounded-full border w-fit text-[9px] font-black uppercase tracking-[0.3em] ${
                isAudio
                  ? "bg-emerald-50 border-emerald-100/50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                  : "bg-purple-50 border-purple-100/50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400"
              }`}
            >
              Access Level: System {mode}
            </div>
            <h1 className="text-6xl sm:text-7xl font-black tracking-tighter text-gray-900 dark:text-white uppercase leading-none">
              Terminal{" "}
              <span className={isAudio ? "text-emerald-500" : "text-purple-600"}>
                Alpha
              </span>
            </h1>
          </div>
          <div className="relative w-full lg:w-72 group">
            <Search
              className={`absolute left-5 top-1/2 -translate-y-1/2 transition-colors ${
                isAudio
                  ? "group-focus-within:text-emerald-500"
                  : "group-focus-within:text-purple-500"
              } text-gray-400`}
              size={18}
            />
            <input
              type="text"
              placeholder="SEARCH UID"
              className="w-full pl-14 pr-6 py-4 border border-gray-200 dark:border-white/5 rounded-2xl text-[10px] font-bold tracking-widest outline-none dark:text-white focus:ring-4 focus:ring-black/5 dark:focus:ring-white/5"
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <button 
            onClick={handleEndStream}
            disabled={ending}
            className="flex items-center gap-2 bg-[#ef4444] hover:bg-red-600 text-white px-6 py-4 rounded-2xl font-bold uppercase tracking-wider text-xs transition-all lg:ml-auto w-full lg:w-auto justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <PowerOff size={16} />
            {ending ? "Ending..." : "End Live"}
          </button>
        </header>

        <ModeratorTable
          data={filtered}
          mode={mode}
          roomId={roomId}
          isAudio={isAudio}
          currentPage={page}
          onPageChange={setPage}
          itemsPerPage={10}
        />
      </div>
    </div>
  );
}
