import { PencilLine, X, Coins } from "lucide-react";
import { IdEntry } from "./IdEntryManager";
import { SVGAPreview } from "../../components/SVGAPreview";

interface IdEntryCardProps {
  entry: IdEntry;
  onEdit: (entry: IdEntry) => void;
  onDelete: (id: string) => void;
  isSelected: boolean;
  onSelect: () => void;
}

export const IdEntryCard = ({ entry, onEdit, onDelete, isSelected, onSelect }: IdEntryCardProps) => {
  const isPremium = entry.tier === "premium";

  return (
    <div
      onClick={onSelect}
      className={`group relative border md:w-50 rounded-3xl p-4 transition-all hover:shadow-xl bg-white dark:bg-gray-900 cursor-pointer ${
        isSelected ? "border-blue-500 ring-2 ring-blue-500/10" : "dark:border-gray-800"
      }`}
    >
      {entry.tier && (
        <span
          className={`absolute top-3 left-3 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase z-10 ${
            isPremium
              ? "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400"
              : "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
          }`}
        >
          {entry.tier}
        </span>
      )}

      <div className="aspect-square rounded-2xl bg-gray-100 dark:bg-gray-800 mb-4 flex items-center justify-center overflow-hidden border dark:border-none">
        {entry.type === "svga" ? (
          <div className="w-full h-full">
            <SVGAPreview url={entry.imageURL} />
          </div>
        ) : (
          <img src={entry.imageURL} alt={entry.name} className="w-full h-full object-contain" />
        )}
      </div>

      <h3 className="text-sm font-bold truncate dark:text-white text-black">{entry.name}</h3>
      <p className="text-[10px] text-gray-500 uppercase font-bold">{entry.subCategory || entry.category}</p>

      {isPremium && entry.price !== undefined && entry.price > 0 && (
        <div className="mt-2 flex items-center gap-1">
          <Coins size={12} className="text-yellow-500" />
          <span className="text-xs font-bold text-yellow-500">{entry.price.toLocaleString()}</span>
        </div>
      )}

      <div className={`absolute top-2 right-2 flex gap-1 transition-opacity z-10 ${
        isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
      }`}>
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(entry); }}
          className="p-2 bg-white/90 dark:bg-gray-800/90 rounded-full shadow-sm text-blue-500 hover:scale-110 transition-transform border dark:border-gray-700"
        >
          <PencilLine size={14} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(entry.id); }}
          className="p-2 bg-white/90 dark:bg-gray-800/90 rounded-full shadow-sm text-red-500 hover:scale-110 transition-transform border dark:border-gray-700"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};
