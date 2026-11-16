import { useState, useRef, useEffect, ChangeEvent } from "react";
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
  Building2,
  User as UserIcon,
  Mail,
  Phone,
  MapPin,
  Lock,
  Unlock,
  Key,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Eye,
  EyeOff,
} from "lucide-react";
import toast from "react-hot-toast";

export interface AgencyData {
  id: string;
  name: string;
  holderName: string;
  email: string;
  ownerId: string;
  ownerPhoto?: string;
  logo: string;
  status: "active" | "blocked" | "pending";
  country: string;
  whatsapp?: string;
  createdAt?: { seconds: number };
  agencyName?: string;
  location?: string;
  locationFlag?: string;
  userId?: string;
  whatsappNumber?: string;
  nidFrontUrl?: string;
  nidBackUrl?: string;
  submittedAt?: { seconds: number };
  agencyId?: number | string;
  agencypassword?: string;
  hosts?: string[];
  islock?: boolean;
}

interface EditAgencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  agency: AgencyData;
  onUpdated?: (updatedAgency: Partial<AgencyData>) => void;
}

export default function EditAgencyModal({
  isOpen,
  onClose,
  agency,
  onUpdated,
}: EditAgencyModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [name, setName] = useState("");
  const [holderName, setHolderName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [country, setCountry] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<"active" | "blocked" | "pending">("active");
  const [isLocked, setIsLocked] = useState(false);

  // Photo states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");

  // UI state
  const [saving, setSaving] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (agency) {
      setName(agency.name || agency.agencyName || "");
      setHolderName(agency.holderName || "");
      setWhatsapp(agency.whatsapp || agency.whatsappNumber || "");
      setCountry(agency.country || agency.location || "");
      setEmail(agency.email || "");
      setPassword(agency.agencypassword || "");
      setStatus(agency.status || "active");
      setIsLocked(agency.islock === true);
      setPreviewUrl(agency.logo || agency.nidFrontUrl || agency.ownerPhoto || "");
      setSelectedFile(null);
    }
  }, [agency]);

  if (!isOpen || !agency) return null;

  const displayId =
    agency.agencyId !== undefined && agency.agencyId !== null
      ? String(agency.agencyId)
      : agency.id && /^\d+$/.test(agency.id)
      ? agency.id
      : "";

  const ownerId = agency.ownerId && agency.ownerId !== "—" ? agency.ownerId : agency.userId || "";

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success(`Copied ${field} to clipboard!`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
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
      toast.error("Agency name cannot be empty");
      return;
    }

    setSaving(true);
    let finalLogoUrl = previewUrl.trim();

    // 1. Upload photo if newly selected
    if (selectedFile) {
      const uploadToastId = toast.loading("Uploading agency logo...");
      try {
        finalLogoUrl = await uploadFile(selectedFile);
        toast.success("Logo uploaded successfully!", { id: uploadToastId });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        toast.error(`Logo upload failed: ${message}`, { id: uploadToastId });
        setSaving(false);
        return;
      }
    }

    const saveToastId = toast.loading("Saving agency changes...");

    try {
      const trimmedName = name.trim();
      const trimmedHolder = holderName.trim();
      const trimmedWhatsapp = whatsapp.trim();
      const trimmedCountry = country.trim();
      const trimmedEmail = email.trim();
      const trimmedPassword = password.trim();

      // 1. Update in agency_applications collection
      await updateDoc(doc(db, "agency_applications", agency.id), {
        agencyName: trimmedName,
        name: trimmedName,
        holderName: trimmedHolder,
        whatsapp: trimmedWhatsapp,
        whatsappNumber: trimmedWhatsapp,
        country: trimmedCountry,
        location: trimmedCountry,
        email: trimmedEmail,
        logo: finalLogoUrl,
        nidFrontUrl: finalLogoUrl,
        photoUrl: finalLogoUrl,
        status: status,
        islock: isLocked,
        agencypassword: trimmedPassword,
        updatedAt: serverTimestamp(),
      });

      // 2. Update in agencies collection if displayId exists
      if (displayId) {
        await updateDoc(doc(db, "agencies", displayId), {
          name: trimmedName,
          agencyName: trimmedName,
          holderName: trimmedHolder,
          whatsapp: trimmedWhatsapp,
          country: trimmedCountry,
          location: trimmedCountry,
          email: trimmedEmail,
          logo: finalLogoUrl,
          status: status,
          islock: isLocked,
          agencypassword: trimmedPassword,
          updatedAt: serverTimestamp(),
        }).catch((err) => {
          console.warn("Agencies collection doc update warning:", err);
        });
      }

      // 3. Update in users collection for agency owner if ownerId exists
      if (ownerId && ownerId !== "—") {
        await updateDoc(doc(db, "users", ownerId), {
          agencyName: trimmedName,
          islock: isLocked,
          ...(trimmedPassword ? { agencypassword: trimmedPassword } : {}),
        }).catch((err) => {
          console.warn("User doc update warning:", err);
        });
      }

      const updatedData: Partial<AgencyData> = {
        name: trimmedName,
        agencyName: trimmedName,
        holderName: trimmedHolder,
        whatsapp: trimmedWhatsapp,
        whatsappNumber: trimmedWhatsapp,
        country: trimmedCountry,
        location: trimmedCountry,
        email: trimmedEmail,
        logo: finalLogoUrl,
        nidFrontUrl: finalLogoUrl,
        status: status,
        islock: isLocked,
        agencypassword: trimmedPassword,
      };

      if (onUpdated) {
        onUpdated(updatedData);
      }

      toast.success("Agency details updated successfully!", { id: saveToastId });
      onClose();
    } catch (err: unknown) {
      console.error("Error updating agency:", err);
      const message = err instanceof Error ? err.message : "Unknown error";
      toast.error(`Failed to update agency: ${message}`, { id: saveToastId });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-800 w-full max-w-xl rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-800/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Building2 size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black dark:text-white">Edit Agency</h2>
              <p className="text-xs text-gray-500 font-medium">Update agency name, logo, owner & credentials</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all text-gray-400 hover:text-gray-700 dark:hover:text-white cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Logo / Image Picker Section */}
          <div className="flex flex-col sm:flex-row items-center gap-5 p-5 bg-gradient-to-br from-blue-50/50 via-indigo-50/30 to-purple-50/40 dark:from-blue-950/20 dark:via-indigo-950/10 dark:to-purple-950/20 rounded-2xl border border-blue-100/60 dark:border-blue-900/30">
            <div className="relative group shrink-0">
              <div className="w-24 h-24 rounded-2xl overflow-hidden ring-4 ring-white dark:ring-gray-900 shadow-md bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt={name || "Agency Logo"}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        name || "A"
                      )}&background=3b82f6&color=fff&rounded=true&bold=true`;
                    }}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-2xl">
                    {name?.charAt(0)?.toUpperCase() || "A"}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 rounded-2xl flex flex-col items-center justify-center text-white text-[11px] font-bold transition-opacity cursor-pointer backdrop-blur-[1px]"
              >
                <Camera size={20} className="mb-1" />
                Change
              </button>
            </div>

            <div className="flex-1 text-center sm:text-left space-y-2">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                {displayId && (
                  <span className="px-2.5 py-1 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-mono font-bold rounded-lg tracking-wider">
                    ID: {displayId}
                  </span>
                )}
                <span
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold capitalize ${
                    status === "active"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                      : status === "blocked"
                      ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
                  }`}
                >
                  {status}
                </span>
                {isLocked && (
                  <span className="px-2.5 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold rounded-lg flex items-center gap-1">
                    <Lock size={11} /> Locked
                  </span>
                )}
              </div>

              <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                >
                  <Upload size={13} />
                  Upload Image
                </button>
                {selectedFile && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      setPreviewUrl(agency.logo || agency.nidFrontUrl || "");
                    }}
                    className="px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Supports JPG, PNG, WEBP up to 10MB
              </p>
            </div>
          </div>

          {/* Form Fields Grid */}
          <div className="space-y-4">
            {/* Agency Name */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                Agency Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Building2
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Royal Stars Agency"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-sm font-semibold dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            {/* Holder Name & WhatsApp */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                  Holder Name
                </label>
                <div className="relative">
                  <UserIcon
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="text"
                    value={holderName}
                    onChange={(e) => setHolderName(e.target.value)}
                    placeholder="Owner / Holder Full Name"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-sm font-semibold dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                  WhatsApp / Phone
                </label>
                <div className="relative">
                  <Phone
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="text"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="e.g. +8801700000000"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-sm font-semibold dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Location & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                  Location / Country
                </label>
                <div className="relative">
                  <MapPin
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="e.g. Bangladesh"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-sm font-semibold dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="agency@example.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-sm font-semibold dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Agency Password */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                Agency Portal Password
              </label>
              <div className="relative">
                <Key
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Set agency password"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-sm font-mono font-semibold dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Status & Lock Controls */}
            <div className="pt-2 border-t border-gray-100 dark:border-gray-800 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Status Toggle */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                    Agency Status
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 p-1 bg-gray-100 dark:bg-gray-900 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setStatus("active")}
                      className={`py-1.5 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer ${
                        status === "active"
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                      }`}
                    >
                      <ShieldCheck size={13} /> Active
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatus("blocked")}
                      className={`py-1.5 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer ${
                        status === "blocked"
                          ? "bg-red-600 text-white shadow-sm"
                          : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                      }`}
                    >
                      <ShieldAlert size={13} /> Blocked
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatus("pending")}
                      className={`py-1.5 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer ${
                        status === "pending"
                          ? "bg-amber-600 text-white shadow-sm"
                          : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                      }`}
                    >
                      <Clock size={13} /> Pending
                    </button>
                  </div>
                </div>

                {/* Lock Status Toggle */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                    Account Lock Status
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsLocked(!isLocked)}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-between border transition-all cursor-pointer ${
                      isLocked
                        ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/40"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/40"
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      {isLocked ? <Lock size={14} /> : <Unlock size={14} />}
                      {isLocked ? "Account is Locked" : "Account is Unlocked"}
                    </span>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-white/80 dark:bg-gray-900">
                      Toggle
                    </span>
                  </button>
                </div>
              </div>

              {/* Readonly info bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-gray-50 dark:bg-gray-900/60 rounded-xl text-xs text-gray-500 font-mono">
                {displayId && (
                  <div className="flex items-center gap-1.5">
                    <span>Agency ID:</span>
                    <span className="font-bold text-gray-800 dark:text-gray-200">{displayId}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(displayId, "Agency ID")}
                      className="text-gray-400 hover:text-blue-500 transition-colors"
                      title="Copy Agency ID"
                    >
                      {copiedField === "Agency ID" ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                    </button>
                  </div>
                )}
                {ownerId && (
                  <div className="flex items-center gap-1.5 truncate">
                    <span>Owner UID:</span>
                    <span className="font-bold text-gray-800 dark:text-gray-200 truncate max-w-[140px]">{ownerId}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(ownerId, "Owner UID")}
                      className="text-gray-400 hover:text-blue-500 transition-colors"
                      title="Copy Owner UID"
                    >
                      {copiedField === "Owner UID" ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
            >
              {saving ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check size={14} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
