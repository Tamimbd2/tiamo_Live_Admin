import { useState } from "react";
import { Trash2, Edit3, Coins, Sparkles, Volume2, Clock } from "lucide-react";
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
  const [isPlayingSound, setIsPlayingSound] = useState(false);
  const isSVGA =
    gift.format === "svga" ||
    gift.animationType === "svga" ||
    Boolean(gift.imageURL?.toLowerCase().endsWith(".svga"));
  const isGIF =
    gift.format === "gif" ||
    gift.animationType === "gif" ||
    Boolean(gift.imageURL?.toLowerCase().includes(".gif"));
  const isPremium = gift.tier === "premium";
  const soundUrl = gift.soundURL || gift.soundUrl;
  const durationSec = gift.duration || (isGIF ? 4 : 10);

  const handlePlaySound = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!soundUrl) return;
    const audio = new Audio(soundUrl);
    setIsPlayingSound(true);
    audio.onended = () => setIsPlayingSound(false);
    audio.onerror = () => setIsPlayingSound(false);
    audio.play().catch(() => setIsPlayingSound(false));
  };

  return (
    <div
      onClick={onSelect}
      className={`bg-white md:w-50 dark:bg-gray-900 border rounded-[2rem] p-4 relative group hover:shadow-xl transition-all cursor-pointer ${
        isSelected ? "border-blue-500 ring-2 ring-blue-500/10" : "border-gray-200 dark:border-gray-800"
      }`}
    >
      <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1 z-10">
        {gift.tier && (
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase shadow-sm ${
              isPremium
                ? "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400"
                : "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
            }`}
          >
            {gift.tier}
          </span>
        )}
        <span
          className={`text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-0.5 shadow-sm ${
            isGIF
              ? "bg-pink-100 text-pink-700 dark:bg-pink-950/60 dark:text-pink-300 border border-pink-200 dark:border-pink-800/50"
              : "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50"
          }`}
        >
          {isGIF && <Sparkles size={9} />}
          {isGIF ? "GIF" : "SVGA"}
        </span>

        {isGIF && soundUrl && (
          <button
            type="button"
            onClick={handlePlaySound}
            className={`text-[9px] font-black px-1.5 py-0.5 rounded-full tracking-wider flex items-center gap-0.5 shadow-sm transition-all ${
              isPlayingSound
                ? "bg-amber-500 text-white animate-pulse"
                : "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 hover:bg-amber-200"
            }`}
            title="Click to preview attached sound"
          >
            <Volume2 size={9} />
            Sound
          </button>
        )}
      </div>

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
          <img
            src={gift.imageURL}
            alt={gift.name}
            className="max-h-full object-contain"
            loading="lazy"
          />
        )}
      </div>

      <div className="px-1">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold text-blue-500 uppercase">{gift.category}</p>
          {isGIF && (
            <span className="text-[10px] font-bold text-gray-400 flex items-center gap-0.5" title="Display duration">
              <Clock size={10} />
              {durationSec}s
            </span>
          )}
        </div>
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
