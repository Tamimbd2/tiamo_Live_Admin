import { Trash2, Edit3, Coins } from "lucide-react";
import { SVGAPreview } from "../../components/SVGAPreview";
import { Gift } from "./types";

interface GiftCardProps {
  gift: Gift;
  onEdit: (gift: Gift) => void;
  onDelete: (id: string) => void;
  isSelected: boolean;
  onSelect: () => void;
}

export const GiftCard = ({ gift, onEdit, onDelete, isSelected, onSelect }: GiftCardProps) => {
  const isSVGA = gift.imageURL?.toLowerCase().endsWith(".svga");
  const isPremium = gift.tier === "premium";

  return (
    <div
      onClick={onSelect}
      className={`bg-white md:w-50 dark:bg-gray-900 border rounded-[2rem] p-4 relative group hover:shadow-xl transition-all cursor-pointer ${
        isSelected ? "border-blue-500 ring-2 ring-blue-500/10" : "border-gray-200 dark:border-gray-800"
      }`}
    >
      {gift.tier && (
        <span
          className={`absolute top-3 left-3 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase z-10 ${
            isPremium
              ? "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400"
              : "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
          }`}
        >
          {gift.tier}
        </span>
      )}

      <div
        className={`absolute top-2 right-2 flex gap-1 transition-all z-10 ${
          isSelected ? "opacity-100 translate-y-0" : "opacity-0 md:group-hover:opacity-100 -translate-y-1 md:translate-y-0"
        }`}
      >
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(gift); }}
          className="p-2 bg-blue-500 text-white rounded-full hover:scale-110 shadow-lg"
        >
          <span className="sr-only">Edit</span>
          <Edit3 size={14} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); if (gift.id) onDelete(gift.id); }}
          className="p-2 bg-red-500 text-white rounded-full hover:scale-110 shadow-lg"
        >
          <span className="sr-only">Delete</span>
          <Trash2 size={14} />
        </button>
      </div>

      <div className="aspect-square bg-gray-50 dark:bg-gray-800/50 rounded-2xl mb-3 flex items-center justify-center overflow-hidden p-2">
        {isSVGA ? (
          <SVGAPreview url={gift.imageURL} />
        ) : (
          <img src={gift.imageURL} alt={gift.name} className="max-h-full object-contain" />
        )}
      </div>

      <div className="px-1">
        <p className="text-[10px] font-bold text-blue-500 uppercase">{gift.category}</p>
        <h3 className="font-bold dark:text-white text-sm truncate">{gift.name}</h3>
        {isPremium ? (
          <div className="flex items-center gap-1 text-orange-500 mt-1">
            <Coins size={12} />
            <span className="text-xs font-black">{gift.price}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-green-500 mt-1">
            <span className="text-xs font-black">Free</span>
          </div>
        )}
      </div>
    </div>
  );
};
