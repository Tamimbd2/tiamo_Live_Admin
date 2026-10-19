import { useEffect, useState } from "react";
import {
  BoxIconLine,
  GroupIcon,
} from "../../icons";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { Gem, Plus } from "lucide-react";
import { DiamondActionModal } from "./DiamondActionModal";

export default function EcommerceMetrics() {
  const [userStats, setUserStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
  });

  const [hostStats, setHostStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
  });

  const [totalDiamond, setTotalDiamond] = useState(0);
  const [showDiamondModal, setShowDiamondModal] = useState(false);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserStats = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "users"));
        const docs = querySnapshot.docs.map((doc) => doc.data());

        // Users stats
        const totalUsers = querySnapshot.size;
        const activeUsers = docs.filter((u) => u.isActive === true).length;
        const inactiveUsers = totalUsers - activeUsers;

        setUserStats({
          total: totalUsers,
          active: activeUsers,
          inactive: inactiveUsers,
        });

        // Hosts stats
        const hostDocs = docs.filter((u) => u.isHost === true || u.role === "host");
        const totalHosts = hostDocs.length;
        const activeHosts = hostDocs.filter((u) => u.isActive === true).length;
        const inactiveHosts = totalHosts - activeHosts;

        setHostStats({
          total: totalHosts,
          active: activeHosts,
          inactive: inactiveHosts,
        });

        // Total Diamond
        try {
          const diamondDocRef = doc(db, "totaldiamond", "diamondcalculation");
          const diamondDocSnap = await getDoc(diamondDocRef);
          if (diamondDocSnap.exists()) {
            setTotalDiamond(Number(diamondDocSnap.data().totaldiamond || 0));
          }
        } catch (err) {
          console.error("Error fetching diamond stats:", err);
        }
      } catch (error) {
        console.error("Error fetching metrics stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserStats();
  }, []);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6">
      {/* Total Diamond Card */}
      <div className="sm:col-span-2 rounded-[2rem] border border-white/20 bg-gradient-to-br from-brand-500 via-indigo-600 to-purple-800 p-6 md:p-8 flex items-center justify-between shadow-2xl shadow-brand-500/30 hover:shadow-brand-500/50 transition-all duration-500 group overflow-hidden relative">
        {/* Background glow effects */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-400/20 rounded-full blur-2xl translate-y-1/3 -translate-x-1/4 pointer-events-none" />
        
        <div className="flex items-center gap-6 relative z-10">
          <div className="flex items-center justify-center w-20 h-20 bg-white/10 rounded-[1.5rem] backdrop-blur-md border border-white/20 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-inner">
            <Gem className="text-white size-10 drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]" />
          </div>
          <div>
            <span className="text-xs md:text-sm font-black uppercase tracking-widest text-white/80 drop-shadow-sm">
              Total Diamond
            </span>
            <div className="flex items-center gap-4 mt-1">
              <h4 className="font-black text-white text-4xl md:text-5xl tracking-tighter drop-shadow-lg">
                {loading ? "..." : totalDiamond.toLocaleString()}
              </h4>
              <button
                onClick={() => setShowDiamondModal(true)}
                className="w-10 h-10 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-md flex items-center justify-center border border-white/40 transition-all hover:scale-110 active:scale-95 shadow-lg shadow-black/10 text-white"
                title="Add Diamonds"
              >
                <Plus size={24} className="drop-shadow-md" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {showDiamondModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
          <DiamondActionModal
            currentDiamond={totalDiamond}
            onClose={() => setShowDiamondModal(false)}
          />
        </div>
      )}

      {/* Users Card */}
      <div className="rounded-3xl glass-panel p-5 md:p-6 flex flex-col justify-between gap-10 hover:-translate-y-1 hover:shadow-2xl hover:shadow-brand-500/20 hover:border-brand-500/40 transition-all duration-500 group relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-brand-500/20 transition-all duration-500 pointer-events-none" />
        
        <div className="flex items-center gap-5 relative z-10">
          <div className="flex items-center justify-center w-16 h-16 bg-brand-500/10 rounded-2xl dark:bg-brand-500/20 group-hover:scale-105 group-hover:rotate-3 transition-transform duration-500 border border-brand-500/20">
            <GroupIcon className="text-brand-600 size-6 dark:text-brand-400 drop-shadow-md" />
          </div>

          <div>
            <div>
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Total Users
              </span>
              <h4 className="font-bold text-gray-900 text-title-sm dark:text-white mt-0.5 tracking-tight">
                {loading ? "..." : userStats.total.toLocaleString()}
              </h4>
            </div>
          </div>
        </div>
        <div className="flex justify-around border-t dark:border-white/[0.04] border-gray-100 pt-4 flex-wrap gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Active {loading ? "..." : userStats.active}
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            Inactive {loading ? "..." : userStats.inactive}
          </span>
        </div>
      </div>

      {/* Hosts Card */}
      <div className="rounded-3xl glass-panel p-5 md:p-6 flex flex-col justify-between gap-10 hover:-translate-y-1 hover:shadow-2xl hover:shadow-purple-500/20 hover:border-purple-500/40 transition-all duration-500 group relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-purple-500/20 transition-all duration-500 pointer-events-none" />
        
        <div className="flex items-center gap-5 relative z-10">
          <div className="flex items-center justify-center w-16 h-16 bg-purple-500/10 rounded-2xl dark:bg-purple-500/20 group-hover:scale-105 group-hover:-rotate-3 transition-transform duration-500 border border-purple-500/20">
            <BoxIconLine className="text-purple-600 size-6 dark:text-purple-400 drop-shadow-md" />
          </div>

          <div>
            <div>
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Total Hosts
              </span>
              <h4 className="font-bold text-gray-900 text-title-sm dark:text-white mt-0.5 tracking-tight">
                {loading ? "..." : hostStats.total.toLocaleString()}
              </h4>
            </div>
          </div>
        </div>
        <div className="flex justify-around border-t dark:border-white/[0.04] border-gray-100 pt-4 flex-wrap gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Active {loading ? "..." : hostStats.active}
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            Inactive {loading ? "..." : hostStats.inactive}
          </span>
        </div>
      </div>
    </div>
  );
}
