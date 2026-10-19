import { useState, useEffect } from "react";
import { uploadFile } from "../../lib/upload";
import { db } from "../../lib/firebase";
import { doc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";
import { Upload, Loader2, ImageIcon, Trash2, Save, AlertCircle, RefreshCw, X, Edit, Plus } from "lucide-react";
import toast from "react-hot-toast";

export default function BannerManager() {
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [banners, setBanners] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [showUploadUI, setShowUploadUI] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "banners", "current"), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const bannerData = data.banner;
        if (Array.isArray(bannerData)) {
          setBanners(bannerData);
        } else if (typeof bannerData === 'string' && bannerData) {
          setBanners([bannerData]);
        } else {
          setBanners([]);
        }
      } else {
        setBanners([]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
      }
      setSelectedFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
      }
      setSelectedFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleChangeClick = (index: number) => {
    setEditingIndex(index);
    setShowUploadUI(true);
    setSelectedFile(null);
    setPreview("");
    setTimeout(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }, 100);
  };

  const handleSave = async () => {
    if (!selectedFile && !preview) {
      toast.error("Please select a banner image first");
      return;
    }

    setIsSaving(true);
    const toastId = toast.loading("Saving banner...");

    try {
      let finalUrl = "";

      if (selectedFile) {
        finalUrl = await uploadFile(selectedFile);
      }

      if (finalUrl) {
        let newBanners = [...banners];
        if (editingIndex !== null) {
          newBanners[editingIndex] = finalUrl;
        } else {
          newBanners.push(finalUrl);
        }
        await setDoc(doc(db, "banners", "current"), {
          banner: newBanners,
          updatedAt: serverTimestamp(),
        });
      }

      setSelectedFile(null);
      setPreview("");
      setShowUploadUI(false);
      setEditingIndex(null);
      toast.success(editingIndex !== null ? "Banner updated successfully" : "Banner added successfully", { id: toastId });
    } catch (error) {
      console.error("Error saving banner:", error);
      toast.error("Failed to save banner", { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (indexToDelete: number) => {
    toast((t) => (
      <div className="flex flex-col gap-3 min-w-[255px] p-1">
        <div className="flex items-start gap-2.5">
          <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={18} />
          <div>
            <p className="text-sm font-bold text-gray-800 dark:text-gray-200">Delete Banner?</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">This will remove the banner permanently.</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-1">
          <button
            onClick={() => toast.dismiss(t.id)}
            className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
          >
            Cancel
          </button>
          <button
            onClick={async () => {
              toast.dismiss(t.id);
              const deleteToastId = toast.loading("Deleting banner...");
              try {
                const newBanners = banners.filter((_, idx) => idx !== indexToDelete);
                await setDoc(doc(db, "banners", "current"), {
                  banner: newBanners,
                  updatedAt: serverTimestamp(),
                });
                if (editingIndex === indexToDelete) {
                  setShowUploadUI(false);
                  setEditingIndex(null);
                  setSelectedFile(null);
                  setPreview("");
                }
                toast.success("Banner deleted successfully", { id: deleteToastId });
              } catch (error) {
                console.error("Error deleting banner:", error);
                toast.error("Failed to delete banner", { id: deleteToastId });
              }
            }}
            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95"
          >
            Delete
          </button>
        </div>
      </div>
    ), { duration: 6000, position: "top-right" });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-gray-400" size={40} />
      </div>
    );
  }

  const hasChanges = selectedFile !== null;
  const showUploadBox = showUploadUI || banners.length === 0;

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      {/* Page Header */}
      <div className="flex items-center gap-3 mb-10">
        <div className="p-3 bg-blue-500/10 rounded-2xl">
          <ImageIcon className="text-blue-500" size={28} />
        </div>
        <div>
          <h1 className="text-2xl font-bold dark:text-white text-black">Banner Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Upload and configure up to 20 application banners</p>
        </div>
      </div>

      {/* Existing Banners List */}
      {banners.length > 0 && (
        <div className="space-y-6 mb-8">
          {banners.map((banner, index) => (
            <div key={index} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2.5rem] p-6 shadow-sm flex flex-col gap-4">
              <div className="flex justify-between items-center px-2">
                <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Banner {index + 1}</span>
                {editingIndex === index && showUploadUI && (
                  <span className="px-2.5 py-1 text-[11px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400 rounded-full border border-blue-100 dark:border-blue-900/50">
                    Currently Editing
                  </span>
                )}
              </div>
              <div className="w-full aspect-[21/9] rounded-[1.5rem] overflow-hidden border border-gray-200 dark:border-gray-800 relative group bg-gray-50 dark:bg-gray-950/30">
                <img src={banner} alt={`Banner ${index + 1}`} className="w-full h-full object-cover" />
              </div>
              <div className="flex gap-3 justify-end px-2">
                <button
                  onClick={() => handleChangeClick(index)}
                  className="px-4 py-2 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 font-semibold rounded-xl flex items-center gap-2 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all active:scale-95"
                >
                  <Edit size={16} /> Change
                </button>
                <button
                  onClick={() => handleDelete(index)}
                  className="px-4 py-2 bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 font-semibold rounded-xl flex items-center gap-2 hover:bg-red-100 dark:hover:bg-red-900/50 transition-all active:scale-95"
                >
                  <Trash2 size={16} /> Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add More Button */}
      {!showUploadUI && banners.length < 20 && (
        <button
          onClick={() => { setEditingIndex(null); setShowUploadUI(true); setTimeout(() => { window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); }, 100); }}
          className="w-full py-8 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-[2.5rem] text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all flex flex-col items-center justify-center gap-3 font-bold"
        >
          <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-full"><Plus size={24} /></div>
          <span>Add More Banner ({20 - banners.length} remaining)</span>
        </button>
      )}

      {/* Upload New/Change Banner Section */}
      {showUploadBox && (
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2.5rem] p-6 md:p-8 shadow-sm space-y-8 mt-8">

          <div className="flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                {editingIndex !== null ? `Change Banner ${editingIndex + 1}` : "Upload New Banner"}
              </span>
              <div className="flex items-center gap-3">
                {selectedFile && (
                  <span className="px-2.5 py-1 text-[11px] font-bold text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30 dark:text-yellow-400 rounded-full border border-yellow-100 dark:border-yellow-900/50 flex items-center gap-1">
                    <RefreshCw size={10} className="animate-spin" />
                    Unsaved Draft
                  </span>
                )}
                {banners.length > 0 && (
                  <button
                    onClick={() => { setShowUploadUI(false); setEditingIndex(null); setSelectedFile(null); setPreview(""); }}
                    className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-all"
                  >
                    <X size={20} />
                  </button>
                )}
              </div>
            </div>

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => {
                if (!preview) document.getElementById("banner-upload-input")?.click();
              }}
              className={`w-full aspect-[21/9] rounded-[2rem] border-4 border-dashed transition-all overflow-hidden relative group flex flex-col items-center justify-center 
                ${!preview ? "cursor-pointer" : ""}
                ${isDragging
                  ? "border-blue-500 bg-blue-50/10"
                  : "border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-gray-50/50 dark:bg-gray-950/30"
                }`}
            >
              {preview ? (
                <div className="w-full h-full relative group">
                  <img
                    src={preview}
                    alt="New Banner Preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-4 right-4 z-10">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                        setPreview("");
                      }}
                      className="p-2 bg-black/50 hover:bg-red-500/90 backdrop-blur-md rounded-full text-white transition-all shadow-lg"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center px-6 pointer-events-none">
                  <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 transition-transform group-hover:scale-110">
                    <Upload className="text-gray-400 dark:text-gray-500" size={26} />
                  </div>
                  <p className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Drag and drop your image here
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    or click to browse from files
                  </p>
                </div>
              )}
              <input
                id="banner-upload-input"
                type="file"
                accept="image/*"
                hidden
                onChange={handleFileChange}
              />
            </div>

            <div className="mt-3 flex justify-between items-center text-xs text-gray-400 dark:text-gray-500">
              <span>Recommended aspect ratio: 21:9 (e.g. 1200x514px)</span>
              <span>Supports JPG, PNG, WEBP</span>
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex gap-4 pt-4 border-t border-gray-100 dark:border-gray-800">
            <div className="flex-1 flex gap-4">
              {hasChanges && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    setPreview("");
                  }}
                  disabled={isSaving}
                  className="flex-1 px-6 py-4 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/55 dark:text-gray-300 rounded-2xl font-bold transition-all active:scale-[0.98] disabled:opacity-50 text-center"
                >
                  Reset
                </button>
              )}

              <button
                type="button"
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
                className={`flex-1 px-6 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-40
                  ${hasChanges && !isSaving
                    ? "bg-blue-950 text-white dark:bg-white dark:text-black hover:bg-blue-900 dark:hover:bg-gray-100 shadow-md"
                    : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600 cursor-not-allowed"
                  }`}
              >
                {isSaving ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <Save size={18} />
                )}
                <span>{isSaving ? "Saving..." : editingIndex !== null ? "Update Banner" : "Upload Banner"}</span>
              </button>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}

