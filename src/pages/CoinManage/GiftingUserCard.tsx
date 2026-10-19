import { User } from "lucide-react";
import { UserInfo } from "./GiftingCoinManager";

interface GiftingUserCardProps {
  user: UserInfo;
  isSelected: boolean;
  onSelect: (user: UserInfo) => void;
}

export const GiftingUserCard = ({ user, isSelected, onSelect }: GiftingUserCardProps) => {
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
        <h4 className="font-bold text-sm md:text-base dark:text-white truncate">
          {user.displayName || "Unknown User"}
        </h4>
        <p className="text-xs text-gray-500 font-medium truncate">
          ID: {user.displayId || user.uid}
        </p>
        <p className="text-[10px] text-gray-400 truncate hidden sm:block">
          {user.email}
        </p>
      </div>
    </div>
  );
};
