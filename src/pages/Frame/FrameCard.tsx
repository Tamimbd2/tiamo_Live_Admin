import { Edit2, Trash2, Coins } from "lucide-react";
import { FrameAsset } from "./FrameManager";
import { SVGAPreview } from "../../components/SVGAPreview";

interface FrameCardProps {
  frame: FrameAsset;
  onEdit: (frame: FrameAsset) => void;
  onDelete: (id: string) => void;
  isSelected: boolean;
  onSelect: () => void;
}

export const FrameCard = ({ frame, onEdit, onDelete, isSelected, onSelect }: FrameCardProps) => {
  const isPremium = frame.tier === "premium";

  return (
    <div
      onClick={onSelect}
      className={`group relative border rounded-3xl p-4 transition-all hover:shadow-xl md:w-50 bg-white dark:bg-gray-900 flex flex-col h-full cursor-pointer ${
        isSelected ? "border-blue-500 ring-2 ring-blue-500/10" : "dark:border-gray-800"
      }`}
    >
      {frame.tier && (
        <span
          className={`absolute top-3 left-3 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase z-10 ${
            isPremium
              ? "bg-yellow-100 text-yellow-900 dark:bg-yellow-100 dark:text-yellow-400"
              : "bg-green-100 text-green-600 dark:bg-green-100 dark:text-green-400"
          }`}
        >
          {frame.tier}
        </span>
      )}

      <div className="rounded-2xl bg-gray-100 dark:bg-gray-800 mb-4 flex items-center justify-center overflow-hidden">
        {frame.type === "png" ? (
          <img src={frame.imageURL} alt={frame.name} className="w-full h-full object-contain" />
        ) : (
          <div className="w-full h-full"><SVGAPreview url={frame.imageURL} /></div>
        )}
      </div>

      <div className="mb-2">
        <h3 className="text-sm font-bold truncate dark:text-white text-black">{frame.name}</h3>
        <p className="text-[10px] text-gray-500 uppercase font-bold">{frame.subCategory || frame.category}</p>
      </div>

      {isPremium ? (
        <div className="flex items-center gap-1 text-orange-500 mb-2">
          <Coins size={12} />
          <span className="text-xs font-black">{frame.price}</span>
        </div>
      ) : (
        <div className="flex items-center gap-1 text-green-500 mb-2">
          <span className="text-xs font-black">Free</span>
        </div>
      )}

      <div className={`absolute top-6 right-6 flex flex-col gap-2 transition-opacity z-10 ${
        isSelected ? "opacity-100" : "opacity-0 sm:group-hover:opacity-100"
      }`}>
        <button onClick={(e) => { e.stopPropagation(); onEdit(frame); }} className="p-2.5 bg-white dark:bg-gray-800 rounded-full shadow-lg text-blue-500 border dark:border-gray-700 hover:scale-110 transition-transform">
          <Edit2 size={16} />
        </button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(frame.id); }} className="p-2.5 bg-white dark:bg-gray-800 rounded-full shadow-lg text-red-500 border dark:border-gray-700 hover:scale-110 transition-transform">
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
};
