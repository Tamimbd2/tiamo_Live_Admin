import { Edit3, Trash2, Coins } from "lucide-react";

interface Emoji {
  id: string;
  name: string;
  imageURL: string;
  url?: string;
  category: string;
  subCategory?: string;
  tier?: "free" | "premium";
  price?: number;
}

interface EmojiCardProps {
  emoji: Emoji;
  onEdit: (emoji: Emoji) => void;
  onDelete: (id: string) => void;
}

export const EmojiCard = ({ emoji, onEdit, onDelete }: EmojiCardProps) => {
  const isPremium = emoji.tier === "premium";

  return (
    <div className="border dark:border-gray-800 rounded-2xl p-5 md:w-50 flex flex-col items-center transition-all relative">
      {emoji.tier && (
        <span
          className={`absolute top-3 left-3 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
            isPremium
              ? "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400"
              : "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
          }`}
        >
          {emoji.tier}
        </span>
      )}

      <div className="w-16 h-16 flex items-center justify-center mb-3">
        <img
          src={emoji.imageURL || emoji.url}
          alt={emoji.name}
          className="w-full h-full object-contain"
        />
      </div>

      <h3 className="dark:text-white text-black font-bold text-sm mb-1">{emoji.name}</h3>

      <span className="text-gray-400 text-[10px] px-3 py-1 rounded-full uppercase font-bold mb-2">
        {emoji.subCategory || emoji.category}
      </span>

      {isPremium ? (
        <div className="flex items-center gap-1 text-orange-500 mb-4">
          <Coins size={12} />
          <span className="text-xs font-black">{emoji.price}</span>
        </div>
      ) : (
        <div className="flex items-center gap-1 text-green-500 mb-4">
          <span className="text-xs font-black">Free</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 w-full">
        <button
          onClick={() => onEdit(emoji)}
          className="flex items-center justify-center gap-2 py-2 text-black dark:text-white text-xs font-bold rounded-lg border dark:border-gray-700"
        >
          <Edit3 size={14} /> Edit
        </button>
        <button
          onClick={() => onDelete(emoji.id)}
          className="flex items-center justify-center gap-2 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-black dark:text-white text-xs font-bold rounded-lg border dark:border-gray-700"
        >
          <Trash2 size={14} /> Delete
        </button>
      </div>
    </div>
  );
};
