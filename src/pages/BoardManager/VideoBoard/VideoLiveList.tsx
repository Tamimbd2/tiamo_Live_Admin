import { useState, useEffect } from "react";
import { ref, onValue, Unsubscribe } from "firebase/database";
import { rtdb } from "../../../lib/firebase";
import { Search, Ghost } from "lucide-react";
import { VideoLiveCard } from "./VideoLiveCard";

interface LiveStream {
  id: string;
  title?: string;
  status?: string;
  hostId?: string;
  participantCount?: number;
  isActive?: boolean;
  [key: string]: unknown;
}

export default function VideoLiveList() {
  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const streamsRef = ref(rtdb, "live_streams");
    const unsubscribe: Unsubscribe = onValue(streamsRef, (snapshot) => {
      const data = snapshot.val() as Record<
        string,
        Omit<LiveStream, "id">
      > | null;
      if (data) {
        const streamList: LiveStream[] = Object.keys(data).map((id) => ({
          id,
          ...data[id],
        }));
        setStreams(streamList);
      } else {
        setStreams([]);
      }
    });
    return () => unsubscribe();
  }, []);

  const filteredStreams = streams.filter(
    (stream) =>
      stream.isActive === true &&
      ((stream.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
       stream.id.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  return (
    <div className="min-h-screen p-4 sm:p-6 md:p-10 bg-[#FDFCF9] dark:bg-gray-950 transition-colors duration-500">
      <div className="max-w-7xl mx-auto">
        <header className="mb-10 md:mb-16 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 text-purple-600 dark:text-purple-400 text-[9px] font-black uppercase tracking-[0.2em]">
              <span className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-pulse" />
              Surveillance Center
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter text-black dark:text-white uppercase leading-none">
              Video <span className="text-purple-600">Streams</span>
            </h1>
          </div>

          <div className="relative w-full lg:w-80 group">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-purple-600 transition-colors"
              size={18}
            />
            <input
              type="text"
              placeholder="Search stream ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl text-xs focus:ring-4 focus:ring-purple-500/5 outline-none transition-all dark:text-white"
            />
          </div>
        </header>

        {filteredStreams.length > 0 ? (
          <div className="md:flex md:flex-wrap grid grid-cols-2 pt-5 gap-8 justify-center">
            {filteredStreams.map((stream) => (
              <VideoLiveCard key={stream.id} stream={stream} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-gray-900 rounded-[2rem] border border-dashed border-gray-200 dark:border-gray-800">
            <Ghost
              size={40}
              className="text-gray-200 dark:text-gray-800 mb-4"
            />
            <h2 className="text-lg font-black text-black dark:text-white uppercase tracking-tight">
              System Idle
            </h2>
            <p className="text-gray-400 text-xs">
              No active video broadcast signals detected.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
