import { useState, useEffect } from "react";
import { uploadFile } from "../../lib/upload";
import { db } from "../../lib/firebase";
import { doc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";
import { Upload, Loader2, Info, Save, ImageIcon } from "lucide-react";
import toast from "react-hot-toast";

export default function AboutUsManager() {
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [preview, setPreview] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "about_us", "info"), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setCompanyName(data.companyName || "");
        setDescription(data.description || "");
        setEmail(data.email || "");
        setPhone(data.phone || "");
        setPreview(data.logoUrl || "");
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    if (!companyName || !description) {
      toast.error("Name and Description are required");
      return;
    }

    setIsSaving(true);
    const tid = toast.loading("Updating About Us...");

    try {
      let finalUrl = preview;

      if (selectedFile) {
        finalUrl = await uploadFile(selectedFile);
      }

      await setDoc(doc(db, "about_us", "info"), {
        companyName,
        description,
        email,
        phone,
        logoUrl: finalUrl,
        updatedAt: serverTimestamp(),
      });

      toast.success("Information updated", { id: tid });
    } catch {
      toast.error("Update failed", { id: tid });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-gray-400" size={40} />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-10 ">
      <div className="flex items-center gap-3 mb-10">
        <div className="p-3 bg-blue-500/10 rounded-2xl">
          <Info className="text-blue-500" size={28} />
        </div>
        <div>
          <h1 className="text-2xl font-bold dark:text-white">About Us Settings</h1>
          <p className="text-sm text-gray-500">Update company profile and app details</p>
        </div>
      </div>

      <div className="space-y-8 bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border dark:border-gray-800 shadow-sm">
        
        <div className="flex flex-col items-center">
          <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">
            Company Logo / Banner
          </label>
          <div 
            onClick={() => document.getElementById("logo-upload")?.click()}
            className="w-full aspect-video md:aspect-[21/9] border-4 border-dashed border-gray-200 dark:border-gray-800 rounded-[2rem] flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-all overflow-hidden relative group"
          >
            {preview ? (
              <img src={preview} className="w-full h-full object-contain p-6" alt="Logo" />
            ) : (
              <div className="text-center">
                <ImageIcon className="text-gray-300 mx-auto mb-2" size={48} />
                <p className="text-sm font-bold text-gray-400">Click to upload image</p>
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <Upload className="text-white" />
            </div>
          </div>
          <input id="logo-upload" type="file" hidden onChange={handleFileChange} />
        </div>

        <div className="space-y-6">
          <div>
            <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider ml-1">
              Company Name
            </label>
            <input
              type="text"
              placeholder="Enter company name"
              className="w-full mt-2 p-4 rounded-2xl border dark:border-gray-800 bg-gray-50 dark:bg-transparent dark:text-white outline-none focus:ring-2 ring-blue-500/20 font-bold transition-all"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </div>

          <div>
            <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider ml-1">
              Description / Bio
            </label>
            <textarea
              rows={6}
              placeholder="Tell something about your apps or company..."
              className="w-full mt-2 p-4 rounded-2xl border dark:border-gray-800 bg-gray-50 dark:bg-transparent dark:text-white outline-none focus:ring-2 ring-blue-500/20 font-medium transition-all"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider ml-1">
                Support Email
              </label>
              <input
                type="email"
                placeholder="contact@company.com"
                className="w-full mt-2 p-4 rounded-2xl border dark:border-gray-800 bg-gray-50 dark:bg-transparent dark:text-white outline-none focus:ring-2 ring-blue-500/20 font-bold transition-all"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider ml-1">
                Contact Phone
              </label>
              <input
                type="text"
                placeholder="+880 1XXX XXXXXX"
                className="w-full mt-2 p-4 rounded-2xl border dark:border-gray-800 bg-gray-50 dark:bg-transparent dark:text-white outline-none focus:ring-2 ring-blue-500/20 font-bold transition-all"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>
        </div>

        <button
          disabled={isSaving}
          onClick={handleSave}
          className="w-full py-5 dark:bg-blue-950 bg-gray-200 hover:bg-gray-100  dark:hover:bg-blue-900 dark:text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all  active:scale-[0.98] disabled:opacity-50"
        >
          {isSaving ? (
            <Loader2 className="animate-spin" size={24} />
          ) : (
            <>
              <Save size={22} />
              <span>Save Information</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
