import { useState, useEffect, FormEvent } from "react";
import { X, Loader2, Film, ImageIcon } from "lucide-react";
import { Gift } from "./types";
import { SVGAPreview } from "../../components/SVGAPreview";

interface PackageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Gift>, file: File | null) => void;
  initialData?: Gift | null;
  isUploading: boolean;
  categoryName: string;
}

export const PackageModal = ({ isOpen, onClose, onSubmit, initialData, isUploading, categoryName }: PackageModalProps) => {
  const [formData, setFormData] = useState<Partial<Gift>>({
    name: "",
    price: "",
    tier: "premium",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");

  useEffect(() => {
    if (initialData) {
      setFormData({ ...initialData, tier: "premium" });
      setPreviewUrl(initialData.imageURL || (initialData as any).imageUrl || "");
    } else {
      setFormData({ name: "", price: "", tier: "premium" });
      setPreviewUrl("");
    }
    setSelectedFile(null);
  }, [initialData, isOpen]);

  const handleFileChange = (file: File | null) => {
    setSelectedFile(file);
    if (file) {
      if (file.type.startsWith("image/") && !file.name.toLowerCase().endsWith(".svga")) {
        setPreviewUrl(URL.createObjectURL(file));
      } else {
        setPreviewUrl("");
      }
    } else {
      setPreviewUrl(initialData?.imageURL || (initialData as any)?.imageUrl || "");
    }
  };

  if (!isOpen) return null;

  const isSVGA = selectedFile
    ? selectedFile.name.toLowerCase().endsWith(".svga")
    : Boolean(previewUrl && previewUrl.toLowerCase().includes(".svga"));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md lg:pl-64 dark:bg-black/80 bg-black/20">
      <div className="dark:bg-gray-900 bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl relative border md:border-gray-100 dark:border-gray-800">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black dark:text-white">{initialData ? `Edit ${categoryName}` : `New ${categoryName}`}</h2>
          <button type="button" onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full dark:text-white transition-colors hover:text-red-500">
            <X size={20} />
          </button>
        </div>

        <form className="space-y-4" onSubmit={(e: FormEvent) => { e.preventDefault(); onSubmit(formData, selectedFile); }}>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 ml-1 uppercase tracking-wider">
              Coin Price
            </label>
            <input
              type="number"
              placeholder="e.g. 1000"
              required
              className="w-full p-4 rounded-2xl outline-none font-mono border transition-all bg-gray-50 dark:bg-gray-800 dark:text-white border focus:border-blue-500 cursor-text"
              value={formData.price || ""}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 ml-1 uppercase tracking-wider">
              Upload Any File (Image, SVGA, GIF, etc.)
            </label>
            <label className="flex flex-col items-center justify-center w-full min-h-36 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl cursor-pointer hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all group overflow-hidden p-3 relative">
              {previewUrl && !isSVGA ? (
                <div className="flex flex-col items-center justify-center gap-2">
                  <img src={previewUrl} alt="Preview" className="h-24 max-w-full object-contain rounded-xl shadow-sm" />
                  <span className="text-[11px] text-blue-500 font-bold">
                    {selectedFile ? selectedFile.name : "Change File"}
                  </span>
                </div>
              ) : isSVGA && previewUrl ? (
                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="w-24 h-24 flex items-center justify-center">
                    <SVGAPreview url={previewUrl} />
                  </div>
                  <span className="text-[11px] text-blue-500 font-bold">
                    {selectedFile ? selectedFile.name : "Change SVGA"}
                  </span>
                </div>
              ) : selectedFile ? (
                <div className="flex flex-col items-center justify-center gap-2 text-center">
                  <Film className="text-blue-500" size={32} />
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-200 line-clamp-1">
                    {selectedFile.name}
                  </span>
                  <span className="text-[10px] text-gray-400">Click to replace file</span>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="flex items-center gap-2 text-gray-400 group-hover:text-blue-500 transition-colors mb-1">
                    <ImageIcon size={26} />
                    <Film size={26} />
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-bold">
                    Select Any File
                  </span>
                  <span className="text-[10px] text-gray-400 mt-0.5">
                    Images, SVGA, GIF, or any other file
                  </span>
                </div>
              )}
              <input
                type="file"
                className="hidden"
                onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={isUploading}
            className="w-full dark:bg-blue-200 h-14 rounded-2xl font-semibold shadow shadow-blue-500/25 bg-gray-200 text-black disabled:bg-gray-400 transition-all mt-4 hover:bg-gray-100 flex items-center justify-center"
          >
            {isUploading ? <Loader2 className="animate-spin" size={24} /> : initialData ? "Update Database" : "Deploy Asset"}
          </button>
        </form>
      </div>
    </div>
  );
};
