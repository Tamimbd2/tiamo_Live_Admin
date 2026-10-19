import React, { useState, useMemo } from "react";
import {
  MicOff,
  Mic,
  UserMinus,
  Ban,
  ShieldX,
  Clock,
  CalendarDays,
} from "lucide-react";
import { handleModerationAction } from "../../utils/moderationService";
import { Pagination } from "../../components/Pagination/Pagination";
import { ParticipantIdentity } from "./ParticipantIdentity";

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

interface TableProps {
  data: Participant[];
  mode: "audio" | "video";
  roomId: string;
  isAudio: boolean;
  currentPage: number;
  onPageChange: (page: number) => void;
  itemsPerPage: number;
}

const ModeratorTable: React.FC<TableProps> = ({
  data,
  mode,
  roomId,
  isAudio,
  currentPage,
  onPageChange,
  itemsPerPage,
}) => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const totalPages = Math.ceil(data.length / itemsPerPage) || 1;

  const displayData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return data.slice(start, start + itemsPerPage);
  }, [currentPage, data, itemsPerPage]);

  return (
    <div className="rounded-[2.5rem] border border-gray-200 dark:border-white/5 shadow-2xl shadow-gray-200/40 dark:shadow-none overflow-hidden">
      <div className="overflow-x-auto scrollbar-hide">
        <table className="w-full border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-gray-50/50 dark:bg-white/[0.02]">
              <th className="w-[40%] px-8 py-6 text-[10px] font-black uppercase tracking-[0.4em] text-gray-400 border-b dark:border-white/5 text-left">
                Member Identity
              </th>
              <th className="w-[20%] px-8 py-6 text-[10px] font-black uppercase tracking-[0.4em] text-gray-400 border-b dark:border-white/5 text-left">
                Status
              </th>
              <th className="w-[40%] px-8 py-6 text-[10px] font-black uppercase tracking-[0.4em] text-gray-400 border-b dark:border-white/5 text-right">
                Control Center
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-white/5">
            {Array.from({ length: itemsPerPage }).map((_, i) => {
              const user = displayData[i];
              if (!user)
                return (
                  <tr key={`empty-${i}`} className="h-[85px]">
                    <td colSpan={3}></td>
                  </tr>
                );

              const rowNumber = (currentPage - 1) * itemsPerPage + i + 1;
              const isUserActive = user.isOnline === true;

              return (
                <tr
                  key={user.id}
                  className="group hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-all h-[85px]"
                >
                  <td className="px-8 py-4">
                    <div className="flex items-center gap-4">
                      <div
                        className={`h-9 w-9 shrink-0 rounded-xl flex items-center justify-center text-[10px] font-black text-white ${
                          isAudio
                            ? "bg-emerald-500 shadow-lg shadow-emerald-500/20"
                            : "bg-purple-600 shadow-lg shadow-purple-600/20"
                        }`}
                      >
                        {rowNumber}
                      </div>
                      <ParticipantIdentity userId={user.id} />
                    </div>
                  </td>
                  <td className="px-8 py-4">
                    <div
                      className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg border transition-all duration-500 ${
                        isUserActive
                          ? isAudio
                            ? "bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400"
                            : "bg-purple-50 border-purple-100 text-purple-600 dark:bg-purple-500/10 dark:border-purple-500/20 dark:text-purple-400"
                          : "bg-gray-50 border-gray-100 text-gray-400 dark:bg-white/5 dark:border-white/5"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          isUserActive
                            ? isAudio
                              ? "bg-emerald-500 animate-pulse"
                              : "bg-purple-500 animate-pulse"
                            : "bg-gray-400"
                        }`}
                      />
                      <span className="text-[9px] font-black uppercase tracking-widest whitespace-nowrap">
                        {isUserActive ? "Active" : "Offline"}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-4 text-right relative overflow-visible">
                    <div className="flex justify-end items-center gap-2">
                      <button
                        onClick={() =>
                          handleModerationAction(
                            mode,
                            roomId,
                            user.id,
                            user.isMuted ? "unmute" : "mute"
                          )
                        }
                        className={`h-9 w-9 shrink-0 flex items-center justify-center rounded-xl transition-all ${
                          user.isMuted
                            ? "bg-red-50 text-red-500 dark:bg-red-500/10"
                            : isAudio
                            ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 hover:bg-emerald-500 hover:text-white"
                            : "bg-purple-50 text-purple-600 dark:bg-purple-500/10 hover:bg-purple-600 hover:text-white"
                        }`}
                      >
                        {user.isMuted ? <MicOff size={15} /> : <Mic size={15} />}
                      </button>
                      <button
                        onClick={() =>
                          handleModerationAction(mode, roomId, user.id, "kickout")
                        }
                        className="h-9 w-9 shrink-0 flex items-center justify-center bg-gray-50 dark:bg-white/5 text-gray-400 rounded-xl hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black transition-all"
                      >
                        <UserMinus size={15} />
                      </button>
                      <div className="relative">
                        <button
                          onClick={() =>
                            setActiveMenu(activeMenu === user.id ? null : user.id)
                          }
                          className={`h-9 px-4 flex items-center gap-2 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all ${
                            activeMenu === user.id
                              ? "bg-black text-white dark:bg-white dark:text-black"
                              : "bg-red-600 text-white hover:bg-red-700 shadow-md shadow-red-500/20"
                          }`}
                        >
                          <Ban size={13} /> Ban
                        </button>
                        {activeMenu === user.id && (
                          <>
                            <div
                              className="fixed inset-0 z-40"
                              onClick={() => setActiveMenu(null)}
                            />
                            <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-[#111] border border-gray-100 dark:border-white/10 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                              <button
                                onClick={() => {
                                  handleModerationAction(mode, roomId, user.id, "24h");
                                  setActiveMenu(null);
                                }}
                                className="w-full flex items-center gap-3 p-2.5 hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl text-[9px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-300"
                              >
                                <Clock size={14} className={isAudio ? "text-emerald-500" : "text-purple-500"} /> 24 Hours
                              </button>
                              <button
                                onClick={() => {
                                  handleModerationAction(mode, roomId, user.id, "7d");
                                  setActiveMenu(null);
                                }}
                                className="w-full flex items-center gap-3 p-2.5 hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl text-[9px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-300"
                              >
                                <Clock size={14} className={isAudio ? "text-emerald-500" : "text-purple-500"} /> 07 Days
                              </button>
                              <button
                                onClick={() => {
                                  handleModerationAction(mode, roomId, user.id, "30d");
                                  setActiveMenu(null);
                                }}
                                className="w-full flex items-center gap-3 p-2.5 hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl text-[9px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-300"
                              >
                                <CalendarDays size={14} className={isAudio ? "text-emerald-500" : "text-purple-500"} /> 01 Month
                              </button>
                              <div className="h-px bg-gray-100 dark:bg-white/5 my-1 mx-2" />
                              <button
                                onClick={() => {
                                  handleModerationAction(mode, roomId, user.id, "block");
                                  setActiveMenu(null);
                                }}
                                className="w-full flex items-center gap-3 p-2.5 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-xl text-[9px] font-black uppercase tracking-widest"
                              >
                                <ShieldX size={14} /> Permanent
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="pb-10 border-t dark:border-white/5">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
      </div>
    </div>
  );
};

export default ModeratorTable;
