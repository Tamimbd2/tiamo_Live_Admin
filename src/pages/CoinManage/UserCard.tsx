import { Coins, User, Gem } from "lucide-react";
import { UserInfo } from "./CoinManager";

interface UserCardProps {
  user: UserInfo;
  isSelected: boolean;
  onSelect: (user: UserInfo) => void;
}

export const UserCard = ({ user, isSelected, onSelect }: UserCardProps) => {
  return (
    <div
      onClick={() => onSelect(user)}
      className={`p-5 rounded-2xl border cursor-pointer transition-all flex items-center gap-4 ${
        isSelected
          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-lg scale-[1.02]"
          : "border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-blue-300 hover:shadow-md"
      }`}
    >
      <div className="relative shrink-0">
        {user.photoUrl ? (
          <img
            src={user.photoUrl}
            className="w-14 h-14 rounded-full object-cover border-2 border-transparent"
            alt=""
          />
        ) : (
          <div className="w-14 h-14 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-400">
            <User size={24} />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-bold text-sm md:text-base dark:text-white truncate flex items-center gap-2">
          <span className="truncate">{user.displayName || "Unknown User"}</span>
          {user.role && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 font-medium shrink-0 uppercase">
              {user.role}
            </span>
          )}
        </h4>
        <p className="text-xs text-gray-500 font-medium truncate">
          ID: {user.displayId || user.uid}
        </p>
        <p className="text-[10px] text-gray-400 truncate hidden sm:block">
          {user.email}
        </p>
      </div>
      <div className="text-right shrink-0 flex flex-col gap-2">
        <div className="bg-orange-50 dark:bg-orange-950/30 px-3.5 py-2 rounded-2xl flex items-center gap-1.5 border border-orange-100/40 dark:border-orange-900/20 justify-end">
          <Coins size={16} className="text-orange-500 shrink-0" />
          <span className="text-base font-black text-orange-600 dark:text-orange-400 font-mono">
            {user.balance ?? 0}
          </span>
        </div>
        {user.isHost && (
          <div className="bg-pink-50 dark:bg-pink-950/30 px-3.5 py-2 rounded-2xl flex items-center gap-1.5 border border-pink-100/40 dark:border-pink-900/20 justify-end">
            <Gem size={16} className="text-pink-500 shrink-0" />
            <span className="text-base font-black text-pink-600 dark:text-pink-400 font-mono">
              {user.diamonds ?? 0}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
