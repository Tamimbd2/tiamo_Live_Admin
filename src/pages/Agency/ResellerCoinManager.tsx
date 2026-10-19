import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  doc, 
  updateDoc,
  runTransaction,
  getDoc,
  where,
  getDocs
} from "firebase/firestore";
import { 
  Check, 
  X, 
  Coins, 
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  Image as ImageIcon,
  Users,
  Search,
  UserPlus,
  Trash2,
  MoreVertical
} from "lucide-react";
import toast from "react-hot-toast";

interface CoinRequest {
  id: string;
  agencyId: string;
  agencyName?: string;
  resellerName?: string;
  amount: number;
  status: "pending" | "approved" | "rejected";
  timestamp: any;
  screenshotUrl?: string;
  note?: string;
}

export default function ResellerCoinManager() {
  const [requests, setRequests] = useState<CoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"pending" | "history" | "resellers">("resellers");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [userDetails, setUserDetails] = useState<Record<string, any>>({});
  const [resellers, setResellers] = useState<any[]>([]);
  const [resellersLoading, setResellersLoading] = useState(false);
  const [resellerSearch, setResellerSearch] = useState("");
  
  // Transfer Modal State
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferModalTab, setTransferModalTab] = useState<"send" | "history" | "user_transfers">("send");
  const [userTransfers, setUserTransfers] = useState<any[]>([]);
  const [transfersLoading, setTransfersLoading] = useState(false);
  const [transfersUsersCache, setTransfersUsersCache] = useState<Record<string, any>>({});
  const [selectedReseller, setSelectedReseller] = useState<any>(null);
  const [transferAmount, setTransferAmount] = useState("");
  const [transferNote, setTransferNote] = useState("");
  const [transferring, setTransferring] = useState(false);

  // Create Reseller Modal State
  const [createResellerOpen, setCreateResellerOpen] = useState(false);
  const [searchUserId, setSearchUserId] = useState("");
  const [foundUser, setFoundUser] = useState<any>(null);
  const [isSearchingUser, setIsSearchingUser] = useState(false);

  const [isCreatingReseller, setIsCreatingReseller] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "reseller_coin_requests"), orderBy("timestamp", "desc"));
    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({
        id: d.id,
        ...d.data()
      })) as CoinRequest[];
      setRequests(data);
      setLoading(false);
    }, (error) => {
      console.error(error);
      toast.error("Failed to load coin requests");
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (transferModalOpen && selectedReseller && transferModalTab === 'user_transfers') {
      setTransfersLoading(true);
      const q = query(
        collection(db, 'transactions'),
        where('senderId', '==', selectedReseller.id),
        where('type', '==', 'reseller_transfer')
      );
      const unsub = onSnapshot(q, async (snap) => {
        const txs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        txs.sort((a: any, b: any) => {
          const tA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
          const tB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
          return tB - tA;
        });
        setUserTransfers(txs);

        const receiverIds = [...new Set(txs.map((t: any) => t.receiverId).filter(Boolean))];
        if (receiverIds.length > 0) {
          const newCache: Record<string, any> = {};
          for (let i = 0; i < receiverIds.length; i += 30) {
            const chunk = receiverIds.slice(i, i + 30);
            try {
              await Promise.all(chunk.map(async (id) => {
                let docSnap = await getDoc(doc(db, 'users', id as string));
                let data = docSnap.exists() ? docSnap.data() : null;
                
                // Fallback to querying by uid or userId if doc ID doesn't match
                if (!data) {
                  const q1 = query(collection(db, 'users'), where('uid', '==', id));
                  const snaps1 = await getDocs(q1);
                  if (!snaps1.empty) data = snaps1.docs[0].data();
                  else {
                    const q2 = query(collection(db, 'users'), where('userId', '==', id));
                    const snaps2 = await getDocs(q2);
                    if (!snaps2.empty) data = snaps2.docs[0].data();
                  }
                }
                
                if (data) {
                  newCache[id as string] = data;
                }
              }));
            } catch(e) { console.error("Error fetching users cache", e); }
          }
          setTransfersUsersCache(prev => ({...prev, ...newCache}));
        }

        setTransfersLoading(false);
      });
      return () => unsub();
    }
  }, [transferModalOpen, selectedReseller, transferModalTab]);

  useEffect(() => {
    if (requests.length === 0) return;
    
    const fetchUserDetails = async () => {
      const missingIds = Array.from(new Set(requests.map(r => r.agencyId))).filter(id => !userDetails[id]);
      
      if (missingIds.length === 0) return;
      
      const newDetails = { ...userDetails };
      
      await Promise.all(missingIds.map(async (id) => {
        try {
          const userSnap = await getDoc(doc(db, "users", id));
          if (userSnap.exists()) {
             newDetails[id] = userSnap.data();
          } else {
             const agencySnap = await getDoc(doc(db, "agencies", id));
             if (agencySnap.exists()) {
                newDetails[id] = agencySnap.data();
             }
          }
        } catch (e) {
          console.error("Error fetching user details for", id, e);
        }
      }));
      
      setUserDetails(newDetails);
    };

    fetchUserDetails();
  }, [requests]);

  useEffect(() => {
    if (activeTab === "resellers") {
      const fetchResellers = async () => {
        setResellersLoading(true);
        try {
          const rQuery = query(collection(db, "users"), where("role", "==", "reseller"));
          const rSnap = await getDocs(rQuery);
          
          const uniqueResellers = rSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          
          setResellers(uniqueResellers);
        } catch (e) {
          console.error("Error fetching resellers:", e);
          toast.error("Failed to load resellers");
        } finally {
          setResellersLoading(false);
        }
      };
      fetchResellers();
    }
  }, [activeTab]);

  const handleApprove = async (req: CoinRequest) => {
    if (!window.confirm(`Are you sure you want to approve ${req.amount.toLocaleString()} coins for ${req.agencyName || req.resellerName || "this reseller"}?`)) return;
    
    setProcessingId(req.id);
    const tid = toast.loading("Approving request...");
    try {
      await runTransaction(db, async (transaction) => {
        const reqRef = doc(db, "reseller_coin_requests", req.id);
        const reqSnap = await transaction.get(reqRef);
        
        if (!reqSnap.exists() || reqSnap.data().status !== "pending") {
          throw new Error("Request no longer pending or doesn't exist");
        }

        // We assume agency coins are stored in users collection under agency owner, 
        // or in agencies collection. Let's try users first.
        let targetRef = doc(db, "users", req.agencyId);
        let targetSnap = await transaction.get(targetRef);

        if (!targetSnap.exists()) {
          // Fallback to agencies collection
          targetRef = doc(db, "agencies", req.agencyId);
          targetSnap = await transaction.get(targetRef);
          
          if (!targetSnap.exists()) {
             // If neither exists, we just update the request status without adding balance
             // Wait, throw error if user not found to be safe.
             throw new Error("Target agency or user not found to add coins to.");
          }
        }

        const targetData = targetSnap.data() as any;
        const currentBalance = targetData?.balance ?? 0;
        
        transaction.update(targetRef, { 
          balance: currentBalance + req.amount
        });

        // Update request status
        transaction.update(reqRef, {
          status: "approved",
          processedAt: new Date()
        });
      });

      toast.success("Request approved successfully", { id: tid });
    } catch (error: any) {
      toast.error(error.message || "Failed to approve request", { id: tid });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (req: CoinRequest) => {
    if (!window.confirm("Are you sure you want to reject this request?")) return;

    setProcessingId(req.id);
    const tid = toast.loading("Rejecting request...");
    try {
      await updateDoc(doc(db, "reseller_coin_requests", req.id), {
        status: "rejected",
        processedAt: new Date()
      });
      toast.success("Request rejected", { id: tid });
    } catch (error) {
      toast.error("Failed to reject request", { id: tid });
    } finally {
      setProcessingId(null);
    }
  };

  const handleDirectTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReseller || !transferAmount || isNaN(Number(transferAmount)) || Number(transferAmount) <= 0) {
      toast.error("Please enter a valid amount.");
      return;
    }

    setTransferring(true);
    const amount = Number(transferAmount);
    const tid = toast.loading("Sending balance...");

    try {
      await runTransaction(db, async (transaction) => {
        let targetRef = doc(db, "users", selectedReseller.id);
        let targetSnap = await transaction.get(targetRef);

        if (!targetSnap.exists()) {
          targetRef = doc(db, "agencies", selectedReseller.id);
          targetSnap = await transaction.get(targetRef);
          
          if (!targetSnap.exists()) {
             throw new Error("Target agency or reseller not found.");
          }
        }

        const data = targetSnap.data();
        const currentBalance = data.balance ?? 0;
        
        transaction.update(targetRef, { 
          balance: currentBalance + amount
        });

        const newReqRef = doc(collection(db, "reseller_coin_requests"));
        transaction.set(newReqRef, {
          agencyId: selectedReseller.id,
          agencyName: selectedReseller.displayName || selectedReseller.name || "Unknown Reseller",
          resellerName: selectedReseller.displayName || selectedReseller.name || "Unknown Reseller",
          amount: amount,
          status: "approved",
          note: transferNote ? `Direct Transfer: ${transferNote}` : "Direct Transfer",
          timestamp: new Date(),
          processedAt: new Date(),
          type: "direct_transfer"
        });
      });

      toast.success("Balance sent successfully!", { id: tid });
      setTransferModalOpen(false);
      setSelectedReseller(null);
      setTransferAmount("");
      setTransferNote("");
      
      setResellers(prev => prev.map(r => {
        if (r.id === selectedReseller.id) {
          return {
            ...r,
            balance: (r.balance ?? 0) + amount
          };
        }
        return r;
      }));

    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to send balance", { id: tid });
    } finally {
      setTransferring(false);
    }
  };

  const handleSearchUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchUserId.trim()) return;

    setIsSearchingUser(true);
    setFoundUser(null);

    try {
      // First try to find by displayId or userId
      let q = query(collection(db, "users"), where("displayId", "==", searchUserId.trim()));
      let snaps = await getDocs(q);
      
      if (snaps.empty) {
        q = query(collection(db, "users"), where("userId", "==", searchUserId.trim()));
        snaps = await getDocs(q);
      }
      if (snaps.empty) {
        q = query(collection(db, "users"), where("uid", "==", searchUserId.trim()));
        snaps = await getDocs(q);
      }
      // If still empty, check if document ID matches
      if (snaps.empty) {
        const docSnap = await getDoc(doc(db, "users", searchUserId.trim()));
        if (docSnap.exists()) {
          setFoundUser({ id: docSnap.id, ...docSnap.data() });
          setIsSearchingUser(false);
          return;
        }
      }

      if (!snaps.empty) {
        const docData = snaps.docs[0].data();
        setFoundUser({ id: snaps.docs[0].id, ...docData });
      } else {
        toast.error("User not found.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Error searching user.");
    } finally {
      setIsSearchingUser(false);
    }
  };

  const handleCreateReseller = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foundUser) {
      toast.error("Please search and select a user first");
      return;
    }

    if (foundUser.role === "agency" || foundUser.isAgency) {
      toast.error("Please delete their agency role first before making them a reseller.");
      return;
    }

    setIsCreatingReseller(true);
    const tid = toast.loading("Creating Reseller...");

    try {
      let newResellerId = foundUser.resellerId;
      if (!newResellerId) {
        newResellerId = Math.floor(100000 + Math.random() * 900000).toString();
      }

      await updateDoc(doc(db, "users", foundUser.id), {
        role: "reseller",
        isReseller: true,
        isreseller: true,
        resellerId: newResellerId,
        balance: foundUser.balance || 0,
      });

      toast.success("Reseller created successfully!", { id: tid });
      setCreateResellerOpen(false);
      setSearchUserId("");
      setFoundUser(null);
      
      // Optionally reload resellers if tab is active
      if (activeTab === "resellers") {
        setActiveTab("pending");
        setTimeout(() => setActiveTab("resellers"), 100);
      }
    } catch (error: any) {
      console.error(error);
      toast.error("Failed to create reseller", { id: tid });
    } finally {
      setIsCreatingReseller(false);
    }
  };

  const handleDeleteReseller = async (e: React.MouseEvent, reseller: any) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to remove the reseller role from ${reseller.displayName || reseller.name || "this user"}?`)) return;

    const tid = toast.loading("Removing reseller...");
    try {
      await updateDoc(doc(db, "users", reseller.id), {
        role: "user",
        isReseller: false,
        isreseller: false,
      });
      toast.success("Reseller removed", { id: tid });
      setResellers(prev => prev.filter(r => r.id !== reseller.id));
    } catch (error) {
      console.error(error);
      toast.error("Failed to remove reseller", { id: tid });
    }
  };

  const pendingRequests = requests.filter(r => r.status === "pending");
  const historyRequests = requests.filter(r => r.status !== "pending");
  
  const displayRequests = activeTab === "pending" ? pendingRequests : historyRequests;

  const filteredResellers = resellers.filter(r => {
    const term = resellerSearch.toLowerCase();
    const name = (r.displayName || r.name || "").toLowerCase();
    const displayId = (r.displayId || r.uid || "").toLowerCase();
    const agencyIdStr = (r.agencyId ? String(r.agencyId) : "").toLowerCase();
    return name.includes(term) || displayId.includes(term) || agencyIdStr.includes(term);
  });

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2">Reseller Coin Requests</h1>
        <p className="text-gray-500 font-medium">Manage and approve coin top-ups requested by agencies and resellers.</p>
      </div>

      <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit mb-6">
        <button
          onClick={() => setActiveTab("resellers")}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-sm transition-all ${
            activeTab === "resellers"
              ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
              : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          <Users size={16} />
          Active Resellers
        </button>
        <button
          onClick={() => setActiveTab("pending")}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-sm transition-all ${
            activeTab === "pending"
              ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm"
              : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          <Clock size={16} />
          Pending ({pendingRequests.length})
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-sm transition-all ${
            activeTab === "history"
              ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
              : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          <CheckCircle2 size={16} />
          History
        </button>
      </div>

      {activeTab === "resellers" && (
        <div className="flex justify-end mb-4">
          <button 
            onClick={() => setCreateResellerOpen(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-lg shadow-blue-500/30"
          >
            <UserPlus size={24} />
            Create Reseller
          </button>
        </div>
      )}

      {activeTab === "resellers" ? (
        <div className="space-y-6">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search by name or Display ID..."
              className="w-full pl-12 pr-4 py-3 rounded-xl border dark:border-gray-800 bg-white dark:bg-gray-900 dark:text-white outline-none focus:ring-2 ring-blue-500 transition-all font-medium"
              value={resellerSearch}
              onChange={(e) => setResellerSearch(e.target.value)}
            />
          </div>

          {resellersLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="animate-spin text-blue-500" size={40} />
            </div>
          ) : filteredResellers.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-2xl border border-dashed dark:border-gray-800">
              <Users size={48} className="mx-auto text-gray-300 dark:text-gray-700 mb-4" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">No resellers found</h3>
              <p className="text-gray-500 text-sm">No active resellers match your search criteria.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredResellers.map((reseller) => {
                const displayName = reseller.displayName || reseller.name || "Unknown Reseller";
                const displayId = reseller.displayId || reseller.uid;
                const photoUrl = reseller.photoUrl || reseller.logo || null;
                const resellerBal = reseller.balance ?? 0;
                const role = reseller.role || "reseller";

                return (
                  <div 
                    key={reseller.id} 
                    onClick={() => {
                      setSelectedReseller(reseller);
                      setTransferModalOpen(true);
                      setTransferModalTab("send");
                    }}
                    className="bg-white dark:bg-gray-900 p-5 rounded-2xl border dark:border-gray-800 shadow-sm flex items-center justify-between gap-4 cursor-pointer hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      {photoUrl ? (
                        <img src={photoUrl} className="w-12 h-12 rounded-full object-cover shrink-0 border border-blue-100 dark:border-blue-800/50" alt="" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-800/50 text-blue-500 font-bold">
                          {displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <h4 className="font-bold text-base dark:text-white flex items-center gap-2 truncate">
                          {displayName}
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            role === "agency" 
                              ? "bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400" 
                              : "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400"
                          }`}>
                            {role}
                          </span>
                        </h4>
                        <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                          <p className="font-mono">ID: {displayId}</p>
                          {reseller.agencyId && (
                            <span className="inline-block mt-1.5 px-3 py-1 bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 text-sm font-black font-mono rounded-lg tracking-wider">
                              Agency ID: {reseller.agencyId}
                            </span>
                          )}
                          {reseller.email && <p className="truncate">📧 {reseller.email}</p>}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 flex flex-col items-end">
                      <div className="flex items-center gap-2 mb-0.5">
                        <div className="text-[10px] font-black uppercase text-gray-400 tracking-wider group-hover:text-blue-500 transition-colors">Reseller Balance</div>
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveDropdown(activeDropdown === reseller.id ? null : reseller.id);
                            }}
                            className="p-1 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg transition-colors z-10"
                          >
                            <MoreVertical size={16} />
                          </button>
                          
                          {activeDropdown === reseller.id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setActiveDropdown(null); }} />
                              <div className="absolute right-0 mt-1 w-32 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden z-20">
                                <button
                                  onClick={(e) => {
                                    setActiveDropdown(null);
                                    handleDeleteReseller(e, reseller);
                                  }}
                                  className="w-full text-left px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2 transition-colors"
                                >
                                  <Trash2 size={14} /> Remove
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="font-black text-lg font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1 justify-end">
                        <Coins size={16} />
                        {resellerBal.toLocaleString()}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-blue-500" size={40} />
          </div>
        ) : displayRequests.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-2xl border border-dashed dark:border-gray-800">
            <Coins size={48} className="mx-auto text-gray-300 dark:text-gray-700 mb-4" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">No requests found</h3>
            <p className="text-gray-500 text-sm">There are currently no {activeTab} coin requests.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {displayRequests.map((req) => {
              const uData = userDetails[req.agencyId] || {};
              const displayName = uData.displayName || uData.name || req.agencyName || req.resellerName || "Unknown Agency";
              const displayId = uData.displayId || req.agencyId;
              const photoUrl = uData.photoUrl || uData.logo || null;

              return (
              <div key={req.id} className="bg-white dark:bg-gray-900 p-5 rounded-2xl border dark:border-gray-800 shadow-sm flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                
                <div className="flex items-center gap-5 flex-1 min-w-0">
                  {photoUrl ? (
                    <img src={photoUrl} className="w-12 h-12 rounded-full object-cover shrink-0 border border-blue-100 dark:border-blue-800/50" alt="" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-800/50">
                      <Coins size={24} className="text-blue-500" />
                    </div>
                  )}
                  
                  <div className="min-w-0">
                    <h4 className="font-bold text-lg dark:text-white flex items-center gap-2 truncate">
                      {displayName}
                      {req.status === "approved" && <CheckCircle2 size={16} className="text-emerald-500" />}
                      {req.status === "rejected" && <XCircle size={16} className="text-red-500" />}
                    </h4>
                    <div className="flex items-center gap-3 text-sm mt-1.5 text-gray-500 flex-wrap">
                      <span className="font-mono text-xs">ID: {displayId}</span>
                      {uData.agencyId && (
                        <>
                          <span>•</span>
                          <span className="inline-block px-2.5 py-0.5 bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 text-xs font-black font-mono rounded-md tracking-wider">
                            Agency ID: {uData.agencyId}
                          </span>
                        </>
                      )}
                      <span>•</span>
                      <span>
                        {req.timestamp?.toDate ? req.timestamp.toDate().toLocaleString() : "Recently"}
                      </span>
                    </div>
                    {req.note && (
                      <p className="text-sm mt-2 text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-2 rounded-lg inline-block">
                        📝 {req.note}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-6 w-full md:w-auto">
                  <div className="text-left md:text-right flex-1 md:flex-none">
                    <div className="text-xs font-black uppercase text-gray-400 tracking-wider mb-1">Request Amount</div>
                    <div className="font-black text-2xl font-mono text-blue-600 dark:text-blue-400 flex items-center gap-1.5 md:justify-end">
                      <Coins size={20} />
                      {req.amount.toLocaleString()}
                    </div>
                  </div>

                  {req.screenshotUrl && (
                    <a 
                      href={req.screenshotUrl} 
                      target="_blank" 
                      rel="noreferrer"
                      className="p-3 rounded-xl bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-500 transition-colors shrink-0"
                      title="View Payment Proof"
                    >
                      <ImageIcon size={20} />
                    </a>
                  )}

                  {req.status === "pending" && (
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleReject(req)}
                        disabled={processingId === req.id}
                        className="p-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-500/10 dark:hover:bg-red-500/20 transition-colors disabled:opacity-50"
                        title="Reject Request"
                      >
                        {processingId === req.id ? <Loader2 size={20} className="animate-spin" /> : <X size={20} />}
                      </button>
                      <button
                        onClick={() => handleApprove(req)}
                        disabled={processingId === req.id}
                        className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
                      >
                        {processingId === req.id ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />}
                        Approve
                      </button>
                    </div>
                  )}
                </div>

              </div>
              );
            })}
          </div>
        )
      )}

      {/* Transfer Modal */}
      {transferModalOpen && selectedReseller && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-800 shrink-0">
              <h3 className="text-xl font-bold dark:text-white flex items-center gap-2">
                <Coins className="text-blue-500" /> Action
              </h3>
              <button 
                onClick={() => {
                  setTransferModalOpen(false);
                  setSelectedReseller(null);
                  setTransferAmount("");
                  setTransferNote("");
                }}
                className="p-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-500"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="flex p-2 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800 shrink-0">
              <button
                onClick={() => setTransferModalTab("send")}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${
                  transferModalTab === "send" ? "bg-white dark:bg-gray-700 text-blue-600 shadow-sm" : "text-gray-500"
                }`}
              >
                Send Balance
              </button>
              <button
                onClick={() => setTransferModalTab("history")}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${
                  transferModalTab === "history" ? "bg-white dark:bg-gray-700 text-blue-600 shadow-sm" : "text-gray-500"
                }`}
              >
                Top-ups
              </button>
              <button
                onClick={() => setTransferModalTab("user_transfers")}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${
                  transferModalTab === "user_transfers" ? "bg-white dark:bg-gray-700 text-blue-600 shadow-sm" : "text-gray-500"
                }`}
              >
                User Transfers
              </button>
            </div>

            <div className="overflow-y-auto">
              {transferModalTab === "send" ? (
                <form onSubmit={handleDirectTransfer} className="p-6 space-y-5">
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800/50">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Sending to</p>
                    <div className="flex justify-between items-start mt-1">
                      <div>
                        <p className="font-bold text-lg dark:text-white">
                          {selectedReseller.displayName || selectedReseller.name || "Unknown Reseller"}
                        </p>
                        <p className="text-xs font-mono text-blue-600 dark:text-blue-400 mt-1">
                          ID: {selectedReseller.displayId || selectedReseller.uid}
                        </p>
                        {selectedReseller.agencyId && (
                          <p className="text-xs font-mono text-purple-600 dark:text-purple-400 mt-0.5 font-bold">
                            Agency ID: {selectedReseller.agencyId}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Available</p>
                        <p className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 justify-end">
                          <Coins size={14} />
                          {(selectedReseller.agencybalence ?? selectedReseller.agencyBalance ?? 0).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Amount (Coins)</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Coins className="text-gray-400" size={18} />
                      </div>
                      <input
                        type="number"
                        required
                        min="1"
                        value={transferAmount}
                        onChange={(e) => setTransferAmount(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 dark:text-white text-lg font-bold transition-all"
                        placeholder="e.g. 50000"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Note (Optional)</label>
                    <input
                      type="text"
                      value={transferNote}
                      onChange={(e) => setTransferNote(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 dark:text-white transition-all"
                      placeholder="e.g. Bonus, Top up"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={transferring || !transferAmount || Number(transferAmount) <= 0}
                      className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30"
                    >
                      {transferring ? (
                        <><Loader2 className="animate-spin" size={20} /> Processing...</>
                      ) : (
                        <><CheckCircle2 size={20} /> Confirm Send</>
                      )}
                    </button>
                  </div>
                </form>
              ) : transferModalTab === "history" ? (
                <div className="p-6 space-y-4">
                  {requests.filter(r => r.agencyId === selectedReseller.id && r.status !== "pending").length === 0 ? (
                    <div className="text-center py-10 text-gray-500 text-sm">
                      No history found for this reseller.
                    </div>
                  ) : (
                    requests
                      .filter(r => r.agencyId === selectedReseller.id && r.status !== "pending")
                      .map(req => (
                        <div key={req.id} className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl flex justify-between items-center border border-gray-100 dark:border-gray-800">
                          <div>
                            <p className="text-sm font-bold flex items-center gap-1">
                              {req.status === "approved" ? <CheckCircle2 size={14} className="text-emerald-500"/> : <XCircle size={14} className="text-red-500"/>}
                              {req.amount.toLocaleString()} Coins
                            </p>
                            <p className="text-[10px] text-gray-500 mt-1">
                              {req.timestamp?.toDate ? req.timestamp.toDate().toLocaleString() : "Unknown"}
                            </p>
                            {req.note && <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">📝 {req.note}</p>}
                          </div>
                          <div className={`text-[10px] font-bold uppercase px-2 py-1 rounded border ${
                            req.status === "approved" 
                              ? "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/20"
                              : "bg-red-50 text-red-600 border-red-100 dark:bg-red-500/10 dark:border-red-500/20"
                          }`}>
                            {req.status}
                          </div>
                        </div>
                      ))
                  )}
                </div>
              ) : (
                <div className="p-6 space-y-4">
                  {transfersLoading ? (
                     <div className="flex justify-center py-10"><Loader2 className="animate-spin text-blue-500" /></div>
                  ) : userTransfers.length === 0 ? (
                    <div className="text-center py-10 text-gray-500 text-sm">
                      No user transfers found.
                    </div>
                  ) : (
                    userTransfers.map(tx => {
                        const receiver = transfersUsersCache[tx.receiverId] || {};
                        const rName = tx.receiverName || receiver.displayName || receiver.name || receiver.nickname || 'Unknown User';
                        const rId = tx.receiverDisplayId || receiver.displayId || receiver.userId || receiver.uid || tx.receiverId || '—';
                        const rAvatar = tx.receiverAvatar || receiver.photoUrl || receiver.avatar || receiver.selfieUrl || '';

                        return (
                        <div key={tx.id} className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl flex justify-between items-center border border-gray-100 dark:border-gray-800">
                          <div className="flex items-center gap-3">
                            {rAvatar ? (
                               <img src={rAvatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                            ) : (
                               <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-500 flex items-center justify-center font-bold">
                                 {rName.charAt(0).toUpperCase()}
                               </div>
                            )}
                            <div>
                              <p className="text-sm font-bold dark:text-white">{rName}</p>
                              <p className="text-[10px] text-gray-500 font-mono">ID: {rId}</p>
                              <p className="text-[10px] text-gray-400 mt-0.5">
                                {tx.createdAt?.toDate ? tx.createdAt.toDate().toLocaleString() : "Unknown"}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-emerald-500 flex items-center gap-1 justify-end">
                              <Coins size={14} /> {tx.amount.toLocaleString()}
                            </p>
                            <div className="text-[10px] font-bold uppercase px-2 py-0.5 mt-1 rounded border bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/20 inline-block">
                              Completed
                            </div>
                          </div>
                        </div>
                    )})
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Reseller Modal */}
      {createResellerOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-800 shrink-0">
              <h3 className="text-xl font-bold dark:text-white flex items-center gap-2">
                <UserPlus className="text-blue-500" /> Create Reseller
              </h3>
              <button 
                onClick={() => {
                  setCreateResellerOpen(false);
                  setFoundUser(null);
                  setSearchUserId("");

                }}
                className="p-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-500"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <form onSubmit={handleSearchUser} className="mb-6">
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Search User by ID</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Search className="text-gray-400" size={18} />
                    </div>
                    <input
                      type="text"
                      required
                      value={searchUserId}
                      onChange={(e) => setSearchUserId(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 dark:text-white font-medium transition-all"
                      placeholder="Enter ID..."
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSearchingUser || !searchUserId.trim()}
                    className="px-6 py-3 bg-gray-900 hover:bg-black dark:bg-gray-700 dark:hover:bg-gray-600 text-white rounded-xl font-bold transition-all disabled:opacity-50"
                  >
                    {isSearchingUser ? <Loader2 className="animate-spin" size={20} /> : "Search"}
                  </button>
                </div>
              </form>

              {foundUser && (
                <form onSubmit={handleCreateReseller} className="space-y-5 animate-in slide-in-from-bottom-4 duration-300">
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800/50 flex items-center gap-4">
                    {foundUser.photoUrl || foundUser.logo ? (
                      <img src={foundUser.photoUrl || foundUser.logo} alt="" className="w-12 h-12 rounded-full object-cover shrink-0 border border-blue-200 dark:border-blue-700/50" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-800 flex items-center justify-center font-bold text-blue-600 dark:text-blue-200">
                        {(foundUser.displayName || foundUser.name || "U")[0].toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-lg dark:text-white truncate">
                        {foundUser.displayName || foundUser.name || "Unknown User"}
                      </p>
                      <p className="text-xs font-mono text-blue-600 dark:text-blue-400">
                        ID: {foundUser.displayId || foundUser.uid || foundUser.id}
                      </p>
                      {foundUser.agencyId && (
                        <p className="text-xs font-mono text-purple-600 dark:text-purple-400 font-bold mt-0.5">
                          Existing Agency ID: {foundUser.agencyId}
                        </p>
                      )}
                    </div>
                  </div>



                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isCreatingReseller}
                      className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30"
                    >
                      {isCreatingReseller ? (
                        <><Loader2 className="animate-spin" size={20} /> Creating...</>
                      ) : (
                        <><UserPlus size={20} /> Confirm Create</>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
