import { Edit3, Trash2, Coins } from "lucide-react";
import { LevelBadge } from "./LevelBadgeManager";

interface BadgeCardProps {
  badge: LevelBadge;
  onEdit: () => void;
  onDelete: () => void;
}

export default function BadgeCard({ badge, onEdit, onDelete }: BadgeCardProps) {
  const isPremium = badge.tier === "premium";

  return (
    <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 w-50 rounded-[2rem] p-5 flex flex-col items-center gap-4 transition-all hover:shadow-xl hover:-translate-y-1 relative">
      {badge.tier && (
        <span
          className={`absolute top-3 left-3 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
            isPremium
              ? "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400"
              : "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
          }`}
        >
          {badge.tier}
        </span>
      )}

      <div className="w-24 h-24 bg-gray-50 dark:bg-gray-800/50 rounded-2xl flex items-center justify-center p-3 relative overflow-hidden border dark:border-gray-700">
        <img src={badge.imageURL} alt={badge.name} className="max-w-full max-h-full object-contain z-10" />
        <div className="absolute inset-0 bg-blue-500/5 blur-2xl rounded-full" />
      </div>

      <div className="text-center space-y-1">
        <p className="text-xs font-black text-blue-500 uppercase tracking-widest">Level {badge.level}</p>
        <h4 className="text-sm font-bold dark:text-white truncate w-40">{badge.name}</h4>
        {isPremium && badge.price !== undefined && badge.price > 0 && (
          <div className="flex items-center justify-center gap-1 mt-1">
            <Coins size={12} className="text-yellow-500" />
            <span className="text-xs font-bold text-yellow-500">{badge.price.toLocaleString()}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 w-full pt-2">
        <button
          onClick={onEdit}
          className="flex items-center justify-center gap-2 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl text-xs font-bold hover:bg-blue-500 hover:text-white transition-all"
        >
          <Edit3 size={14} /> Edit
        </button>
        <button
          onClick={onDelete}
          className="flex items-center justify-center gap-2 py-2.5 bg-red-50 dark:bg-red-950/20 text-red-500 rounded-xl text-xs font-bold hover:bg-red-500 hover:text-white transition-all"
        >
          <Trash2 size={14} /> Delete
        </button>
      </div>
    </div>
  );
}
