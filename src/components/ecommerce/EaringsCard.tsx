import { useEffect, useState } from "react";
import { LiaCoinsSolid } from "react-icons/lia";
import { IoWalletOutline } from "react-icons/io5";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../lib/firebase";

export default function DemographicCard() {
  const [stats, setStats] = useState({
    totalCoins: 0,
    totalEarnings: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEarningsStats = async () => {
      try {
        // 1. Sum up all users' balances
        const usersSnap = await getDocs(collection(db, "users"));
        let totalCoins = 0;
        usersSnap.forEach((doc) => {
          const u = doc.data();
          totalCoins += (u.balance ?? 0) + (u.giftingCoin ?? 0);
        });

        // 2. Sum up all approved reseller request amounts (earnings)
        const requestsSnap = await getDocs(collection(db, "reseller_coin_requests"));
        let totalEarnings = 0;
        requestsSnap.forEach((doc) => {
          const r = doc.data();
          if (r.status === "approved") {
            totalEarnings += r.amount ?? 0;
          }
        });

        setStats({
          totalCoins,
          totalEarnings,
        });
      } catch (error) {
        console.error("Error fetching earnings stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEarningsStats();
  }, []);

  return (
    <div className="grid grid-cols-6 gap-5 grid-wrap">
      {/* Total Coin Generate Card */}
      <div className="rounded-3xl border border-gray-200/50 bg-white/70 dark:bg-[#140e1b]/60 backdrop-blur-xl p-5 col-span-3 dark:border-white/[0.08] md:p-6 flex flex-col justify-between gap-10 hover:shadow-xl hover:shadow-yellow-500/5 hover:border-yellow-500/30 transition-all duration-300 group">
        <div className="flex items-center gap-5 flex-wrap">
          <div className="flex items-center justify-center w-16 h-16 bg-yellow-500/10 rounded-2xl dark:bg-white/5 group-hover:scale-105 transition-transform duration-300">
            <LiaCoinsSolid  className="text-yellow-500 size-7 dark:text-yellow-400 drop-shadow-[0_0_10px_rgba(234,179,8,0.3)]" />
          </div>

          <div className=" ">
            <div>
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Total Coin Circulating
              </span>
              <h4 className="font-bold text-yellow-500 text-lg md:text-xl mt-0.5 tracking-tight">
                {loading ? "..." : stats.totalCoins.toLocaleString()}
              </h4>
            </div>
          </div>
        </div>
        <div className="flex justify-around flex-wrap border-t dark:border-white/[0.04] border-gray-100 pt-4">
          <p className="flex items-center text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse mr-1.5" />
            Active Stats
          </p>
          <p className="text-gray-400 dark:text-gray-500 text-xs ml-2">realtime database</p>
        </div>
      </div>

      {/* Total Earnings Card */}
      <div className="rounded-3xl border border-gray-200/50 bg-white/70 dark:bg-[#140e1b]/60 backdrop-blur-xl p-5 col-span-3 dark:border-white/[0.08] md:p-6  flex flex-col justify-between gap-10 hover:shadow-xl hover:shadow-purple-500/5 hover:border-purple-500/30 transition-all duration-300 group">
        <div className="flex items-center gap-5 flex-wrap">
          <div className="flex items-center justify-center w-16 h-16 bg-purple-500/10 rounded-2xl dark:bg-white/5 group-hover:scale-105 transition-transform duration-300">
            <IoWalletOutline  className="text-purple-600 size-6 dark:text-purple-400 drop-shadow-[0_0_10px_rgba(147,51,234,0.3)]" />
          </div>

          <div className=" ">
            <div>
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Total Approved Sales
              </span>
              <h4 className="font-bold dark:text-white text-lg md:text-xl mt-0.5 tracking-tight">
                {loading ? "..." : stats.totalEarnings.toLocaleString()} <span className="text-xs font-normal text-gray-400">Coins</span>
              </h4>
            </div>
          </div>
        </div>
        <div className="flex justify-around flex-wrap border-t dark:border-white/[0.04] border-gray-100 pt-4">
          <p className="flex items-center text-xs font-semibold text-purple-600 dark:text-purple-400">
            Direct Sales
          </p>
          <p className="text-gray-400 dark:text-gray-500 text-xs ml-2">from admin panel</p>
        </div>
      </div>
    </div>
  );
}
