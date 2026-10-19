import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  deleteField,
} from "firebase/firestore";
import {
  Mic,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Trash2,
  MapPin,
  Phone,
  User,
  X,
  ZoomIn,
  RefreshCw,
  Search,
  Hash,
} from "lucide-react";
import toast from "react-hot-toast";

interface HostApplication {
  id: string;
  agencyCode?: string | number;
  // Common fields — adjust if your Flutter app uses different names
  userId?: string;
  uid?: string;
  applicantId?: string;
  agencyId?: string;
  agentName?: string;
  agentUserId?: string;
  liveType?: string;
  ownerId?: string;
  name?: string;
  fullName?: string;
  displayName?: string;
  phone?: string;
  phoneNumber?: string;
  whatsappNumber?: string;
  location?: string;
  country?: string;
  locationFlag?: string;
  nidFrontUrl?: string;
  nidBackUrl?: string;
  idFrontUrl?: string;
  idBackUrl?: string;
  status: "pending" | "approved" | "rejected";
  submittedAt?: { seconds: number; nanoseconds: number };
  createdAt?: { seconds: number; nanoseconds: number };
  reference?: string;
  note?: string;
  [key: string]: unknown; // allow any extra fields
}

// Helper — grab first truthy value
const pick = (...vals: unknown[]) =>
  vals.find((v) => v && String(v).trim() !== "") ?? "—";

const STATUS_CONFIG = {
  pending: {
    label: "Pending",
    classes: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  approved: {
    label: "Approved",
    classes: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  rejected: {
    label: "Rejected",
    classes: "bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400",
    dot: "bg-red-500",
  },
};

function formatDate(ts?: { seconds: number } | string | any) {
  if (!ts) return "—";
  if (typeof ts === "string") return ts;
  if (ts.seconds) {
    return new Date(ts.seconds * 1000).toLocaleString("en-BD", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return String(ts);
}

function SkeletonRow() {
  return (
    <tr className="border-b border-gray-100 dark:border-gray-800/60">
      {[1, 2, 3, 4, 5].map((i) => (
        <td key={i} className="px-5 py-4">
          <div className="h-3.5 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse w-3/4" />
          <div className="h-2.5 rounded-full bg-gray-100 dark:bg-gray-800 animate-pulse w-1/2 mt-2" />
        </td>
      ))}
    </tr>
  );
}

// ── Detail Modal ────────────────────────────────────────────────────────────
function DetailModal({
  app,
  onClose,
  onApprove,
  onReject,
  agenciesMap,
  usersMap,
}: {
  app: HostApplication;
  onClose: () => void;
  onApprove: (app: HostApplication) => Promise<void>;
  onReject: (app: HostApplication) => Promise<void>;
  agenciesMap: Record<string, { name: string; logo: string; country: string; locationFlag?: string }>;
  usersMap: Record<string, { name: string; avatar: string; displayId: string }>;
}) {
  const [zoomImg, setZoomImg] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  const userId = pick(app.userId, app.uid, app.applicantId) as string;
  const user = usersMap[userId];
  const userName = user?.name || (pick(app.name, app.fullName, app.displayName) as string);
  const phone = pick(app.phone, app.phoneNumber, app.whatsappNumber) as string;
  const location = pick(app.location, app.country) as string;
  const ts = app.submittedAt ?? app.createdAt;
  const selfieImg = (app.selfieUrl ?? app.selfie ?? "") as string;
  const frontImg = (app.nidFrontUrl ?? app.idFrontUrl ?? "") as string;
  const backImg = (app.nidBackUrl ?? app.idBackUrl ?? "") as string;
  const agency = app.agencyCode ? agenciesMap[String(app.agencyCode)] : app.agencyId ? agenciesMap[String(app.agencyId)] : null;
  const agencyDisplayId = app.agencyCode || app.agencyId || "—";

  const infoRows = [
    { icon: User, label: "Name", value: userName },
    { icon: Phone, label: "Phone / WhatsApp", value: phone },
    { icon: MapPin, label: "Location", value: `${app.locationFlag ?? ""} ${location}`.trim() },
    { icon: Hash, label: "User ID", value: user?.displayId || userId, mono: true },
    { icon: Clock, label: "Submitted", value: formatDate(ts) },
    ...(app.reference ? [{ icon: User, label: "Reference", value: app.reference as string }] : []),
    ...(app.note ? [{ icon: User, label: "Note", value: app.note as string }] : []),
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      {/* Zoom */}
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
          <div>
            <h2 className="text-xl font-black dark:text-white">{userName}</h2>
            <p className="text-xs text-gray-400 mt-0.5">Host Application Review</p>
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
            {infoRows.map(({ icon: Icon, label, value, mono }) => (
              <div key={label} className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Icon size={13} className="text-gray-400" />
                  <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider">{label}</p>
                </div>
                <p className={`text-sm font-semibold dark:text-white truncate ${mono ? "font-mono text-blue-500 text-xs" : ""}`}>
                  {value}
                </p>
              </div>
            ))}
          </div>

          {/* Agency Details Card */}
          <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-3xl p-5">
            <p className="text-xs font-black uppercase text-blue-600 dark:text-blue-400 tracking-wider mb-3">Agency Details</p>
            {agency ? (
              <div className="flex items-center gap-4">
                {agency.logo ? (
                  <img
                    src={agency.logo}
                    alt={agency.name}
                    className="w-12 h-12 rounded-2xl object-cover ring-2 ring-blue-100 dark:ring-blue-900/60"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-blue-500 text-white font-black text-lg flex items-center justify-center">
                    {agency.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white text-base">{agency.name}</h4>
                  <div className="flex items-center gap-3 mt-1 text-xs">
                    <span className="font-mono text-blue-600 dark:text-blue-400 font-bold bg-blue-100 dark:bg-blue-500/10 px-2 py-0.5 rounded-lg text-[10px] tracking-wider">
                      ID: {agencyDisplayId}
                    </span>
                    <span className="text-gray-500 flex items-center gap-1">
                      <span>{agency.locationFlag}</span>
                      {agency.country}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500 font-medium">No registered agency matches this code.</p>
                <span className="font-mono text-gray-600 dark:text-gray-400 font-bold bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-lg text-xs">
                  Code: {agencyDisplayId}
                </span>
              </div>
            )}
          </div>

          {/* ID / Selfie Documents */}
          {(() => {
            const docsList = [
              { label: "Selfie Image", url: selfieImg },
              { label: "ID Front", url: frontImg },
              { label: "ID Back", url: backImg },
            ].filter((d) => !!d.url);

            if (docsList.length === 0) return null;

            return (
              <div>
                <p className="text-xs font-black uppercase text-gray-400 tracking-wider mb-3">Submitted Documents</p>
                <div className={`grid gap-4 ${docsList.length === 1
                    ? "grid-cols-1 max-w-sm"
                    : docsList.length === 2
                      ? "grid-cols-2"
                      : "grid-cols-3"
                  }`}>
                  {docsList.map(({ label, url }) => (
                    <div key={label} className="group relative flex flex-col">
                      <div className="text-[10px] font-bold uppercase text-gray-400 mb-1.5">{label}</div>
                      <div className="relative overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 transition-all duration-300 hover:shadow-md">
                        <div className="relative aspect-video w-full h-40 overflow-hidden">
                          <img
                            src={url}
                            alt={label}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                          <button
                            onClick={() => setZoomImg(url)}
                            className="absolute inset-0 bg-black/0 group-hover:bg-black/40 backdrop-blur-[0px] group-hover:backdrop-blur-[2px] flex items-center justify-center transition-all duration-300"
                          >
                            <ZoomIn size={22} className="text-white scale-75 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-300" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Status badge */}
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider ${STATUS_CONFIG[app.status]?.classes ?? STATUS_CONFIG.pending.classes}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${STATUS_CONFIG[app.status]?.dot}`} />
              {STATUS_CONFIG[app.status]?.label}
            </span>
            {app.status === "pending" && (
              <span className="text-xs text-gray-400">Waiting for admin review</span>
            )}
          </div>
        </div>

        {/* Actions */}
        {app.status === "pending" && (
          <div className="px-7 py-5 border-t dark:border-gray-800 flex gap-3">
            <button
              disabled={approving}
              onClick={async () => { setApproving(true); await onApprove(app); setApproving(false); onClose(); }}
              className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-2xl transition-all active:scale-[0.98] disabled:opacity-60"
            >
              <CheckCircle2 size={16} />
              {approving ? "Approving..." : "Approve Host"}
            </button>
            <button
              disabled={rejecting}
              onClick={async () => { setRejecting(true); await onReject(app); setRejecting(false); onClose(); }}
              className="flex-1 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-2xl transition-all active:scale-[0.98] disabled:opacity-60"
            >
              <XCircle size={16} />
              {rejecting ? "Rejecting..." : "Reject"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────
export default function HostApprovals() {
  const [applications, setApplications] = useState<HostApplication[]>([]);
  const [filtered, setFiltered] = useState<HostApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<HostApplication | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  const [agenciesMap, setAgenciesMap] = useState<Record<string, { name: string; logo: string; country: string; locationFlag?: string }>>({});
  const [usersMap, setUsersMap] = useState<Record<string, { name: string; avatar: string; displayId: string }>>({});

  // 1. Listen to agencies for code/id lookup
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "agencies"), (snap) => {
      const map: Record<string, { name: string; logo: string; country: string; locationFlag?: string }> = {};
      snap.docs.forEach((doc) => {
        const data = doc.data();
        const aId = data.agencyId ? String(data.agencyId) : doc.id;
        map[aId] = {
          name: (data.name as string) || "—",
          logo: (data.logo as string) || (data.nidFront as string) || "",
          country: (data.country as string) || "—",
          locationFlag: (data.locationFlag as string) || "",
        };
      });
      setAgenciesMap(map);
    });
    return () => unsub();
  }, []);

  // 2. Fetch user information for applicants (avoiding massive realtime snapshot)
  useEffect(() => {
    const fetchUsers = async () => {
      const uniqueUserIds = Array.from(
        new Set(
          applications
            .map((app) => app.userId || app.uid || app.applicantId)
            .filter((uid): uid is string => !!uid && !usersMap[uid])
        )
      );

      if (uniqueUserIds.length === 0) return;

      const newUsers: Record<string, { name: string; avatar: string; displayId: string }> = {};
      await Promise.all(
        uniqueUserIds.map(async (uid) => {
          try {
            const userDoc = await getDoc(doc(db, "users", uid));
            if (userDoc.exists()) {
              const data = userDoc.data();
              newUsers[uid] = {
                name: (data.name as string) || (data.displayName as string) || (data.nickName as string) || "—",
                avatar: (data.profileImage as string) || (data.avatar as string) || "",
                displayId: (data.displayId as string) || uid,
              };
            }
          } catch (e) {
            console.error("Error fetching user data:", e);
          }
        })
      );

      if (Object.keys(newUsers).length > 0) {
        setUsersMap((prev) => ({ ...prev, ...newUsers }));
      }
    };

    fetchUsers();
  }, [applications]);

  useEffect(() => {
    const q = query(collection(db, "HostRequests"), orderBy("createdAt", "desc"));
    
    const unsub = onSnapshot(
      q,
      (snap) => {
        setApplications(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as HostApplication));
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching ordered HostRequests:", err);
        // Fallback without orderBy if index is missing
        const qFallback = query(collection(db, "HostRequests"));
        onSnapshot(qFallback, (snapFallback) => {
          let docs = snapFallback.docs.map((d) => ({ id: d.id, ...d.data() }) as HostApplication);
          docs.sort((a, b) => {
            const tA = a.createdAt || a.submittedAt || "";
            const tB = b.createdAt || b.submittedAt || "";
            return String(tB).localeCompare(String(tA));
          });
          setApplications(docs);
          setLoading(false);
        });
      }
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    let result = applications;
    if (statusFilter !== "all") {
      result = result.filter((a) => a.status === statusFilter);
    }
    if (search.trim()) {
      const s = search.toLowerCase();
      result = result.filter((a) => {
        const name = pick(a.name, a.fullName, a.displayName) as string;
        const userId = pick(a.userId, a.uid, a.applicantId) as string;
        const phone = pick(a.phone, a.phoneNumber, a.whatsappNumber) as string;
        return (
          name.toLowerCase().includes(s) ||
          userId.toLowerCase().includes(s) ||
          phone.includes(s)
        );
      });
    }
    setFiltered(result);
  }, [applications, statusFilter, search]);

  const handleApprove = async (app: HostApplication) => {
    const userId = (pick(app.userId, app.uid, app.applicantId) as string);
    try {
      await updateDoc(doc(db, "HostRequests", app.id), {
        status: "approved",
        approvedAt: serverTimestamp(),
        islock: true,
      });
      // Update user role to host and set islock to true
      if (userId && userId !== "—") {
        const agencyIdStr = String(app.agencyCode || app.agencyId || "");
        
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);
        const userData = userSnap.data() || {};
        
        const updates: any = {
          role: "host",
          agencyId: agencyIdStr,
          islock: true,
        };
        
        if ("isHost" in userData) updates.isHost = true;
        if ("ishost" in userData) updates.ishost = true;
        if (!("isHost" in userData) && !("ishost" in userData)) updates.ishost = true;

        await updateDoc(userRef, updates).catch(() => { });

        // Add to agency's host array
        if (agencyIdStr) {
          await updateDoc(doc(db, "agencies", agencyIdStr), {
            hosts: arrayUnion(userId)
          }).catch(() => { });
        }
      }
      const name = pick(app.name, app.fullName, app.displayName) as string;
      toast.success(`✅ ${name} approved as host!`);
    } catch (err) {
      console.error(err);
      toast.error("Approval failed");
    }
  };

  const handleReject = async (app: HostApplication) => {
    const userId = (pick(app.userId, app.uid, app.applicantId) as string);
    try {
      await updateDoc(doc(db, "HostRequests", app.id), {
        status: "rejected",
        rejectedAt: serverTimestamp(),
      });
      // Remove host role from user on rejection
      if (userId && userId !== "—") {
        const agencyIdStr = String(app.agencyCode || app.agencyId || "");

        await updateDoc(doc(db, "users", userId), {
          isHost: false,
          ishost: false,
          role: "user",
          agencyId: deleteField(),
        }).catch(() => { });

        if (agencyIdStr) {
          await updateDoc(doc(db, "agencies", agencyIdStr), {
            hosts: arrayRemove(userId)
          }).catch(() => { });
        }
      }
      toast.success("Application rejected");
    } catch {
      toast.error("Rejection failed");
    }
  };

  const handleDelete = (app: HostApplication) => {
    const userId = (pick(app.userId, app.uid, app.applicantId) as string);
    const name = pick(app.name, app.fullName, app.displayName) as string;

    toast(
      (t) => (
        <div className="flex flex-col gap-3 min-w-[200px]">
          <p className="text-sm font-semibold">
            Delete <span className="text-red-500">{name}</span>?
          </p>
          <div className="flex gap-2">
            <button
              onClick={async () => {
                toast.dismiss(t.id);
                try {
                  await deleteDoc(doc(db, "HostRequests", app.id));
                  // Remove host role from user on delete
                  if (userId && userId !== "—") {
                    const agencyIdStr = String(app.agencyCode || app.agencyId || "");

                    await updateDoc(doc(db, "users", userId), {
                      isHost: false,
                      ishost: false,
                      role: "user",
                      agencyId: deleteField(),
                    }).catch(() => { });

                    if (agencyIdStr) {
                      await updateDoc(doc(db, "agencies", agencyIdStr), {
                        hosts: arrayRemove(userId)
                      }).catch(() => { });
                    }
                  }
                  toast.success("Application deleted");
                } catch {
                  toast.error("Delete failed");
                }
              }}
              className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex-1"
            >
              Delete
            </button>
            <button
              onClick={() => toast.dismiss(t.id)}
              className="bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-bold flex-1"
            >
              Cancel
            </button>
          </div>
        </div>
      ),
      { duration: 5000 }
    );
  };

  const counts = {
    all: applications.length,
    pending: applications.filter((a) => a.status === "pending").length,
    approved: applications.filter((a) => a.status === "approved").length,
    rejected: applications.filter((a) => a.status === "rejected").length,
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-black flex items-center gap-3 dark:text-white">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 flex items-center justify-center">
              <Mic className="text-purple-500" size={22} />
            </div>
            Host Approvals
          </h1>
          <p className="text-gray-500 text-sm mt-1 ml-13">
            Review and approve host registration requests
          </p>
        </div>
        {counts.pending > 0 && (
          <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 px-4 py-2.5 rounded-2xl">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-amber-700 dark:text-amber-400 font-bold text-sm">
              {counts.pending} pending review
            </span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { key: "all", label: "Total", icon: Mic, color: "purple" },
          { key: "pending", label: "Pending", icon: Clock, color: "amber" },
          { key: "approved", label: "Approved", icon: CheckCircle2, color: "emerald" },
          { key: "rejected", label: "Rejected", icon: XCircle, color: "red" },
        ].map(({ key, label, icon: Icon, color }) => (
          <button
            key={key}
            onClick={() => setStatusFilter(key)}
            className={`rounded-3xl p-5 flex items-center gap-4 text-left transition-all border ${statusFilter === key
                ? `border-${color}-300 dark:border-${color}-500/40 bg-${color}-50 dark:bg-${color}-500/10`
                : "border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900/50 hover:border-gray-200"
              }`}
          >
            <div className={`w-11 h-11 rounded-2xl bg-${color}-100 dark:bg-${color}-500/10 flex items-center justify-center flex-shrink-0`}>
              <Icon size={20} className={`text-${color}-500`} />
            </div>
            <div>
              <p className="text-2xl font-black dark:text-white">
                {loading ? (
                  <span className="inline-block w-8 h-6 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
                ) : (
                  counts[key as keyof typeof counts]
                )}
              </p>
              <p className="text-xs text-gray-500 font-medium">{label}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name, user ID or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-sm outline-none focus:ring-2 ring-purple-500/20 dark:text-white placeholder:text-gray-400 transition-all"
        />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-nowrap">
            <thead>
              <tr className="bg-gray-50/80 dark:bg-gray-900/60 border-b border-gray-100 dark:border-gray-800">
                {["Applicant", "Phone", "Location", "Agency", "Submitted", "Status", "Actions"].map((h) => (
                  <th
                    key={h}
                    className={`px-6 py-4 text-[10px] uppercase font-black tracking-widest text-gray-400 ${h === "Actions" ? "text-right" : ""}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
              {loading ? (
                <><SkeletonRow /><SkeletonRow /><SkeletonRow /></>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-20 h-20 rounded-3xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        <Mic size={32} className="text-gray-300 dark:text-gray-600" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-500 text-lg">No host applications found</p>
                        <p className="text-sm text-gray-400 mt-1">
                          {search || statusFilter !== "all" ? "Try different filters" : "No hosting applications yet"}
                        </p>
                      </div>
                      {(search || statusFilter !== "all") && (
                        <button
                          onClick={() => { setSearch(""); setStatusFilter("all"); }}
                          className="flex items-center gap-2 text-purple-500 text-sm font-bold hover:underline"
                        >
                          <RefreshCw size={14} /> Clear Filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((app) => {
                  const statusCfg = STATUS_CONFIG[app.status] ?? STATUS_CONFIG.pending;
                  const userId = pick(app.userId, app.uid, app.applicantId) as string;
                  const user = usersMap[userId];
                  const userName = user?.name || (pick(app.name, app.fullName, app.displayName) as string);
                  const userAvatar = user?.avatar || (app.selfieUrl as string) || "";
                  const phone = pick(app.phone, app.phoneNumber, app.whatsappNumber) as string;
                  const location = pick(app.location, app.country) as string;
                  const ts = app.submittedAt ?? app.createdAt;
                  const agency = app.agencyCode ? agenciesMap[String(app.agencyCode)] : app.agencyId ? agenciesMap[String(app.agencyId)] : null;
                  const agencyDisplayId = app.agencyCode || app.agencyId || "—";

                  return (
                    <tr
                      key={app.id}
                      className="hover:bg-gray-50/60 dark:hover:bg-gray-800/20 transition-colors group"
                    >
                      {/* Applicant */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {userAvatar ? (
                            <img
                              src={userAvatar}
                              alt={userName}
                              className="w-10 h-10 rounded-xl object-cover ring-2 ring-gray-100 dark:ring-gray-800 group-hover:ring-purple-400/40 transition-all"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src =
                                  `https://ui-avatars.com/api/?name=${encodeURIComponent(userName || "H")}&background=8b5cf6&color=fff&rounded=true&bold=true`;
                              }}
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-purple-500 text-white font-bold flex items-center justify-center text-sm">
                              {userName?.charAt(0)?.toUpperCase() || "H"}
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-gray-900 dark:text-white text-[15px]">{userName}</p>
                            <p className="text-[11px] text-blue-500 font-mono truncate max-w-[160px] mt-0.5">{user?.displayId || userId}</p>
                          </div>
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-1.5">
                          <Phone size={12} className="text-gray-400" /> {phone}
                        </p>
                      </td>

                      {/* Location */}
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                          <span className="text-base">{app.locationFlag ?? ""}</span>
                          {location}
                        </p>
                      </td>

                      {/* Agency */}
                      <td className="px-6 py-4">
                        {agency ? (
                          <div className="flex items-center gap-3">
                            {agency.logo ? (
                              <img
                                src={agency.logo}
                                alt={agency.name}
                                className="w-8 h-8 rounded-lg object-cover ring-1 ring-gray-100 dark:ring-gray-800"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src =
                                    `https://ui-avatars.com/api/?name=${encodeURIComponent(agency.name || "A")}&background=3b82f6&color=fff&rounded=true&bold=true`;
                                }}
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-blue-500 text-white font-bold flex items-center justify-center text-xs">
                                {agency.name?.charAt(0)?.toUpperCase() || "A"}
                              </div>
                            )}
                            <div>
                              <p className="font-bold text-gray-900 dark:text-white text-xs">{agency.name}</p>
                              <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold font-mono tracking-wider">ID: {agencyDisplayId}</p>
                              <p className="text-[10px] text-gray-400 flex items-center gap-1">
                                <span>{agency.locationFlag}</span>
                                {agency.country}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <p className="text-xs text-gray-500 font-semibold">Unknown Agency</p>
                            <p className="text-[10px] text-blue-500 font-mono">Code: {agencyDisplayId}</p>
                          </div>
                        )}
                      </td>

                      {/* Submitted */}
                      <td className="px-6 py-4">
                        <p className="text-xs text-gray-500">{formatDate(ts)}</p>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider ${statusCfg.classes}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                          {statusCfg.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelected(app)}
                            title="View Details"
                            className="w-9 h-9 flex items-center justify-center bg-gray-100 dark:bg-gray-800 hover:bg-blue-500 hover:text-white text-gray-600 dark:text-gray-300 rounded-xl transition-all"
                          >
                            <Eye size={15} />
                          </button>
                          {app.status === "pending" && (
                            <>
                              <button
                                onClick={() => handleApprove(app)}
                                title="Approve"
                                className="w-9 h-9 flex items-center justify-center bg-emerald-100 text-emerald-600 hover:bg-emerald-500 hover:text-white dark:bg-emerald-500/10 rounded-xl transition-all"
                              >
                                <CheckCircle2 size={15} />
                              </button>
                              <button
                                onClick={() => handleReject(app)}
                                title="Reject"
                                className="w-9 h-9 flex items-center justify-center bg-red-100 text-red-500 hover:bg-red-500 hover:text-white dark:bg-red-500/10 rounded-xl transition-all"
                              >
                                <XCircle size={15} />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleDelete(app)}
                            title="Delete"
                            className="w-9 h-9 flex items-center justify-center bg-gray-100 dark:bg-gray-800 hover:bg-red-500 hover:text-white text-gray-400 rounded-xl transition-all"
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
              Showing{" "}
              <span className="font-bold text-gray-600 dark:text-gray-300">{filtered.length}</span>{" "}
              of{" "}
              <span className="font-bold text-gray-600 dark:text-gray-300">{applications.length}</span>{" "}
              applications
            </p>
            <div className="flex items-center gap-1.5 text-xs text-emerald-500 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live sync
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selected && (
        <DetailModal
          app={selected}
          onClose={() => setSelected(null)}
          onApprove={handleApprove}
          onReject={handleReject}
          agenciesMap={agenciesMap}
          usersMap={usersMap}
        />
      )}
    </div>
  );
}


