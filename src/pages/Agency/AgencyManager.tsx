import React, { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import {
  collection,
  onSnapshot,
  query,
  doc,
  deleteDoc,
  updateDoc,
  setDoc,
  serverTimestamp,
  orderBy,
  where,
  getDoc,
  deleteField,
} from "firebase/firestore";
import {
  Plus,
  Trash2,
  ShieldCheck,
  ShieldAlert,
  Eye,
  Building2,
  Search,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  X,
  ZoomIn,
  Phone,
  MapPin,
  User,
  Hash,
  Image as ImageIcon,
  Lock,
  Unlock,
  Key,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";
import AgencyModal from "./AgencyModal";

interface AgencyData {
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
  // raw agency_applications fields
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

const STATUS_CONFIG = {
  active: {
    label: "Active",
    icon: CheckCircle2,
    classes: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  blocked: {
    label: "Blocked",
    icon: XCircle,
    classes: "bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400",
    dot: "bg-red-500",
  },
  pending: {
    label: "Pending",
    icon: Clock,
    classes: "bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
    dot: "bg-amber-500",
  },
};

// ── Inline Component for Dynamic Avatar ──────────────────────────────────
const OwnerAvatar = ({ agency, isLogo }: { agency: AgencyData; isLogo?: boolean }) => {
  const [photo, setPhoto] = useState(isLogo ? (agency.logo || agency.ownerPhoto) : agency.ownerPhoto);

  useEffect(() => {
    if (!photo && agency.ownerId && agency.ownerId !== "—") {
      getDoc(doc(db, "users", agency.ownerId))
        .then((snap) => {
          if (snap.exists()) {
            const d = snap.data();
            const p = d.photo || d.photoUrl || d.profileImage || d.avatar;
            if (p) setPhoto(p);
          }
        })
        .catch(() => {});
    }
  }, [agency.ownerId, photo]);

  const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    (isLogo ? agency.name : agency.holderName) || "A"
  )}&background=3b82f6&color=fff&rounded=true&bold=true`;

  if (isLogo) {
    if (photo) {
      return (
        <img
          src={photo}
          alt={agency.name}
          className="w-12 h-12 rounded-2xl object-cover ring-2 ring-gray-100 dark:ring-gray-800 group-hover:ring-blue-400/40 transition-all"
          onError={(e) => {
            (e.target as HTMLImageElement).src = fallbackUrl;
          }}
        />
      );
    }
    return (
      <div className="w-12 h-12 rounded-2xl bg-rose-500 flex items-center justify-center text-white font-black text-lg">
        {agency.name?.charAt(0)?.toUpperCase() || "A"}
      </div>
    );
  }

  return (
    <img
      src={photo || fallbackUrl}
      alt={agency.holderName}
      className="w-8 h-8 rounded-full object-cover ring-1 ring-gray-200 dark:ring-gray-700"
      onError={(e) => {
        (e.target as HTMLImageElement).src = fallbackUrl;
      }}
    />
  );
};

// ── Detail Modal ─────────────────────────────────────────────────────────
function DetailModal({
  agency,
  onClose,
  onToggleStatus,
}: {
  agency: AgencyData;
  onClose: () => void;
  onToggleStatus: (id: string, status: string) => void;
}) {
  const [zoomImg, setZoomImg] = useState<string | null>(null);
  const [hosts, setHosts] = useState<any[]>([]);
  const [loadingHosts, setLoadingHosts] = useState(false);
  const [usersMap, setUsersMap] = useState<Record<string, any>>({});
  const [ownerDetails, setOwnerDetails] = useState<any | null>(null);
  const statusCfg = STATUS_CONFIG[agency.status] ?? STATUS_CONFIG.pending;

  const frontImg = agency.nidFrontUrl ?? agency.logo ?? "";
  const backImg = agency.nidBackUrl ?? "";
  const phone = agency.whatsapp ?? agency.whatsappNumber ?? "";
  const location = agency.country ?? agency.location ?? "";
  const userId = agency.ownerId ?? agency.userId ?? "";

  const displayId = agency.agencyId !== undefined && agency.agencyId !== null
    ? String(agency.agencyId)
    : (agency.id && /^\d+$/.test(agency.id) ? agency.id : "");

  const [generatingId, setGeneratingId] = useState(false);

  useEffect(() => {
    if (!displayId) return;
    setLoadingHosts(true);
    
      try {
        const filterId = displayId;
        const hostIds = Array.isArray(agency.hosts) ? agency.hosts : [];

        const unsubscribers: (() => void)[] = [];
        const hostsMap = new Map<string, any>();

        const updateHostsState = () => {
          const docs = Array.from(hostsMap.values());
          const hostList = docs.filter((u: any) => u.status !== 'blocked' && u.isActive !== false && (u.isHost === true || u.ishost === true || u.role === 'host'));
          const formattedList = hostList.map((u: any) => ({ ...u, status: "approved", uid: u.uid || u.id }));
          setHosts(formattedList);
          setLoadingHosts(false);
        };

        const handleSnapshot = (snap: any) => {
          let changed = false;
          snap.docChanges().forEach((change: any) => {
            changed = true;
            if (change.type === "removed") {
              hostsMap.delete(change.doc.id);
            } else {
              hostsMap.set(change.doc.id, { id: change.doc.id, ...change.doc.data() });
            }
          });
          if (changed || snap.docs.length === 0) updateHostsState();
        };

        const q1 = query(
          collection(db, "users"),
          where("agencyId", "in", [filterId, String(filterId), Number(filterId)].filter((v, i, a) => a.indexOf(v) === i && !Number.isNaN(v as any)))
        );
        
        unsubscribers.push(onSnapshot(q1, handleSnapshot, (error) => {
          console.error("Error fetching hosts by agencyId:", error);
          setLoadingHosts(false);
        }));

        const chunks = [];
        for (let i = 0; i < hostIds.length; i += 10) {
          chunks.push(hostIds.slice(i, i + 10));
        }

        chunks.forEach(chunk => {
          if (chunk.length === 0) return;
          const qChunk = query(collection(db, "users"), where("__name__", "in", chunk));
          unsubscribers.push(onSnapshot(qChunk, handleSnapshot, (error) => {
             console.error("Error fetching hosts by ID chunk:", error);
          }));
        });

        if (chunks.length === 0) {
           setTimeout(() => updateHostsState(), 500);
        }

        return () => unsubscribers.forEach(unsub => unsub());
      } catch (error) {
      console.error("Error fetching hosts:", error);
      setLoadingHosts(false);
    }
  }, [displayId]);

  useEffect(() => {
    const fetchUsers = async () => {
      const uids = hosts.map((h) => h.uid || h.userId).filter(Boolean);
      const uniqueUids = Array.from(new Set(uids));
      if (uniqueUids.length === 0) return;

      const map: Record<string, any> = {};
      await Promise.all(
        uniqueUids.map(async (uid) => {
          try {
            const userDoc = await getDoc(doc(db, "users", uid));
            if (userDoc.exists()) {
              map[uid] = userDoc.data();
            }
          } catch (e) {
            console.error(e);
          }
        })
      );
      setUsersMap((prev) => ({ ...prev, ...map }));
    };

    if (hosts.length > 0) {
      fetchUsers();
    }
  }, [hosts]);

  useEffect(() => {
    if (!userId || userId === "—") return;
    getDoc(doc(db, "users", userId))
      .then((docSnap) => {
        if (docSnap.exists()) {
          setOwnerDetails(docSnap.data());
        }
      })
      .catch((err) => console.error("Error fetching owner details:", err));
  }, [userId]);

  const handleGenerateMissingId = async () => {
    setGeneratingId(true);
    try {
      const generatedId = Math.floor(100000 + Math.random() * 900000);

      // 1. Create/Set agency document in `agencies` collection
      await setDoc(doc(db, "agencies", generatedId.toString()), {
        agencyId: generatedId,
        name: agency.name || "—",
        holderName: agency.holderName || "—",
        whatsapp: phone,
        country: location,
        locationFlag: agency.locationFlag || "",
        email: agency.email || "",
        ownerId: userId,
        logo: agency.logo || "",
        nidFront: agency.nidFrontUrl || "",
        status: "active",
        applicationId: agency.id,
        createdAt: serverTimestamp(),
      });

      // 2. Update user's document to assign agency role
      if (userId && userId !== "—") {
        await updateDoc(doc(db, "users", userId), {
          isAgency: true,
          isHost: false,
          agencyId: generatedId,
          role: "agency",
        }).catch(() => {});
      }

      // 3. Update the agency_applications with active status and agencyId
      await updateDoc(doc(db, "agency_applications", agency.id), {
        status: "active",
        agencyId: generatedId,
      });

      toast.success(`Successfully generated ID: ${generatedId}`);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate ID");
    } finally {
      setGeneratingId(false);
    }
  };

  const infoRows = [
    {
      icon: Hash,
      label: "Agency ID",
      value: displayId || "Pending",
      mono: true,
      highlight: true,
      action: !displayId ? (
        <button
          onClick={handleGenerateMissingId}
          disabled={generatingId}
          className="ml-2 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-[10px] font-black uppercase rounded-lg transition-all"
        >
          {generatingId ? "Generating..." : "Generate 6-Digit ID"}
        </button>
      ) : null,
    },
    { icon: User, label: "Holder Name", value: agency.holderName },
    { icon: Phone, label: "Phone / WhatsApp", value: phone },
    { icon: MapPin, label: "Location", value: `${agency.locationFlag ?? ""} ${location}`.trim() },
    { icon: Hash, label: "Owner / User ID", value: userId, mono: true },
    { icon: Building2, label: "Agency Name", value: agency.name },
    ...(agency.email ? [{ icon: User, label: "Email", value: agency.email }] : []),
    ...(agency.agencypassword ? [{ icon: Lock, label: "Agency Password", value: agency.agencypassword }] : []),
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      {/* Zoom overlay */}
      {zoomImg && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/95 cursor-zoom-out"
          onClick={() => setZoomImg(null)}
        >
          <img src={zoomImg} className="max-w-[90vw] max-h-[90vh] rounded-2xl object-contain" />
          <button
            onClick={() => setZoomImg(null)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white"
          >
            <X size={20} />
          </button>
        </div>
      )}

      <div className="bg-white dark:bg-gray-950 border dark:border-gray-800 w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-7 py-5 border-b dark:border-gray-800">
          <div className="flex items-center gap-4">
            {frontImg ? (
              <img
                src={frontImg}
                alt={agency.name}
                className="w-12 h-12 rounded-2xl object-cover ring-2 ring-gray-100 dark:ring-gray-800"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(agency.name || "A")}&background=3b82f6&color=fff&rounded=true&bold=true`;
                }}
              />
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-rose-500 flex items-center justify-center text-white font-black text-xl">
                {agency.name?.charAt(0)?.toUpperCase() || "A"}
              </div>
            )}
            <div>
              <h2 className="text-xl font-black dark:text-white">{agency.name}</h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${statusCfg.classes}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                  {statusCfg.label}
                </span>
                {displayId && (
                  <button
                    onClick={() => { navigator.clipboard.writeText(displayId); toast.success("Agency ID copied!"); }}
                    title="Copy Agency ID"
                    className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-sm font-black font-mono rounded-xl tracking-wider hover:bg-blue-200 dark:hover:bg-blue-500/30 transition-all"
                  >
                    Agency ID: {displayId} 📋
                  </button>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all"
          >
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <div className="p-7 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-4">
            {infoRows.map(({ icon: Icon, label, value, mono, highlight, action }) => (
              <div key={label} className={`rounded-2xl p-4 ${
                highlight ? "bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20" : "bg-gray-50 dark:bg-gray-900"
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <Icon size={13} className={highlight ? "text-blue-500" : "text-gray-400"} />
                  <p className={`text-[10px] font-black uppercase tracking-wider ${
                    highlight ? "text-blue-500" : "text-gray-400"
                  }`}>{label}</p>
                </div>
                <div className="flex items-center justify-between min-w-0 w-full">
                  {label === "Owner / User ID" && ownerDetails ? (
                    <div className="flex items-center gap-3 mt-1 min-w-0 w-full">
                      {ownerDetails.photo || ownerDetails.photoUrl || ownerDetails.avatar || ownerDetails.profileImage ? (
                        <img
                          src={ownerDetails.photo || ownerDetails.photoUrl || ownerDetails.avatar || ownerDetails.profileImage}
                          className="w-9 h-9 rounded-full object-cover shrink-0 border border-gray-200 dark:border-gray-800"
                          alt=""
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0 text-blue-500 font-bold text-xs">
                          {(ownerDetails.name || ownerDetails.displayName || "U").charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold dark:text-white truncate leading-tight">
                          {ownerDetails.name || ownerDetails.displayName || "Unknown User"}
                        </p>
                        <p className="text-[10px] text-gray-500 font-mono truncate leading-none mt-1">
                          ID: {ownerDetails.displayId || ownerDetails.uid || userId}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className={`font-semibold dark:text-white truncate ${
                      mono 
                        ? (highlight ? "font-mono text-blue-600 dark:text-blue-400 text-base font-extrabold" : "font-mono text-blue-600 dark:text-blue-400 text-xs")
                        : "text-sm"
                    }`}>
                      {value || "—"}
                    </p>
                  )}
                  {action}
                </div>
              </div>
            ))}
          </div>

          {/* NID Images */}
          {(frontImg || backImg) && (
            <div>
              <p className="text-xs font-black uppercase text-gray-400 tracking-wider mb-3">Documents / Logo</p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "NID / Logo", url: frontImg },
                  { label: "NID Back", url: backImg },
                ].map(({ label, url }) => (
                  <div key={label} className="group relative flex flex-col">
                    <div className="text-[10px] font-bold uppercase text-gray-400 mb-1.5">{label}</div>
                    <div className="relative overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 transition-all duration-300 hover:shadow-md">
                      {url ? (
                        <div className="relative aspect-video w-full h-36 overflow-hidden">
                          <img
                            src={url}
                            alt={label}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                          <button
                            onClick={() => setZoomImg(url)}
                            className="absolute inset-0 bg-black/0 group-hover:bg-black/40 backdrop-blur-[0px] group-hover:backdrop-blur-[2px] flex items-center justify-center transition-all duration-300"
                          >
                            <ZoomIn size={24} className="text-white scale-75 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-300" />
                          </button>
                        </div>
                      ) : (
                        <div className="h-36 flex flex-col items-center justify-center gap-2 text-xs text-gray-400 dark:text-gray-600 bg-gray-50/50 dark:bg-gray-900/50">
                          <ImageIcon size={28} className="stroke-[1.5] text-gray-300 dark:text-gray-700" />
                          <span className="font-semibold">No image</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hosts List */}
          <div className="mt-6 border-t border-gray-100 dark:border-gray-800 pt-6">
            <h3 className="text-xs font-black uppercase text-gray-400 tracking-wider mb-4 flex items-center gap-2">
              <Users size={14} /> Agency Hosts ({hosts.length})
            </h3>
            {loadingHosts ? (
               <div className="text-center py-6 text-xs text-gray-500 font-semibold bg-gray-50 dark:bg-gray-900 rounded-2xl animate-pulse">
                 Loading hosts...
               </div>
            ) : hosts.length > 0 ? (
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                 {hosts.map(host => {
                    const uid = host.uid || host.userId;
                    const user = usersMap[uid];
                    const hostName = user?.name || user?.displayName || host.name || host.fullName || host.displayName || "Unknown Host";
                    const hostAvatar = user?.photo || user?.avatar || user?.profileImage || host.selfieUrl || host.photo || host.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(hostName)}&background=3b82f6&color=fff`;
                    const hostDisplayId = user?.displayId || uid || host.id;
                    const isApproved = host.status === "approved";
                    
                    return (
                      <div key={host.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 hover:border-blue-200 dark:hover:border-blue-900/50 transition-all">
                         <div className="relative">
                           <img 
                             src={hostAvatar} 
                             className="w-10 h-10 rounded-full object-cover shadow-sm border border-gray-200 dark:border-gray-700" 
                             alt={hostName}
                           />
                           <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900 ${isApproved ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                         </div>
                         <div className="overflow-hidden flex-1">
                           <p className="font-bold text-sm dark:text-white truncate">{hostName}</p>
                           <p className="text-xs text-gray-500 font-mono truncate">ID: {hostDisplayId}</p>
                         </div>
                         <div className="text-right pl-2">
                           <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-md ${isApproved ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10' : 'bg-amber-100 text-amber-600 dark:bg-amber-500/10'}`}>
                             {host.status || 'pending'}
                           </span>
                         </div>
                      </div>
                    );
                 })}
               </div>
            ) : (
               <div className="text-center py-8 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 flex flex-col items-center justify-center gap-2">
                  <User size={24} className="text-gray-300 dark:text-gray-600" />
                  <p className="text-xs text-gray-500 font-semibold">No hosts found for this agency.</p>
               </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-7 py-5 border-t dark:border-gray-800 flex gap-3">
          <button
            onClick={() => { onToggleStatus(agency.id, agency.status); onClose(); }}
            className={`flex-1 flex items-center justify-center gap-2 font-bold py-3 rounded-2xl transition-all ${
              agency.status === "active"
                ? "bg-amber-500 hover:bg-amber-600 text-white"
                : "bg-emerald-500 hover:bg-emerald-600 text-white"
            }`}
          >
            {agency.status === "active" ? <ShieldAlert size={16} /> : <ShieldCheck size={16} />}
            {agency.status === "active" ? "Block Agency" : "Activate Agency"}
          </button>
          <button
            onClick={onClose}
            className="flex-1 flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-bold py-3 rounded-2xl transition-all hover:bg-gray-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function PasswordModal({
  agency,
  onClose,
  onSave,
}: {
  agency: AgencyData;
  onClose: () => void;
  onSave: (password: string) => Promise<void>;
}) {
  const [password, setPassword] = useState(agency.agencypassword || "");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    setLoading(true);
    await onSave(password);
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-950 border dark:border-gray-800 w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden p-7">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-black dark:text-white flex items-center gap-2">
            <Lock size={20} className="text-blue-500" />
            Set Agency Password
          </h3>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all"
          >
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        {agency.agencypassword ? (
          <div className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 p-4 rounded-2xl text-xs font-semibold mb-6 flex justify-between items-center border border-emerald-200 dark:border-emerald-500/20">
            <span>Current Password: <strong className="font-mono text-sm">{agency.agencypassword}</strong></span>
          </div>
        ) : (
          <div className="bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 p-4 rounded-2xl text-xs font-semibold mb-6 border border-amber-200 dark:border-amber-500/20">
            No password set yet.
          </div>
        )}

        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Set login password for agency <span className="font-bold text-gray-800 dark:text-white">{agency.name}</span>. This will update the <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded font-mono text-xs text-blue-600 dark:text-blue-400">agencypassword</code> field in Firestore.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-black uppercase text-gray-400 tracking-wider mb-2">
              New Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full px-4 py-3 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-sm outline-none focus:ring-2 ring-blue-500/20 dark:text-white placeholder:text-gray-400 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors text-xs font-bold"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading || !password.trim()}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 rounded-2xl transition-all text-sm flex items-center justify-center gap-2"
            >
              {loading ? "Saving..." : "Save Password"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-bold py-3 rounded-2xl transition-all hover:bg-gray-200 text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <tr className="border-b border-gray-100 dark:border-gray-800/60">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <td key={i} className="p-5">
          <div className="flex items-center gap-3">
            {i === 1 && (
              <div className="w-12 h-12 rounded-2xl bg-gray-200 dark:bg-gray-700 animate-pulse flex-shrink-0" />
            )}
            <div className="flex flex-col gap-2 flex-1">
              <div className="h-3.5 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse w-3/4" />
              <div className="h-2.5 rounded-full bg-gray-100 dark:bg-gray-800 animate-pulse w-1/2" />
            </div>
          </div>
        </td>
      ))}
    </tr>
  );
}

export default function AgencyManager() {
  const [agencies, setAgencies] = useState<AgencyData[]>([]);
  const [filtered, setFiltered] = useState<AgencyData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedAgency, setSelectedAgency] = useState<AgencyData | null>(null);
  const [passwordAgency, setPasswordAgency] = useState<AgencyData | null>(null);

  // Normalize agency_applications fields → AgencyData shape
  const normalize = (d: Record<string, unknown>, id: string): AgencyData => ({
    id,
    name: (d.agencyName as string) || (d.name as string) || "—",
    holderName: (d.holderName as string) || "—",
    email: (d.email as string) || "",
    ownerId: (d.userId as string) || (d.ownerId as string) || "—",
    ownerPhoto: (d.ownerPhoto as string) || (d.photoUrl as string) || (d.avatar as string) || "",
    logo: (d.nidFrontUrl as string) || (d.logo as string) || "",
    status: (d.status as AgencyData["status"]) || "pending",
    country: (d.location as string) || (d.country as string) || "—",
    whatsapp: (d.whatsappNumber as string) || (d.whatsapp as string) || "",
    createdAt: (d.submittedAt as { seconds: number }) || (d.createdAt as { seconds: number }),
    locationFlag: d.locationFlag as string,
    nidFrontUrl: (d.nidFrontUrl as string) || (d.nidFront as string) || "",
    nidBackUrl: (d.nidBackUrl as string) || (d.nidBack as string) || "",
    agencyId: d.agencyId as number | string,
    agencypassword: d.agencypassword as string,
    islock: d.islock === true,
  } as AgencyData);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isUpdatingLock, setIsUpdatingLock] = useState(false);
  const [isBulkLockModalOpen, setIsBulkLockModalOpen] = useState(false);
  const [pendingBulkAction, setPendingBulkAction] = useState<"lock" | "unlock" | null>(null);

  const checkAndAutoGenerateIds = async (list: AgencyData[]) => {
    for (const agency of list) {
      if (agency.status === "active" && !agency.agencyId) {
        try {
          const generatedId = Math.floor(100000 + Math.random() * 900000);

          // 1. Create agency document in `agencies` collection
          await setDoc(doc(db, "agencies", generatedId.toString()), {
            agencyId: generatedId,
            name: agency.name || "—",
            holderName: agency.holderName || "—",
            whatsapp: agency.whatsapp || "",
            country: agency.country || "—",
            locationFlag: agency.locationFlag || "",
            email: agency.email || "",
            ownerId: agency.ownerId || "—",
            logo: agency.logo || "",
            nidFront: agency.nidFrontUrl || "",
            status: "active",
            applicationId: agency.id,
            createdAt: serverTimestamp(),
          });

          // 2. Update user's role and agencyId in `users` collection
          if (agency.ownerId && agency.ownerId !== "—") {
            await updateDoc(doc(db, "users", agency.ownerId), {
              isAgency: true,
              isHost: false,
              agencyId: generatedId,
              role: "agency",
            }).catch(() => {});
          }

          // 3. Update the agency_applications with active status and agencyId
          await updateDoc(doc(db, "agency_applications", agency.id), {
            agencyId: generatedId,
          });

          console.log(`Auto-assigned 6-digit ID: ${generatedId} to active agency: ${agency.name}`);
        } catch (err) {
          console.error("Auto ID generation error:", err);
        }
      }
    }
  };

  useEffect(() => {
    const q = query(collection(db, "agency_applications"), orderBy("submittedAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((d) => normalize(d.data(), d.id));
        setAgencies(data);
        setLoading(false);
        checkAndAutoGenerateIds(data);
      },
      () => {
        // fallback without orderBy
        const q2 = query(collection(db, "agency_applications"));
        onSnapshot(q2, (snap) => {
          const data = snap.docs.map((d) => normalize(d.data(), d.id));
          setAgencies(data);
          setLoading(false);
          checkAndAutoGenerateIds(data);
        });
      }
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let result = agencies;
    if (statusFilter !== "all") {
      if (statusFilter === "locked") {
        result = result.filter((a) => a.islock === true);
      } else {
        result = result.filter((a) => a.status === statusFilter);
      }
    }
    if (search.trim()) {
      const s = search.toLowerCase();
      result = result.filter((a) => {
        const displayId = a.agencyId !== undefined && a.agencyId !== null
          ? String(a.agencyId)
          : (a.id && /^\d+$/.test(a.id) ? a.id : "");
        return (
          a.name?.toLowerCase().includes(s) ||
          a.holderName?.toLowerCase().includes(s) ||
          a.email?.toLowerCase().includes(s) ||
          a.ownerId?.toLowerCase().includes(s) ||
          displayId.toLowerCase().includes(s)
        );
      });
    }
    setFiltered(result);
  }, [agencies, search, statusFilter]);

  const toggleSingleLock = async (agency: AgencyData, currentLockStatus: boolean) => {
    const newStatus = !currentLockStatus;
    try {
      // 1. Update agency_applications
      await updateDoc(doc(db, "agency_applications", agency.id), {
        islock: newStatus,
      });

      // 2. Update agencies collection doc
      const displayId = agency.agencyId !== undefined && agency.agencyId !== null
        ? String(agency.agencyId)
        : (agency.id && /^\d+$/.test(agency.id) ? agency.id : "");
      if (displayId) {
        await updateDoc(doc(db, "agencies", displayId), {
          islock: newStatus,
        }).catch(() => {});
      }

      // 3. Update agency owner in users collection
      if (agency.ownerId && agency.ownerId !== "—") {
        await updateDoc(doc(db, "users", agency.ownerId), {
          islock: newStatus,
        }).catch(() => {});
      }

      setAgencies((prev) =>
        prev.map((a) => (a.id === agency.id ? { ...a, islock: newStatus } : a))
      );
      toast.success(`Agency ${newStatus ? "locked" : "unlocked"} successfully`);
    } catch (error) {
      console.error("Failed to toggle agency lock:", error);
      toast.error("Failed to update lock status");
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(filtered.map((a) => a.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const openBulkLockModal = (action: "lock" | "unlock") => {
    if (selectedIds.size === 0) {
      toast.error(`Please mark at least one agency to ${action}`);
      return;
    }
    setPendingBulkAction(action);
    setIsBulkLockModalOpen(true);
  };

  const confirmBulkAction = async () => {
    if (!pendingBulkAction || selectedIds.size === 0) return;
    const lockStatus = pendingBulkAction === "lock";
    setIsUpdatingLock(true);
    try {
      const selectedAgencies = agencies.filter((a) => selectedIds.has(a.id));

      for (const agency of selectedAgencies) {
        // 1. agency_applications
        await updateDoc(doc(db, "agency_applications", agency.id), {
          islock: lockStatus,
        }).catch(() => {});

        // 2. agencies collection doc
        const displayId = agency.agencyId !== undefined && agency.agencyId !== null
          ? String(agency.agencyId)
          : (agency.id && /^\d+$/.test(agency.id) ? agency.id : "");
        if (displayId) {
          await updateDoc(doc(db, "agencies", displayId), {
            islock: lockStatus,
          }).catch(() => {});
        }

        // 3. owner in users
        if (agency.ownerId && agency.ownerId !== "—") {
          await updateDoc(doc(db, "users", agency.ownerId), {
            islock: lockStatus,
          }).catch(() => {});
        }
      }

      setAgencies((prev) =>
        prev.map((a) => (selectedIds.has(a.id) ? { ...a, islock: lockStatus } : a))
      );
      toast.success(
        `${selectedIds.size} agency(ies) ${lockStatus ? "locked" : "unlocked"} successfully`
      );
      setSelectedIds(new Set());
      setIsBulkLockModalOpen(false);
      setPendingBulkAction(null);
    } catch (error) {
      console.error("Bulk lock error:", error);
      toast.error("Failed to update lock status");
    } finally {
      setIsUpdatingLock(false);
    }
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "blocked" : "active";
    try {
      const agency = agencies.find((a) => a.id === id);
      let agencyId = agency?.agencyId;

      // If we are activating it and it does not have a 6-digit agencyId yet:
      if (newStatus === "active" && !agencyId) {
        agencyId = Math.floor(100000 + Math.random() * 900000);

        // 1. Create/Set agency document in `agencies` collection
        await setDoc(doc(db, "agencies", agencyId.toString()), {
          agencyId,
          name: agency?.name || "—",
          holderName: agency?.holderName || "—",
          whatsapp: agency?.whatsapp || "",
          country: agency?.country || "—",
          locationFlag: agency?.locationFlag || "",
          email: agency?.email || "",
          ownerId: agency?.ownerId || "—",
          logo: agency?.logo || "",
          nidFront: agency?.nidFrontUrl || "",
          status: "active",
          applicationId: id,
          createdAt: serverTimestamp(),
        });

        // 2. Update user's document in `users` collection to assign agency role
        if (agency?.ownerId && agency.ownerId !== "—") {
          await updateDoc(doc(db, "users", agency.ownerId), {
            isAgency: true,
            isHost: false,
            agencyId,
            role: "agency",
          }).catch(() => {}); // don't crash if user doc doesn't exist yet
        }

        // 3. Update the agency_applications with active status and agencyId
        await updateDoc(doc(db, "agency_applications", id), {
          status: newStatus,
          agencyId,
        });

        toast.success(`Agency activated with ID: ${agencyId}`);
      } else {
        // Otherwise just toggle status
        await updateDoc(doc(db, "agency_applications", id), { status: newStatus });
        toast.success(`Agency ${newStatus === "active" ? "activated" : "blocked"}`);
      }
    } catch (err) {
      console.error(err);
      toast.error("Status update failed");
    }
  };

  const confirmDelete = (agency: AgencyData) => {
    toast(
      (t) => (
        <div className="flex flex-col gap-3 min-w-[220px]">
          <p className="text-sm font-semibold text-gray-800 dark:text-white">
            Delete <span className="text-red-500">{agency.name}</span>?
          </p>
          <p className="text-xs text-gray-500">This action cannot be undone and will remove all agency-related user data.</p>
          <div className="flex gap-2">
            <button
              onClick={async () => {
                toast.dismiss(t.id);
                const deleteToastId = toast.loading("Deleting agency and clearing user data...");
                try {
                  // 1. Delete from agency_applications
                  await deleteDoc(doc(db, "agency_applications", agency.id));

                  // 2. Delete from agencies
                  const displayId = agency.agencyId ? String(agency.agencyId) : "";
                  if (displayId) {
                    await deleteDoc(doc(db, "agencies", displayId));
                  }

                  // 3. Update user document
                  if (agency.ownerId && agency.ownerId !== "—") {
                    await updateDoc(doc(db, "users", agency.ownerId), {
                      isAgency: false,
                      role: "user",
                      agencyId: deleteField(),
                      agencybalence: deleteField(),
                      agencybalance: deleteField(),
                      agencypassword: deleteField(),
                      isReseller: false,
                    }).catch((err) => {
                      console.error("Failed to update user doc:", err);
                    });
                  }

                  toast.success("Agency and related data deleted successfully", { id: deleteToastId });
                } catch (err) {
                  console.error(err);
                  toast.error("Delete failed", { id: deleteToastId });
                }
              }}
              className="bg-red-500 text-white px-4 py-1.5 rounded-lg text-xs font-bold flex-1"
            >
              Delete
            </button>
            <button
              onClick={() => toast.dismiss(t.id)}
              className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-4 py-1.5 rounded-lg text-xs font-bold flex-1"
            >
              Cancel
            </button>
          </div>
        </div>
      ),
      { duration: 6000 }
    );
  };

  const updateAgencyPassword = async (agency: AgencyData, newPassword: string) => {
    try {
      const displayId = agency.agencyId ? String(agency.agencyId) : "";

      // 1. Update in agency_applications
      await updateDoc(doc(db, "agency_applications", agency.id), {
        agencypassword: newPassword,
      });

      // 2. Update in agencies if displayId exists
      if (displayId) {
        await updateDoc(doc(db, "agencies", displayId), {
          agencypassword: newPassword,
        });
      }

      // 3. Update in users if ownerId exists and is valid
      if (agency.ownerId && agency.ownerId !== "—") {
        await updateDoc(doc(db, "users", agency.ownerId), {
          agencypassword: newPassword,
        });
      }

      toast.success("Agency password updated successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update password");
    }
  };

  const stats = {
    total: agencies.length,
    active: agencies.filter((a) => a.status === "active").length,
    blocked: agencies.filter((a) => a.status === "blocked").length,
    pending: agencies.filter((a) => a.status === "pending").length,
    locked: agencies.filter((a) => a.islock === true).length,
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-black flex items-center gap-3 dark:text-white">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center">
              <Building2 className="text-blue-500" size={22} />
            </div>
            Agency Portal
          </h1>
          <p className="text-gray-500 text-sm mt-1 ml-13">
            Global agency and owner management
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-blue-500/20 active:scale-95 transition-all text-sm"
        >
          <Plus size={18} />
          Add New Agency
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Agencies", value: stats.total, icon: Users, color: "blue" },
          { label: "Active", value: stats.active, icon: CheckCircle2, color: "emerald" },
          { label: "Blocked", value: stats.blocked, icon: XCircle, color: "red" },
          { label: "Pending", value: stats.pending, icon: Clock, color: "amber" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="bg-white dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-3xl p-5 flex items-center gap-4"
          >
            <div className={`w-11 h-11 rounded-2xl bg-${color}-100 dark:bg-${color}-500/10 flex items-center justify-center flex-shrink-0`}>
              <Icon size={20} className={`text-${color}-500`} />
            </div>
            <div>
              <p className="text-2xl font-black dark:text-white">
                {loading ? (
                  <span className="inline-block w-8 h-6 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
                ) : (
                  value
                )}
              </p>
              <p className="text-xs text-gray-500 font-medium">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search by name, owner, email or UID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-sm outline-none focus:ring-2 ring-blue-500/20 dark:text-white placeholder:text-gray-400 transition-all"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {["all", "active", "locked", "blocked", "pending"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-3 rounded-2xl text-xs font-bold capitalize transition-all cursor-pointer ${
                statusFilter === s
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                  : "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-blue-400"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk Action Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <span className="text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-3.5 py-2 rounded-xl border border-blue-200 dark:border-blue-800">
              {selectedIds.size} marked
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => openBulkLockModal("lock")}
            disabled={selectedIds.size === 0 || isUpdatingLock}
            className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold px-4 py-2.5 rounded-xl transition-all text-xs shadow-sm cursor-pointer"
            title="Lock marked agencies (islock: true)"
          >
            <Lock size={14} />
            Lock Marked
          </button>
          <button
            onClick={() => openBulkLockModal("unlock")}
            disabled={selectedIds.size === 0 || isUpdatingLock}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold px-4 py-2.5 rounded-xl transition-all text-xs shadow-sm cursor-pointer"
            title="Unlock marked agencies (islock: false)"
          >
            <Unlock size={14} />
            Unlock Marked
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-nowrap">
            <thead>
              <tr className="bg-gray-50/80 dark:bg-gray-900/60 border-b border-gray-100 dark:border-gray-800">
                <th className="px-4 py-4 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={
                      filtered.length > 0 &&
                      selectedIds.size === filtered.length
                    }
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    title="Select All"
                  />
                </th>
                <th className="px-6 py-4 text-[10px] uppercase font-black tracking-widest text-gray-400">
                  Agency & Logo
                </th>
                <th className="px-6 py-4 text-[10px] uppercase font-black tracking-widest text-gray-400">
                  Owner Info
                </th>
                <th className="px-6 py-4 text-[10px] uppercase font-black tracking-widest text-gray-400">
                  Status
                </th>
                <th className="px-6 py-4 text-[10px] uppercase font-black tracking-widest text-gray-400 text-center">
                  Lock Status
                </th>
                <th className="px-6 py-4 text-[10px] uppercase font-black tracking-widest text-gray-400 text-right">
                  Operations
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
              {loading ? (
                <>
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                </>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-20 h-20 rounded-3xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        <Building2 size={32} className="text-gray-300 dark:text-gray-600" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-500 dark:text-gray-400 text-lg">
                          {search || statusFilter !== "all"
                            ? "No agencies match your search"
                            : "No agencies yet"}
                        </p>
                        <p className="text-sm text-gray-400 mt-1">
                          {search || statusFilter !== "all"
                            ? "Try changing filters"
                            : "Click 'Add New Agency' to get started"}
                        </p>
                      </div>
                      {(search || statusFilter !== "all") && (
                        <button
                          onClick={() => { setSearch(""); setStatusFilter("all"); }}
                          className="flex items-center gap-2 text-blue-500 text-sm font-bold hover:underline"
                        >
                          <RefreshCw size={14} /> Clear Filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((agency) => {
                  const statusCfg = STATUS_CONFIG[agency.status] ?? STATUS_CONFIG.pending;
                  const displayId = agency.agencyId !== undefined && agency.agencyId !== null
                    ? String(agency.agencyId)
                    : (agency.id && /^\d+$/.test(agency.id) ? agency.id : "");
                  return (
                    <tr
                      key={agency.id}
                      className={`${
                        selectedIds.has(agency.id)
                          ? "bg-blue-50/70 dark:bg-blue-950/30"
                          : "hover:bg-gray-50/60 dark:hover:bg-gray-800/20"
                      } transition-colors group`}
                    >
                      {/* Checkbox */}
                      <td className="px-4 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(agency.id)}
                          onChange={() => handleSelectOne(agency.id)}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>

                      {/* Agency & Logo */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="relative w-12 h-12 flex-shrink-0">
                            <OwnerAvatar agency={agency} isLogo={true} />
                            <div
                              className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 ${statusCfg.dot} border-2 border-white dark:border-gray-900 rounded-full`}
                            />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 dark:text-white text-[15px]">
                              {agency.name || "—"}
                            </p>
                            <p className="text-xs text-gray-400 font-medium mt-0.5">
                              🌍 {agency.country || "Unknown"}
                            </p>
                            {/* Agency ID badge */}
                            {displayId && (
                              <span className="inline-block mt-1.5 px-3 py-1 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-sm font-black font-mono rounded-lg tracking-wider">
                                Agency ID: {displayId}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Owner Info */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <OwnerAvatar agency={agency} />
                          <div>
                            <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm">
                              {agency.holderName || "—"}
                            </p>
                            {(agency.whatsapp || agency.whatsappNumber) && (
                              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                                💬 {agency.whatsapp || agency.whatsappNumber}
                              </p>
                            )}
                            {agency.email && agency.email !== "—" && (
                              <p className="text-[11px] text-gray-400 mt-0.5">{agency.email}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider ${statusCfg.classes}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                          {statusCfg.label}
                        </span>
                      </td>

                      {/* Lock Status */}
                      <td className="px-6 py-4 text-center">
                        {agency.islock ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800">
                            <Lock size={11} /> Locked
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                            <Unlock size={11} /> Active
                          </span>
                        )}
                      </td>

                      {/* Operations */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end items-center gap-2">
                          <button
                            onClick={() => setSelectedAgency(agency)}
                            title="View Details"
                            className="w-9 h-9 flex items-center justify-center bg-gray-100 dark:bg-gray-800 hover:bg-blue-500 hover:text-white text-gray-600 dark:text-gray-300 rounded-xl transition-all cursor-pointer"
                          >
                            <Eye size={15} />
                          </button>
                          {agency.status === "active" && (
                            <button
                              onClick={() => setPasswordAgency(agency)}
                              title="Set Password"
                              className="w-9 h-9 flex items-center justify-center bg-blue-100 text-blue-600 hover:bg-blue-500 hover:text-white dark:bg-blue-500/10 rounded-xl transition-all cursor-pointer"
                            >
                              <Key size={15} />
                            </button>
                          )}
                          <button
                            onClick={() => toggleSingleLock(agency, agency.islock || false)}
                            title={agency.islock ? "Unlock Agency" : "Lock Agency"}
                            className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all cursor-pointer ${
                              agency.islock
                                ? "bg-emerald-100 text-emerald-600 hover:bg-emerald-500 hover:text-white dark:bg-emerald-500/10"
                                : "bg-amber-100 text-amber-600 hover:bg-amber-500 hover:text-white dark:bg-amber-500/10"
                            }`}
                          >
                            {agency.islock ? <Unlock size={15} /> : <Lock size={15} />}
                          </button>
                          <button
                            onClick={() => toggleStatus(agency.id, agency.status)}
                            title={agency.status === "active" ? "Block Agency" : "Activate Agency"}
                            className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all cursor-pointer ${
                              agency.status === "active"
                                ? "bg-amber-100 text-amber-600 hover:bg-amber-500 hover:text-white dark:bg-amber-500/10"
                                : "bg-emerald-100 text-emerald-600 hover:bg-emerald-500 hover:text-white dark:bg-emerald-500/10"
                            }`}
                          >
                            {agency.status === "active" ? (
                              <ShieldAlert size={15} />
                            ) : (
                              <ShieldCheck size={15} />
                            )}
                          </button>
                          <button
                            onClick={() => confirmDelete(agency)}
                            title="Delete Agency"
                            className="w-9 h-9 flex items-center justify-center bg-red-100 text-red-500 hover:bg-red-500 hover:text-white dark:bg-red-500/10 rounded-xl transition-all cursor-pointer"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        {!loading && filtered.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <p className="text-xs text-gray-400 font-medium">
              Showing <span className="font-bold text-gray-600 dark:text-gray-300">{filtered.length}</span> of{" "}
              <span className="font-bold text-gray-600 dark:text-gray-300">{agencies.length}</span> agencies
            </p>
            <div className="flex items-center gap-1.5 text-xs text-emerald-500 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live sync
            </div>
          </div>
        )}
      </div>

      {isModalOpen && <AgencyModal onClose={() => setIsModalOpen(false)} />}

      {selectedAgency && (
        <DetailModal
          agency={selectedAgency}
          onClose={() => setSelectedAgency(null)}
          onToggleStatus={toggleStatus}
        />
      )}

      {passwordAgency && (
        <PasswordModal
          agency={passwordAgency}
          onClose={() => setPasswordAgency(null)}
          onSave={(pwd) => updateAgencyPassword(passwordAgency, pwd)}
        />
      )}

      {/* Confirmation Modal for Bulk Lock/Unlock */}
      {isBulkLockModalOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 w-full max-w-sm shadow-xl border border-gray-200 dark:border-gray-800">
            <h3 className="text-xl font-bold mb-3 text-gray-800 dark:text-white flex items-center gap-2">
              {pendingBulkAction === "lock" ? (
                <>
                  <Lock size={20} className="text-red-600" />
                  Lock Marked Agencies
                </>
              ) : (
                <>
                  <Unlock size={20} className="text-emerald-600" />
                  Unlock Marked Agencies
                </>
              )}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Are you sure you want to{" "}
              <span className="font-bold text-gray-800 dark:text-gray-200">
                {pendingBulkAction === "lock" ? "LOCK" : "UNLOCK"}
              </span>{" "}
              the <span className="font-bold text-blue-600">{selectedIds.size}</span> marked agency(ies)?
              {pendingBulkAction === "lock"
                ? " Their account 'islock' will be set to true."
                : " Their account 'islock' will be set to false."}
            </p>
            <div className="flex gap-3">
              <button
                disabled={isUpdatingLock}
                onClick={() => {
                  setIsBulkLockModalOpen(false);
                  setPendingBulkAction(null);
                }}
                className="flex-1 px-4 py-2.5 rounded-2xl border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer text-sm font-medium"
              >
                Cancel
              </button>
              <button
                disabled={isUpdatingLock}
                onClick={confirmBulkAction}
                className={`flex-1 px-4 py-2.5 rounded-2xl text-white transition-colors font-medium flex items-center justify-center gap-2 cursor-pointer text-sm ${
                  pendingBulkAction === "lock"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {isUpdatingLock && <Loader2 size={16} className="animate-spin" />}
                Confirm {pendingBulkAction === "lock" ? "Lock" : "Unlock"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
