import { useState, useRef, useEffect } from "react";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { uploadFile } from "../../lib/upload";
import {
  X,
  Camera,
  Upload,
  Loader2,
  Copy,
  Check,
  Coins,
  Gift,
  ArrowRightLeft,
  Trash2,
  User as UserIcon,
  Mail,
  Phone,
  ShieldAlert,
} from "lucide-react";
import toast from "react-hot-toast";

interface EditResellerModalProps {
  isOpen: boolean;
  onClose: () => void;
  reseller: any;
  onUpdated: (updatedReseller: any) => void;
  onRemoved: (resellerId: string) => void;
  onOpenTransfer?: (reseller: any) => void;
}

export default function EditResellerModal({
  isOpen,
  onClose,
  reseller,
  onUpdated,
  onRemoved,
  onOpenTransfer,
}: EditResellerModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Photo states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");

  // Permission states
  const [canSendGift, setCanSendGift] = useState(false);
  const [canTransfer, setCanTransfer] = useState(true);
  const [isCoinBlocked, setIsCoinBlocked] = useState(false);

  // UI state
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (reseller) {
      setName(reseller.displayName || reseller.name || "");
      setEmail(reseller.email || "");
      setPhone(reseller.phoneNumber || reseller.phone || reseller.whatsapp || "");
      setPreviewUrl(reseller.photoUrl || reseller.logo || "");
      setSelectedFile(null);
      
      // Permissions:
      // canSendGift: default false for resellers unless enabled
      setCanSendGift(Boolean(reseller.canSendGift === true || reseller.allowGift === true));
      // canTransfer: default true unless disabled
      setCanTransfer(reseller.canTransfer !== false && reseller.allowTransaction !== false);
      // isCoinBlocked:
      setIsCoinBlocked(Boolean(reseller.isCoinBlocked || reseller.coinBlocked));
    }
  }, [reseller]);

  if (!isOpen || !reseller) return null;

  const displayId = reseller.displayId || reseller.uid || reseller.id;
  const balance = reseller.balance ?? 0;

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(field);
    toast.success(`Copied ${field} to clipboard!`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size must be under 10MB");
        return;
      }
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Name cannot be empty");
      return;
    }

    setSaving(true);
    const tid = toast.loading("Updating reseller details...");

    try {
      let finalPhotoUrl = previewUrl;

      if (selectedFile) {
        try {
          finalPhotoUrl = await uploadFile(selectedFile);
        } catch (uploadErr: any) {
          console.error("Image upload failed:", uploadErr);
          toast.error("Failed to upload image: " + (uploadErr.message || "Unknown error"));
          setSaving(false);
          toast.dismiss(tid);
          return;
        }
      }

      const updateData: any = {
        displayName: name.trim(),
        name: name.trim(),
        canSendGift: isCoinBlocked ? false : Boolean(canSendGift),
        allowGift: isCoinBlocked ? false : Boolean(canSendGift),
        canTransfer: isCoinBlocked ? false : Boolean(canTransfer),
        allowTransaction: isCoinBlocked ? false : Boolean(canTransfer),
        isCoinBlocked: Boolean(isCoinBlocked),
        coinBlocked: Boolean(isCoinBlocked),
        updatedAt: serverTimestamp(),
      };

      if (finalPhotoUrl) {
        updateData.photoUrl = finalPhotoUrl;
      }

      if (email.trim()) {
        updateData.email = email.trim();
      }

      if (phone.trim()) {
        updateData.phoneNumber = phone.trim();
        updateData.phone = phone.trim();
      }

      await updateDoc(doc(db, "users", reseller.id), updateData);

      const updated = {
        ...reseller,
        ...updateData,
        photoUrl: finalPhotoUrl || reseller.photoUrl,
      };

      onUpdated(updated);
      toast.success("Reseller updated successfully!", { id: tid });
      onClose();
    } catch (err: any) {
      console.error("Error updating reseller:", err);
      toast.error(err.message || "Failed to update reseller", { id: tid });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveReseller = async () => {
    const resellerTitle = reseller.displayName || reseller.name || "this reseller";
    if (
      !window.confirm(
        `Are you sure you want to remove reseller privileges from "${resellerTitle}"?\n\nThey will be reverted to a normal user account.`
      )
    ) {
      return;
    }

    setRemoving(true);
    const tid = toast.loading("Removing reseller privileges...");

    try {
      await updateDoc(doc(db, "users", reseller.id), {
        role: "user",
        isReseller: false,
        isreseller: false,
        isreseler: false,
        canSendGift: false,
        allowGift: false,
        updatedAt: serverTimestamp(),
      });

      onRemoved(reseller.id);
      toast.success("Reseller removed successfully!", { id: tid });
      onClose();
    } catch (err: any) {
      console.error("Error removing reseller:", err);
      toast.error(err.message || "Failed to remove reseller", { id: tid });
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <UserIcon size={20} />
            </div>
            <div>
              <h3 className="text-xl font-bold dark:text-white">Reseller Settings</h3>
              <p className="text-xs text-gray-500">Edit profile details & dynamic permissions</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-500"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSave} className="overflow-y-auto p-6 space-y-6 flex-1">
          {/* Profile Photo Section */}
          <div className="flex flex-col sm:flex-row items-center gap-5 bg-gray-50 dark:bg-gray-800/40 p-5 rounded-2xl border border-gray-100 dark:border-gray-800">
            <div className="relative group shrink-0">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt={name}
                  className="w-20 h-20 rounded-full object-cover border-2 border-blue-500/40 shadow-sm"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 text-2xl font-bold border-2 border-blue-500/40">
                  {name ? name.charAt(0).toUpperCase() : "R"}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                title="Change Photo"
              >
                <Camera size={22} />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            <div className="flex-1 text-center sm:text-left min-w-0">
              <h4 className="font-bold text-base dark:text-white truncate">
                {name || "Reseller"}
              </h4>
              <p className="text-xs text-gray-500 font-mono mt-0.5">ID: {displayId}</p>
              <div className="flex items-center justify-center sm:justify-start gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 transition-colors"
                >
                  <Upload size={14} /> Upload New Photo
                </button>
                {previewUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewUrl("");
                      setSelectedFile(null);
                    }}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Quick Info & Balance Card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-emerald-50 dark:bg-emerald-950/20 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase text-emerald-700 dark:text-emerald-400 tracking-wider">
                  Reseller Balance
                </p>
                <div className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 mt-1">
                  <Coins size={18} />
                  {balance.toLocaleString()}
                </div>
              </div>
              {onOpenTransfer && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenTransfer(reseller);
                  }}
                  className="px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center gap-1"
                >
                  <ArrowRightLeft size={13} /> Send
                </button>
              )}
            </div>

            <div className="bg-gray-50 dark:bg-gray-800/40 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase text-gray-500 tracking-wider">
                  Display ID
                </p>
                <p className="text-base font-mono font-bold dark:text-white mt-1">{displayId}</p>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(displayId, "Display ID")}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors text-gray-500"
                title="Copy ID"
              >
                {copiedId === "Display ID" ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
              </button>
            </div>
          </div>

          {/* Inputs Section */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-600 dark:text-gray-400 mb-1.5">
                Reseller Name *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter reseller name"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 font-medium transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-600 dark:text-gray-400 mb-1.5">
                  Email
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="reseller@example.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 font-medium transition-all text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-600 dark:text-gray-400 mb-1.5">
                  Phone / WhatsApp
                </label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+880 1xxx-xxxxxx"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 font-medium transition-all text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Dynamic Permissions Section */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-black uppercase text-gray-400 tracking-wider">
              Reseller Permissions (Dynamic Settings)
            </h4>

            {/* Permission 1: Gift Sending */}
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800 hover:border-purple-300 dark:hover:border-purple-800/50 transition-all">
              <div className="flex items-center gap-3.5 min-w-0 pr-3">
                <div className={`p-2.5 rounded-xl ${canSendGift ? "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" : "bg-gray-200 text-gray-500 dark:bg-gray-700"}`}>
                  <Gift size={20} />
                </div>
                <div>
                  <p className="font-bold text-sm dark:text-white flex items-center gap-2">
                    Allow Sending Gifts
                    {canSendGift && (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400">
                        ENABLED
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    When enabled, this reseller is permitted to send gifts in live stream & audio rooms.
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={canSendGift}
                  onChange={(e) => setCanSendGift(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            {/* Permission 2: Coin Transfers / Transactions */}
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-800/50 transition-all">
              <div className="flex items-center gap-3.5 min-w-0 pr-3">
                <div className={`p-2.5 rounded-xl ${canTransfer ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" : "bg-gray-200 text-gray-500 dark:bg-gray-700"}`}>
                  <ArrowRightLeft size={20} />
                </div>
                <div>
                  <p className="font-bold text-sm dark:text-white flex items-center gap-2">
                    Allow Coin Transfers (Transactions)
                    {canTransfer && (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
                        ENABLED
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    When enabled, this reseller can transfer coins to users from their Reseller Hub.
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={canTransfer}
                  onChange={(e) => setCanTransfer(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Permission 3: Block / Freeze All Coins */}
            <div className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
              isCoinBlocked 
                ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/50" 
                : "bg-gray-50 dark:bg-gray-800/40 border-gray-100 dark:border-gray-800 hover:border-red-200"
            }`}>
              <div className="flex items-center gap-3.5 min-w-0 pr-3">
                <div className={`p-2.5 rounded-xl ${isCoinBlocked ? "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400" : "bg-gray-200 text-gray-500 dark:bg-gray-700"}`}>
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <p className="font-bold text-sm dark:text-white flex items-center gap-2">
                    Block / Freeze All Coins (কয়েন ব্লক)
                    {isCoinBlocked && (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400">
                        BLOCKED
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    When blocked, this reseller cannot spend, transfer, send gifts, or use their coins anywhere.
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={isCoinBlocked}
                  onChange={(e) => setIsCoinBlocked(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
              </label>
            </div>
          </div>

          {/* Danger Zone: Remove Reseller */}
          <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between p-4 bg-red-50/60 dark:bg-red-950/20 rounded-2xl border border-red-100 dark:border-red-900/30">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 shrink-0">
                  <ShieldAlert size={18} />
                </div>
                <div>
                  <p className="font-bold text-sm text-red-900 dark:text-red-200">Remove Reseller Role</p>
                  <p className="text-xs text-red-600/80 dark:text-red-400/80">
                    Demotes this account to a regular user.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRemoveReseller}
                disabled={removing || saving}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50 shrink-0"
              >
                {removing ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Remove
              </button>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              onClick={onClose}
              disabled={saving || removing}
              className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 font-bold text-sm dark:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || removing}
              className="px-7 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm flex items-center gap-2 transition-all shadow-md shadow-blue-500/20 disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : null}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
