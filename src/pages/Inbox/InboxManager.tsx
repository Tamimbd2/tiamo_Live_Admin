import { useState, useEffect } from "react";
import { ref, onValue, remove } from "firebase/database";
import { collection, getDocs } from "firebase/firestore";
import { rtdb, db } from "../../lib/firebase";
import { Loader2, ArrowLeft, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

type UserData = {
  id: string;
  displayName?: string;
  displayId?: string;
  photoUrl?: string;
};

type Message = {
  id: string;
  isRead?: boolean;
  senderId: string;
  text?: string;
  timestamp: number;
  type?: string;
  [key: string]: any;
};

type ChatRoom = {
  roomId: string;
  senderId: string;
  receiverId: string;
  latestMessage: Message;
  timestamp: number;
  messages: Message[];
};

export default function InboxManager() {
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, UserData>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "users"));
        const map: Record<string, UserData> = {};
        querySnapshot.forEach((doc) => {
          map[doc.id] = { id: doc.id, ...doc.data() };
        });
        setUsersMap(map);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    const messagesRef = ref(rtdb, "messages");
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const rooms: ChatRoom[] = Object.keys(data).map((roomId) => {
          const roomData = data[roomId];
          const msgKeys = Object.keys(roomData);
          
          const messagesArr = msgKeys.map(k => ({
            id: k,
            ...roomData[k]
          })).sort((a, b) => a.timestamp - b.timestamp);

          const latestMessage = messagesArr[messagesArr.length - 1];
          const [u1, u2] = roomId.split("_");
          
          let senderId = latestMessage.senderId;
          let receiverId = (senderId === u1) ? u2 : u1;
          
          if (!receiverId && !u2) {
             receiverId = senderId; // Handle edge cases if key doesn't have '_'
          }

          return {
            roomId,
            senderId,
            receiverId,
            latestMessage,
            timestamp: latestMessage.timestamp || 0,
            messages: messagesArr
          };
        });

        rooms.sort((a, b) => b.timestamp - a.timestamp);
        setChatRooms(rooms);
      } else {
        setChatRooms([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleToggleSelect = (roomId: string) => {
    setSelectedRoomIds((prev) =>
      prev.includes(roomId) ? prev.filter((id) => id !== roomId) : [...prev, roomId]
    );
  };

  const handleDeleteMarked = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedRoomIds.length} chats?`)) return;
    
    const tid = toast.loading("Deleting chats...");
    try {
      for (const id of selectedRoomIds) {
        await remove(ref(rtdb, `messages/${id}`));
      }
      toast.success("Chats deleted", { id: tid });
      setSelectedRoomIds([]);
    } catch (error) {
      console.error("Error deleting:", error);
      toast.error("Failed to delete", { id: tid });
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm(`Are you sure you want to permanently delete ALL ${filteredRooms.length} chats currently listed?`)) return;
    
    const tid = toast.loading("Clearing chats...");
    try {
      for (const room of filteredRooms) {
        await remove(ref(rtdb, `messages/${room.roomId}`));
      }
      toast.success("Chats cleared", { id: tid });
      setSelectedRoomIds([]);
    } catch (error) {
      console.error("Error clearing chats:", error);
      toast.error("Failed to clear", { id: tid });
    }
  };

  const filteredRooms = chatRooms.filter((room) => {
    if (!search.trim()) return true;
    const sender = usersMap[room.senderId];
    return sender?.displayId === search.trim() || room.senderId === search.trim();
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-100px)]">
        <Loader2 className="animate-spin text-blue-500" size={40} />
      </div>
    );
  }

  if (selectedRoom) {
    const receiver = usersMap[selectedRoom.receiverId];
    const receiverDisplay = receiver?.displayName || "Unknown";
    const receiverDisplayId = receiver?.displayId || selectedRoom.receiverId;
    const receiverPhoto = receiver?.photoUrl;

    return (
      <div className="bg-gray-50 dark:bg-gray-950 min-h-[calc(100vh-80px)]">
        {/* Chat Header */}
        <div className="bg-white dark:bg-gray-900 border-b dark:border-gray-800 p-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
          <button 
            onClick={() => setSelectedRoom(null)}
            className="flex items-center gap-1 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors border dark:border-gray-700 px-3 py-1.5 rounded-lg text-sm font-medium"
          >
            <ArrowLeft size={16} />
            Back
          </button>
          
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="font-bold text-gray-900 dark:text-white flex items-center justify-end gap-1">
                 {/* Replicating the badges placeholder */}
                 <span className="text-blue-500">🛡️</span> {receiverDisplay}
              </div>
              <div className="text-xs text-gray-500">ID: {receiverDisplayId}</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold overflow-hidden">
               {receiverPhoto ? <img src={receiverPhoto} className="w-full h-full object-cover" /> : receiverDisplay.charAt(0)}
            </div>
          </div>
        </div>

        {/* Chat Body */}
        <div className="p-6 max-w-4xl mx-auto space-y-6">
          {selectedRoom.messages.map((msg) => {
            // Actually the view is neutral, let's just align by who is the first sender, or just align all right if it's "receiver" of the admin panel.
            // Wait, we are an admin. We are just viewing two users chatting.
            const isSender1 = msg.senderId === selectedRoom.senderId;

            return (
              <div key={msg.id} className={`flex flex-col ${isSender1 ? "items-start" : "items-end"}`}>
                <div className={`max-w-[70%] rounded-2xl px-4 py-3 ${isSender1 ? "bg-white dark:bg-gray-800 border dark:border-gray-700 shadow-sm" : "bg-blue-600 text-white shadow-md"}`}>
                  <p className={isSender1 ? "text-gray-800 dark:text-gray-200" : "text-white"}>{msg.text || "[Attachment]"}</p>
                  <div className={`text-[10px] mt-1 flex items-center gap-1 ${isSender1 ? "text-gray-400" : "text-blue-200 justify-end"}`}>
                    {new Date(msg.timestamp).toLocaleString([], { hour: '2-digit', minute: '2-digit' })}
                    {msg.isRead && (
                      <span className="flex text-green-400">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const formatTimeAgo = (ms: number) => {
    const hours = Math.floor((Date.now() - ms) / 3600000);
    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours} hours ago`;
    return `${Math.floor(hours / 24)} days ago`;
  };

  return (
    <div className="p-6">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-blue-600">Total Chat Messages: <span className="border border-blue-200 rounded px-2">{filteredRooms.length}</span></h2>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <input 
          type="text" 
          placeholder="Find by exact Sender ID only..." 
          className="flex-1 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-1.5 rounded-md text-sm font-semibold transition-colors">
          Search
        </button>
      </div>

      <div className="flex items-center gap-2 mb-6">
        <select className="flex-1 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-md px-3 py-1.5 text-sm text-gray-500 focus:outline-none">
          <option>----------</option>
        </select>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-1.5 rounded-md text-sm font-semibold transition-colors">
          Go
        </button>
      </div>

      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-500 font-medium">
          {selectedRoomIds.length} of {filteredRooms.length} selected
        </span>
        <div className="flex items-center gap-2">
          {selectedRoomIds.length > 0 && (
            <button 
              onClick={handleDeleteMarked}
              className="flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs font-semibold"
            >
              <Trash2 size={14} /> Delete Selected
            </button>
          )}
          {filteredRooms.length > 0 && (
            <button 
              onClick={handleDeleteAll}
              className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs font-semibold shadow"
            >
              <Trash2 size={14} /> Clear All
            </button>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-[#ffe4e6] text-[#e11d48] dark:bg-rose-950 dark:text-rose-200">
            <tr>
              <th className="px-4 py-3 w-10 text-center">
                <input 
                  type="checkbox" 
                  onChange={(e) => {
                    if (e.target.checked) setSelectedRoomIds(filteredRooms.map(r => r.roomId));
                    else setSelectedRoomIds([]);
                  }}
                  checked={selectedRoomIds.length === filteredRooms.length && filteredRooms.length > 0}
                  className="rounded border-gray-300"
                />
              </th>
              <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">Sender ID</th>
              <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">Sender Name</th>
              <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">Receiver</th>
              <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider text-right">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {filteredRooms.map((room, idx) => {
              const sender = usersMap[room.senderId];
              const receiver = usersMap[room.receiverId];

              const sName = sender?.displayName || "Unknown";
              const sId = sender?.displayId || room.senderId;

              const rName = receiver?.displayName || "Unknown";
              const rId = receiver?.displayId || room.receiverId;

              const date = new Date(room.timestamp);

              return (
                <tr 
                  key={room.roomId} 
                  className={`${idx % 2 === 0 ? "bg-gray-50 dark:bg-gray-950/50" : "bg-white dark:bg-gray-900"} hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group cursor-pointer`}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).tagName !== 'INPUT') {
                      setSelectedRoom(room);
                    }
                  }}
                >
                  <td className="px-4 py-4 text-center">
                    <input 
                      type="checkbox" 
                      className="rounded border-gray-300" 
                      checked={selectedRoomIds.includes(room.roomId)}
                      onChange={() => handleToggleSelect(room.roomId)}
                    />
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-blue-600 font-bold underline cursor-pointer">{sId}</span>
                  </td>
                  <td className="px-4 py-4 font-semibold text-blue-600">
                    {sName}
                  </td>
                  <td className="px-4 py-4 text-gray-700 dark:text-gray-300 font-medium">
                    {rName} <br/> <span className="text-gray-500 font-normal">ID: {rId}</span>
                  </td>
                  <td className="px-4 py-4 text-right text-xs">
                    <div className="font-bold text-gray-800 dark:text-gray-200">{date.toLocaleDateString('en-GB').replace(/\//g, '-')}</div>
                    <div className="text-gray-400 mt-0.5">{date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} ({formatTimeAgo(room.timestamp)})</div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
