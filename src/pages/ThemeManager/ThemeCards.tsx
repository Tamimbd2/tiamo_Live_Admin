import { Edit3, Trash2, Coins } from "lucide-react";
import { Theme } from "./ThemeManager";

interface ThemeCardProps {
  theme: Theme;
  onEdit: () => void;
  onDelete: () => void;
}

export default function ThemeCard({ theme, onEdit, onDelete }: ThemeCardProps) {
  const isPremium = theme.tier === "premium";

  return (
    <div className="relative bg-white dark:bg-gray-900 border dark:border-gray-800 w-50 rounded-[2rem] p-3 flex flex-col gap-3 aspect-4/6 transition-all hover:shadow-xl group">
      {theme.tier && (
        <span className={`absolute top-3 left-3 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase z-10 ${
          isPremium
            ? "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400"
            : "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
        }`}>
          {theme.tier}
        </span>
      )}

      <div className="w-full h-full bg-gray-100 dark:bg-gray-800 rounded-2xl overflow-hidden relative shadow-inner">
        <img src={theme.imageURL} alt={theme.name} className="w-full h-full object-cover" />

        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-3 pt-10 flex flex-col justify-end" style={{ minHeight: "52px" }}>
          <div className="h-4 flex items-center">
            {isPremium && theme.price > 0 && (
              <div className="flex items-center gap-1 text-yellow-400">
                <Coins size={10} />
                <span className="text-[10px] font-black">{theme.price.toLocaleString()}</span>
              </div>
            )}
          </div>
          <h4 className="text-xs font-bold text-white truncate">{theme.name}</h4>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 w-full">
        <button
          onClick={onEdit}
          className="flex items-center justify-center py-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl dark:hover:bg-blue-950 hover:text-blue-500 transition-all active:scale-90 shadow-sm"
        >
          <Edit3 size={14} />
        </button>
        <button
          onClick={onDelete}
          className="flex items-center justify-center py-2 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all active:scale-90 shadow-sm"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
