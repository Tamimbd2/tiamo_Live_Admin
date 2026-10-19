import { useState, useRef } from "react";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { uploadFile } from "../../lib/upload";
import { User } from "./UserTable";
import Badge from "../../components/ui/badge/Badge";
import {
  X,
  Camera,
  Upload,
  Loader2,
  Copy,
  Check,
  ExternalLink,
  Calendar,
  Shield,
  Gem,
  Gift,
  Trash2,
  User as UserIcon,
} from "lucide-react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router";

interface UserDetailsModalProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onUserUpdated: (updatedUser: User) => void;
}

export default function UserDetailsModal({
  user,
  isOpen,
  onClose,
  onUserUpdated,
}: UserDetailsModalProps) {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [name, setName] = useState(
    user.displayName || user.fullName || user.name || ""
  );
  const [email, setEmail] = useState(user.email || "");
  const [isActive, setIsActive] = useState<boolean>(user.isActive ?? true);

  // Photo states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>(
    user.photoUrl || user.avatar || user.photo || ""
  );
  const [isPhotoRemoved, setIsPhotoRemoved] = useState(false);

  // UI state
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(field);
    toast.success(`Copied ${field} to clipboard!`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast.error("Please upload a valid image file");
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image file size should be less than 5MB");
        return;
      }

      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setIsPhotoRemoved(false);
    }
  };

  const handleRemovePhoto = () => {
    setSelectedFile(null);
    setPreviewUrl("");
    setIsPhotoRemoved(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Please provide a valid user name");
      return;
    }

    setSaving(true);
    const toastId = toast.loading(
      selectedFile ? "Uploading photo & updating profile..." : "Updating user profile..."
    );

    try {
      let finalPhotoUrl = user.photoUrl || user.avatar || user.photo || "";

      if (selectedFile) {
        finalPhotoUrl = await uploadFile(selectedFile, "avatars");
      } else if (isPhotoRemoved) {
        finalPhotoUrl = "";
      }

      const trimmedName = name.trim();
      const trimmedEmail = email.trim();

      const updatePayload: Record<string, any> = {
        displayName: trimmedName,
        fullName: trimmedName,
        name: trimmedName,
        email: trimmedEmail,
        isActive: isActive,
        photoUrl: finalPhotoUrl,
        avatar: finalPhotoUrl,
        photo: finalPhotoUrl,
        updatedAt: serverTimestamp(),
      };

      await updateDoc(doc(db, "users", user.id), updatePayload);

      const updatedUser: User = {
        ...user,
        displayName: trimmedName,
        fullName: trimmedName,
        name: trimmedName,
        email: trimmedEmail,
        isActive: isActive,
        photoUrl: finalPhotoUrl,
        avatar: finalPhotoUrl,
        photo: finalPhotoUrl,
      };

      onUserUpdated(updatedUser);
      toast.success("User updated successfully!", { id: toastId });
      onClose();
    } catch (error: any) {
      console.error("Failed to update user:", error);
      toast.error(error?.message || "Failed to update user", { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    if (isNaN(date.getTime())) return "N/A";
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  // Determine user role badge display
  const userRole =
    user.role ||
    (user.isAdmin ? "admin" : null) ||
    (user.isHost || user.ishost ? "host" : null) ||
    (user.isAgent ? "agent" : null) ||
    (user.isModerator ? "moderator" : null) ||
    (user.isReseller ? "reseller" : null) ||
    "user";

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl relative my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with gradient banner */}
        <div className="relative h-28 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-t-3xl p-6 flex justify-between items-start">
          <div className="flex items-center gap-2 text-white">
            <UserIcon size={20} className="opacity-80" />
            <h2 className="text-xl font-bold tracking-tight">User Details & Edit</h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center transition-colors backdrop-blur-sm"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSave} className="px-6 pb-6 pt-0">
          {/* Avatar and Top Info Row */}
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 -mt-14 mb-6">
            {/* Avatar with Upload Hover */}
            <div className="relative group shrink-0">
              <div className="w-28 h-28 rounded-full border-4 border-white dark:border-gray-900 overflow-hidden shadow-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt={name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-100 dark:bg-gray-800">
                    <UserIcon size={44} />
                  </div>
                )}
              </div>

              {/* Hover Overlay to Trigger Upload */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer border-4 border-transparent"
                title="Change Photo"
              >
                <Camera size={22} />
                <span className="text-[10px] font-bold mt-1 uppercase">Change</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* Quick Actions & Badges next to avatar */}
            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
                <span className="text-xl font-extrabold text-gray-900 dark:text-white">
                  {name || "Unnamed User"}
                </span>

                {user.displayId && (
                  <button
                    type="button"
                    onClick={() => handleCopy(user.displayId!, "Display ID")}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 text-xs font-mono font-bold hover:bg-blue-100 transition-colors"
                    title="Click to copy Display ID"
                  >
                    #{user.displayId}
                    {copiedId === "Display ID" ? (
                      <Check size={12} className="text-green-500" />
                    ) : (
                      <Copy size={12} />
                    )}
                  </button>
                )}

                <Badge color={isActive ? "success" : "warning"}>
                  {isActive ? "Active" : "Inactive"}
                </Badge>

                <span className="px-2.5 py-0.5 rounded-lg bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800 text-xs font-semibold capitalize">
                  {userRole}
                </span>
              </div>

              {/* Photo Upload / Remove Buttons */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-300 transition-colors"
                >
                  <Upload size={13} />
                  {selectedFile ? "Change Selected Photo" : "Upload New Photo"}
                </button>

                {previewUrl && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    title="Remove custom photo"
                  >
                    <Trash2 size={13} />
                    Remove
                  </button>
                )}

                {selectedFile && (
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium truncate max-w-[160px]">
                    ✓ {selectedFile.name}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Editable Form Inputs */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                Display Name / Full Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter full name or display name"
                  className="w-full px-4 py-3 rounded-2xl border border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 text-gray-900 dark:text-white font-medium text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full px-4 py-3 rounded-2xl border border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 text-gray-900 dark:text-white font-medium text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                  Account Status
                </label>
                <select
                  value={isActive ? "active" : "inactive"}
                  onChange={(e) => setIsActive(e.target.value === "active")}
                  className="w-full px-4 py-3 rounded-2xl border border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 text-gray-900 dark:text-white font-medium text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer"
                >
                  <option value="active">Active (Full Access)</option>
                  <option value="inactive">Inactive / Suspended</option>
                </select>
              </div>
            </div>
          </div>

          {/* User Details Grid */}
          <div className="bg-gray-50 dark:bg-gray-800/40 rounded-2xl p-4 border border-gray-200/70 dark:border-gray-800 mb-6">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3 flex items-center justify-between">
              <span>Account Information & Metadata</span>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate(`/user/${user.id}`);
                }}
                className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 normal-case font-semibold text-xs"
              >
                <span>Full Profile Page</span>
                <ExternalLink size={12} />
              </button>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              {/* User ID (UID) */}
              <div className="p-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200/50 dark:border-gray-700/50 flex flex-col justify-between">
                <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1 font-semibold">
                  <Shield size={13} className="text-blue-500" />
                  User UID
                </span>
                <div className="flex items-center justify-between mt-1">
                  <span className="font-mono text-gray-800 dark:text-gray-200 truncate max-w-[130px]" title={user.id}>
                    {user.id}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(user.id, "UID")}
                    className="text-gray-400 hover:text-blue-500 transition-colors p-1"
                    title="Copy UID"
                  >
                    {copiedId === "UID" ? (
                      <Check size={13} className="text-green-500" />
                    ) : (
                      <Copy size={13} />
                    )}
                  </button>
                </div>
              </div>

              {/* Display ID */}
              <div className="p-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200/50 dark:border-gray-700/50 flex flex-col justify-between">
                <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1 font-semibold">
                  <UserIcon size={13} className="text-purple-500" />
                  Display ID
                </span>
                <span className="font-mono font-bold text-gray-900 dark:text-white mt-1">
                  {user.displayId ? `#${user.displayId}` : "Not Set"}
                </span>
              </div>

              {/* Role */}
              <div className="p-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200/50 dark:border-gray-700/50 flex flex-col justify-between">
                <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1 font-semibold">
                  <Shield size={13} className="text-amber-500" />
                  Role
                </span>
                <span className="font-bold text-gray-900 dark:text-white capitalize mt-1">
                  {userRole}
                </span>
              </div>

              {/* Diamonds */}
              <div className="p-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200/50 dark:border-gray-700/50 flex flex-col justify-between">
                <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1 font-semibold">
                  <Gem size={13} className="text-cyan-500" />
                  Diamonds
                </span>
                <span className="font-bold text-gray-900 dark:text-white mt-1">
                  {(user.diamonds ?? user.totalReceived ?? 0).toLocaleString()}
                </span>
              </div>

              {/* Gift Diamonds */}
              <div className="p-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200/50 dark:border-gray-700/50 flex flex-col justify-between">
                <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1 font-semibold">
                  <Gift size={13} className="text-rose-500" />
                  Gift Diamonds
                </span>
                <span className="font-bold text-gray-900 dark:text-white mt-1">
                  {(user.giftDiamonds ?? 0).toLocaleString()}
                </span>
              </div>

              {/* Joined Date */}
              <div className="p-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200/50 dark:border-gray-700/50 flex flex-col justify-between">
                <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1 font-semibold">
                  <Calendar size={13} className="text-emerald-500" />
                  Joined Date
                </span>
                <span className="font-semibold text-gray-700 dark:text-gray-300 mt-1">
                  {formatDate(user.createdAt)}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons Footer */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold text-xs hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-lg shadow-blue-600/25 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <Check size={16} />
                  <span>Update User</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
