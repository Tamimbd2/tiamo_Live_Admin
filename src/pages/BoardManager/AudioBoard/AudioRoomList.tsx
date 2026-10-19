import { useState, useEffect } from "react";
import { ref, onValue, Unsubscribe } from "firebase/database";
import { rtdb } from "../../../lib/firebase";
import { Mic, Search } from "lucide-react";
import { AudioRoomCard } from "./AudioRoomCard";

export interface AudioRoom {
  id: string;
  roomName?: string;
  hostId?: string;
  participantCount?: number;
  isActive?: boolean;
  [key: string]: unknown;
}

export default function AudioRoomList() {
  const [rooms, setRooms] = useState<AudioRoom[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const roomsRef = ref(rtdb, "rooms");
    const unsubscribe: Unsubscribe = onValue(roomsRef, (snapshot) => {
      const data = snapshot.val() as Record<
        string,
        Omit<AudioRoom, "id">
      > | null;
      if (data) {
        const roomList: AudioRoom[] = Object.keys(data).map((id) => ({
          id,
          ...data[id],
        }));
        setRooms(roomList);
      } else {
        setRooms([]);
      }
    });
    return () => unsubscribe();
  }, []);

  const filteredRooms = rooms.filter(
    (room) =>
      room.isActive === true &&
      ((room.roomName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
       room.id.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  return (
    <div className="min-h-screen p-4 sm:p-6 md:p-10 bg-[#FDFCF9] dark:bg-gray-950 transition-colors duration-500">
      <div className="max-w-7xl mx-auto">
        <header className="mb-10 md:mb-16 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F5EDDE] dark:bg-gray-900 border border-[#39180F]/5 text-[#39180F] dark:text-emerald-400 text-[9px] font-black uppercase tracking-[0.2em]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Network
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter text-black] dark:text-white uppercase leading-none">
              Audio <span className="text-emerald-600">Boards</span>
            </h1>
          </div>

          <div className="relative w-full lg:w-80 group">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-600 transition-colors "
              size={18}
            />
            <input
              type="text"
              placeholder="Search Room ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl text-xs focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all dark:text-white"
            />
          </div>
        </header>

        {filteredRooms.length > 0 ? (
          <div className="md:flex md:flex-wrap grid grid-cols-2 pt-5 gap-8 justify-center">
            {filteredRooms.map((room) => (
              <AudioRoomCard key={room.id} room={room} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-gray-900 rounded-[2rem] border border-dashed border-gray-100 dark:border-gray-800">
            <Mic size={40} className="text-gray-200 dark:text-gray-800 mb-4" />
            <h2 className="text-lg font-black text-[#39180F] dark:text-white uppercase tracking-tight">
              No Active Channels
            </h2>
            <p className="text-gray-400 text-xs">Waiting for live data...</p>
          </div>
        )}
      </div>
    </div>
  );
}
