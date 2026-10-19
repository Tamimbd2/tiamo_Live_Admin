import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  setDoc,
  deleteField,
} from "firebase/firestore";
import {
  ClipboardList,
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
  Building2,
  RefreshCw,
  Search,
} from "lucide-react";
import toast from "react-hot-toast";

interface AgencyApplication {
  id: string;
  agencyId?: number | string;
  agencyName: string;
  holderName: string;
  location: string;
  locationFlag: string;
  nidBackUrl: string;
  nidFrontUrl: string;
  reference: string;
  status: "pending" | "approved" | "rejected";
  submittedAt?: { seconds: number; nanoseconds: number };
  userId: string;
  whatsappNumber: string;
}

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

function formatDate(ts?: { seconds: number }) {
  if (!ts) return "—";
  return new Date(ts.seconds * 1000).toLocaleString("en-BD", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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

interface DetailModalProps {
  app: AgencyApplication;
  onClose: () => void;
  onApprove: (app: AgencyApplication) => void;
  onReject: (id: string) => void;
}

function DetailModal({ app, onClose, onApprove, onReject }: DetailModalProps) {
  const [zoomImg, setZoomImg] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);

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
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-all"
          >
            <X size={20} />
          </button>
        </div>
      )}

      <div className="bg-white dark:bg-gray-950 border dark:border-gray-800 w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-7 py-5 border-b dark:border-gray-800">
          <div>
            <h2 className="text-xl font-black dark:text-white">{app.agencyName}</h2>
            <p className="text-xs text-gray-400 mt-0.5">Application Review</p>
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
            {[
              { icon: User, label: "Holder Name", value: app.holderName },
              { icon: Phone, label: "WhatsApp", value: app.whatsappNumber },
              { icon: MapPin, label: "Location", value: `${app.locationFlag || ""} ${app.location}` },
              { icon: User, label: "User ID", value: app.userId, mono: true },
              { icon: ClipboardList, label: "Reference", value: app.reference || "—" },
              { icon: Clock, label: "Submitted At", value: formatDate(app.submittedAt) },
            ].map(({ icon: Icon, label, value, mono }) => (
              <div key={label} className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Icon size={13} className="text-gray-400" />
                  <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider">{label}</p>
                </div>
                <p className={`text-sm font-semibold dark:text-white truncate ${mono ? "font-mono text-blue-500 text-xs" : ""}`}>
                  {value || "—"}
                </p>
              </div>
            ))}
          </div>

          {/* NID Images */}
          <div>
            <p className="text-xs font-black uppercase text-gray-400 tracking-wider mb-3">NID Documents</p>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "NID Front", url: app.nidFrontUrl },
                { label: "NID Back", url: app.nidBackUrl },
              ].map(({ label, url }) => (
                <div key={label} className="group relative">
                  <div className="text-[10px] font-bold uppercase text-gray-400 mb-1.5">{label}</div>
                  <div className="relative overflow-hidden rounded-2xl border-2 border-gray-100 dark:border-gray-800">
                    {url ? (
                      <>
                        <img
                          src={url}
                          alt={label}
                          className="w-full h-36 object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                        <button
                          onClick={() => setZoomImg(url)}
                          className="absolute inset-0 bg-black/0 group-hover:bg-black/40 flex items-center justify-center transition-all"
                        >
                          <ZoomIn
                            size={24}
                            className="text-white opacity-0 group-hover:opacity-100 transition-all"
                          />
                        </button>
                      </>
                    ) : (
                      <div className="h-36 flex items-center justify-center text-xs text-gray-400 bg-gray-50 dark:bg-gray-900">
                        No image
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                STATUS_CONFIG[app.status]?.classes || STATUS_CONFIG.pending.classes
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${STATUS_CONFIG[app.status]?.dot}`} />
              {STATUS_CONFIG[app.status]?.label}
            </span>
            {app.status === "pending" && (
              <span className="text-xs text-gray-400">Waiting for admin review</span>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        {app.status === "pending" && (
          <div className="px-7 py-5 border-t dark:border-gray-800 flex gap-3">
            <button
              disabled={approving}
              onClick={async () => {
                setApproving(true);
                await onApprove(app);
                setApproving(false);
                onClose();
              }}
              className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-2xl transition-all active:scale-[0.98] disabled:opacity-60"
            >
              <CheckCircle2 size={16} />
              {approving ? "Approving..." : "Approve"}
            </button>
            <button
              disabled={rejecting}
              onClick={async () => {
                setRejecting(true);
                await onReject(app.id);
                setRejecting(false);
                onClose();
              }}
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

export default function AgencyApplications() {
  const [applications, setApplications] = useState<AgencyApplication[]>([]);
  const [filtered, setFiltered] = useState<AgencyApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<AgencyApplication | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const q = query(
      collection(db, "agency_applications"),
      orderBy("submittedAt", "desc")
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as AgencyApplication
        );
        setApplications(data);
        setLoading(false);
      },
      () => {
        // Fallback without orderBy
        const q2 = query(collection(db, "agency_applications"));
        onSnapshot(q2, (snap) => {
          const data = snap.docs.map(
            (d) => ({ id: d.id, ...d.data() }) as AgencyApplication
          );
          setApplications(data);
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
      result = result.filter(
        (a) =>
          a.agencyName?.toLowerCase().includes(s) ||
          a.holderName?.toLowerCase().includes(s) ||
          a.userId?.toLowerCase().includes(s) ||
          a.whatsappNumber?.includes(s)
      );
    }
    setFiltered(result);
  }, [applications, statusFilter, search]);

  // Generate a permanent readable Agency ID: 6-digit integer
  const generateAgencyId = (): number => {
    return Math.floor(100000 + Math.random() * 900000);
  };

  const handleApprove = async (app: AgencyApplication) => {
    try {
      // 1. Generate permanent Agency ID
      const agencyId = generateAgencyId();

      // 2. Create agency entry in `agencies` collection using agencyId as doc ID
      await setDoc(doc(db, "agencies", agencyId.toString()), {
        agencyId,                        // stored inside doc too
        name: app.agencyName,
        holderName: app.holderName,
        whatsapp: app.whatsappNumber,
        country: app.location,
        locationFlag: app.locationFlag ?? "",
        email: "",
        ownerId: app.userId,
        logo: app.nidFrontUrl ?? "",     // NID front as temp logo
        nidFront: app.nidFrontUrl ?? "",
        nidBack: app.nidBackUrl ?? "",
        status: "active",
        applicationId: app.id,           // link back to original application
        createdAt: serverTimestamp(),
      });

      // 3. Mark application as approved & store generated agencyId
      await updateDoc(doc(db, "agency_applications", app.id), {
        status: "approved",
        agencyId,                        // permanent ID saved here too
        approvedAt: serverTimestamp(),
      });

      // 4. Update user's Firestore doc with agencyId and role
      if (app.userId) {
        await updateDoc(doc(db, "users", app.userId), {
          isAgency: true,
          isHost: false,
          agencyId,                      // same permanent ID
          role: "agency",
        }).catch(() => {});              // don't fail if user doc missing
      }

      toast.success(
        <div>
          <p className="font-bold">✅ Agency Approved!</p>
          <p className="text-xs mt-0.5 font-mono text-emerald-700">{agencyId}</p>
        </div>
      );
    } catch (err) {
      console.error(err);
      toast.error("Approval failed. Check console.");
    }
  };

  const handleReject = async (id: string, userId?: string) => {
    try {
      await updateDoc(doc(db, "agency_applications", id), {
        status: "rejected",
        rejectedAt: serverTimestamp(),
      });
      // Remove agency role from user on rejection
      if (userId) {
        await updateDoc(doc(db, "users", userId), {
          isAgency: false,
          role: "user",
          agencyId: null,
        }).catch(() => {});
      }
      toast.success("Application rejected");
    } catch {
      toast.error("Rejection failed");
    }
  };

  const handleDelete = (app: AgencyApplication) => {
    toast(
      (t) => (
        <div className="flex flex-col gap-3 min-w-[200px]">
          <p className="text-sm font-semibold">Delete <span className="text-red-500">{app.agencyName}</span>?</p>
          <p className="text-xs text-gray-500">This action cannot be undone and will remove all agency-related user data.</p>
          <div className="flex gap-2">
            <button
              onClick={async () => {
                toast.dismiss(t.id);
                const deleteToastId = toast.loading("Deleting application and clearing user data...");
                try {
                  // 1. Delete from agency_applications
                  await deleteDoc(doc(db, "agency_applications", app.id));

                  // 2. Delete from agencies
                  const displayId = app.agencyId ? String(app.agencyId) : "";
                  if (displayId) {
                    await deleteDoc(doc(db, "agencies", displayId));
                  }

                  // 3. Update user document
                  if (app.userId) {
                    await updateDoc(doc(db, "users", app.userId), {
                      isAgency: false,
                      role: "user",
                      agencyId: deleteField(),
                      agencybalence: deleteField(),
                      agencybalance: deleteField(),
                      agencypassword: deleteField(),
                      isReseller: false,
                    }).catch(() => {});
                  }
                  toast.success("Application and related data deleted successfully", { id: deleteToastId });
                } catch {
                  toast.error("Delete failed", { id: deleteToastId });
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
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center">
              <ClipboardList className="text-amber-500" size={22} />
            </div>
            Agency Applications
          </h1>
          <p className="text-gray-500 text-sm mt-1 ml-13">
            Review and approve agency registration requests
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
          { key: "all", label: "Total", icon: Building2, color: "blue" },
          { key: "pending", label: "Pending", icon: Clock, color: "amber" },
          { key: "approved", label: "Approved", icon: CheckCircle2, color: "emerald" },
          { key: "rejected", label: "Rejected", icon: XCircle, color: "red" },
        ].map(({ key, label, icon: Icon, color }) => (
          <button
            key={key}
            onClick={() => setStatusFilter(key)}
            className={`rounded-3xl p-5 flex items-center gap-4 text-left transition-all border ${
              statusFilter === key
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
          placeholder="Search by agency name, holder, user ID or WhatsApp..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-sm outline-none focus:ring-2 ring-blue-500/20 dark:text-white placeholder:text-gray-400 transition-all"
        />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-nowrap">
            <thead>
              <tr className="bg-gray-50/80 dark:bg-gray-900/60 border-b border-gray-100 dark:border-gray-800">
                {["Agency", "Holder / WhatsApp", "Location", "Submitted", "Status", "Actions"].map(
                  (h) => (
                    <th
                      key={h}
                      className={`px-6 py-4 text-[10px] uppercase font-black tracking-widest text-gray-400 ${
                        h === "Actions" ? "text-right" : ""
                      }`}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
              {loading ? (
                <>
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                </>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-20 h-20 rounded-3xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        <ClipboardList size={32} className="text-gray-300 dark:text-gray-600" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-500 text-lg">No applications found</p>
                        <p className="text-sm text-gray-400 mt-1">
                          {search || statusFilter !== "all" ? "Try different filters" : "No agency applications yet"}
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
                filtered.map((app) => {
                  const statusCfg = STATUS_CONFIG[app.status] ?? STATUS_CONFIG.pending;
                  return (
                    <tr
                      key={app.id}
                      className="hover:bg-gray-50/60 dark:hover:bg-gray-800/20 transition-colors group"
                    >
                      {/* Agency Name */}
                      <td className="px-6 py-4">
                        <p className="font-bold text-gray-900 dark:text-white text-[15px]">
                          {app.agencyName || "—"}
                        </p>
                        <p className="text-[11px] text-blue-500 font-mono truncate max-w-[160px] mt-0.5">
                          {app.userId}
                        </p>
                      </td>

                      {/* Holder / WhatsApp */}
                      <td className="px-6 py-4">
                        <p className="font-semibold text-gray-700 dark:text-gray-300 text-sm">
                          {app.holderName || "—"}
                        </p>
                        <p className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1">
                          <Phone size={10} /> {app.whatsappNumber || "—"}
                        </p>
                      </td>

                      {/* Location */}
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                          <span className="text-base">{app.locationFlag}</span>
                          {app.location || "—"}
                        </p>
                      </td>

                      {/* Submitted */}
                      <td className="px-6 py-4">
                        <p className="text-xs text-gray-500">{formatDate(app.submittedAt)}</p>
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
                                onClick={() => handleReject(app.id, app.userId)}
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
              Showing <span className="font-bold text-gray-600 dark:text-gray-300">{filtered.length}</span> of{" "}
              <span className="font-bold text-gray-600 dark:text-gray-300">{applications.length}</span> applications
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
        />
      )}
    </div>
  );
}
