import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import { collection, query, where, getDocs, onSnapshot, doc, getDoc, updateDoc } from "firebase/firestore";
import { Loader2, Users, Clock, CalendarDays, Search, Building2, Coins, TrendingUp, X } from "lucide-react";
import toast from "react-hot-toast";

interface HostData {
  id: string;
  name: string;
  displayName?: string;
  displayId?: string;
  uid?: string;
  photoUrl?: string;
  avatar?: string;
  logo?: string;
  validDays?: number;
  totalLiveTime?: number;
  liveTime?: number;
  liveDuration?: number;
  status?: string;
  isActive?: boolean;
  totalReceived?: number;
  isHost?: boolean;
}

interface AgencyData {
  id: string;
  name?: string;
  displayName?: string;
  agencyId?: string;
  totalEarnings?: number;
  rank?: number;
  collectionName?: string;
  photoUrl?: string;
  avatar?: string;
  logo?: string;
}

export default function AgencyData() {
  const [agencies, setAgencies] = useState<AgencyData[]>([]);
  const [selectedAgency, setSelectedAgency] = useState("");
  const [hosts, setHosts] = useState<HostData[]>([]);
  const [loadingAgencies, setLoadingAgencies] = useState(true);
  const [loadingHosts, setLoadingHosts] = useState(false);
  const [searchHost, setSearchHost] = useState("");
  const [hostStats, setHostStats] = useState<Record<string, { audioLive: number, videoLive: number, validDays: number }>>({});
  const [agencyCommissionRate, setAgencyCommissionRate] = useState(0);
  const [selectedHostForModal, setSelectedHostForModal] = useState<HostData | null>(null);

  useEffect(() => {
    // Fetch Agency Commission config
    const fetchCommissionConfig = async () => {
      try {
        const docRef = doc(db, "appSettings", "Commission_config");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setAgencyCommissionRate(Number(docSnap.data().agencyCommission || 0));
        }
      } catch (error) {
        console.error("Error fetching commission config:", error);
      }
    };
    fetchCommissionConfig();
  }, []);

  useEffect(() => {
    // Fetch agencies
    const fetchAgencies = async () => {
      try {
        const agenciesQuery = query(collection(db, "agencies"));
        const usersQuery = query(collection(db, "users"), where("role", "==", "agency"));
        
        const [aSnap, uSnap] = await Promise.all([
          getDocs(agenciesQuery),
          getDocs(usersQuery)
        ]);

        const combined = [
          ...aSnap.docs.map(d => ({ id: d.id, collectionName: 'agencies', ...d.data() } as AgencyData)),
          ...uSnap.docs.map(d => ({ id: d.id, collectionName: 'users', ...d.data() } as AgencyData))
        ];

        // Deduplicate
        const uniqueAgencies = combined.reduce((acc: AgencyData[], curr) => {
          if (!acc.find(a => a.id === curr.id || (a.agencyId && a.agencyId === curr.agencyId))) {
            acc.push(curr);
          }
          return acc;
        }, []);

        // Fetch all hosts to calculate total earnings per agency
        const allHostsSnap = await getDocs(query(collection(db, "users"), where("isHost", "==", true)));
        const earningsMap: Record<string, number> = {};
        
        allHostsSnap.forEach(docSnap => {
          const u = docSnap.data();
          if (u.agencyId) {
            const agencyIdStr = String(u.agencyId);
            const coins = Number(u.totalReceived || 0);
            earningsMap[agencyIdStr] = (earningsMap[agencyIdStr] || 0) + coins;
          }
        });

        // Map new earnings and preserve old ones for comparison
        const agenciesWithStats = uniqueAgencies.map(a => {
          const filterId = String(a.agencyId || a.id);
          const newEarnings = earningsMap[filterId] || 0;
          return {
            ...a,
            newEarnings,
            oldEarnings: a.totalEarnings,
            oldRank: a.rank
          };
        });

        // Sort descending by newEarnings to determine rank
        agenciesWithStats.sort((a, b) => b.newEarnings - a.newEarnings);

        // Assign ranks and update Firestore if needed
        const finalAgencies = await Promise.all(agenciesWithStats.map(async (a, index) => {
          const newRank = index + 1;
          
          if ((a.oldEarnings !== a.newEarnings || a.oldRank !== newRank) && a.collectionName) {
            try {
              await updateDoc(doc(db, a.collectionName, a.id), {
                totalEarnings: a.newEarnings,
                rank: newRank
              });
            } catch(e) {
              console.error("Failed to update stats for agency:", a.id);
            }
          }
          
          // Remove temporary fields for state
          const { newEarnings, oldEarnings, oldRank, ...rest } = a;
          return { ...rest, totalEarnings: newEarnings, rank: newRank };
        }));

        setAgencies(finalAgencies);
      } catch (e) {
        console.error("Error fetching agencies:", e);
        toast.error("Failed to load agencies");
      } finally {
        setLoadingAgencies(false);
      }
    };
    fetchAgencies();
  }, []);

  useEffect(() => {
    if (!selectedAgency) {
      setHosts([]);
      return;
    }

    setLoadingHosts(true);
    
    // Find agency details to get its custom agencyId if it exists
    const agencyObj = agencies.find(a => a.id === selectedAgency);
    const filterId = agencyObj?.agencyId || selectedAgency;
    // @ts-ignore
    const hostIds = Array.isArray(agencyObj?.hosts) ? agencyObj.hosts : [];

    const unsubscribers: (() => void)[] = [];
    const hostsMap = new Map<string, HostData>();

    const updateHostsState = () => {
      const hostData = Array.from(hostsMap.values()).filter(u => 
        u.status !== 'blocked' && 
        u.isActive !== false && 
        (u.isHost === true || (u as any).ishost === true || (u as any).role === 'host')
      );
      setHosts(hostData);
      setLoadingHosts(false);
    };

    const handleSnapshot = (snapshot: any) => {
      let changed = false;
      snapshot.docChanges().forEach((change: any) => {
        changed = true;
        if (change.type === "removed") {
          hostsMap.delete(change.doc.id);
        } else {
          hostsMap.set(change.doc.id, { id: change.doc.id, ...change.doc.data() } as HostData);
        }
      });
      if (changed || snapshot.docs.length === 0) updateHostsState();
    };

    // 1. Snapshot by agencyId
    const q1 = query(
      collection(db, "users"),
      where("agencyId", "in", [filterId, String(filterId), Number(filterId)].filter((v, i, a) => a.indexOf(v) === i && !Number.isNaN(v as any)))
    );
    
    unsubscribers.push(onSnapshot(q1, handleSnapshot, (error) => {
      console.error("Error fetching hosts by agencyId:", error);
      setLoadingHosts(false);
    }));

    // 2. Snapshot by hostIds array (chunked if > 10)
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
    
    // Fallback if no hosts to load initially
    if (chunks.length === 0) {
       setTimeout(() => updateHostsState(), 500); // give q1 time or fallback
    }

    return () => unsubscribers.forEach(unsub => unsub());
  }, [selectedAgency, agencies]);

  const filteredHosts = hosts.filter(h => {
    const term = searchHost.toLowerCase();
    const name = (h.displayName || h.name || "").toLowerCase();
    const id = (h.displayId || h.uid || h.id || "").toLowerCase();
    return name.includes(term) || id.includes(term);
  });

  useEffect(() => {
    if (hosts.length === 0) {
      setHostStats({});
      return;
    }

    let isMounted = true;
    
    // Get current month prefix like "2026-09"
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const monthPrefix = `${year}-${month}`;

    const fetchStats = async () => {
      const statsObj: Record<string, { audioLive: number, videoLive: number, validDays: number }> = {};
      
      const promises = hosts.map(async (host) => {
        try {
          // Fetch documents from liveHistory where ID >= "2026-09-01" and <= "2026-09-31"
          const startId = `${monthPrefix}-01`;
          const endId = `${monthPrefix}-31`;
          
          const q = query(
             collection(db, "users", host.id, "liveHistory"),
             where("__name__", ">=", startId),
             where("__name__", "<=", endId)
          );
          
          const snaps = await getDocs(q);
          
          let totalAudioMins = 0;
          let totalVideoMins = 0;
          let validDays = 0;
          
          snaps.forEach(doc => {
            const data = doc.data();
            const sessions = data.sessions || [];
            
            let dailyValidMins = 0;
            
            sessions.forEach((s: any) => {
              const typeStr = String(s.type || s.liveType || s.sessionType || s.mode || "").toLowerCase();
              const isVideo = typeStr === 'video' || s.isVideo === true || s.isVideo === 'true';
              const isAudio = typeStr === 'audio' || s.isAudio === true || s.isAudio === 'true' || (!isVideo); 
              
              let duration = Number(s.duration || s.durationMinutes || s.durationMins || 0);
              
              if (!duration && s.startTime && s.endTime) {
                const start = s.startTime?.seconds ? s.startTime.seconds * 1000 : s.startTime;
                const end = s.endTime?.seconds ? s.endTime.seconds * 1000 : s.endTime;
                duration = Math.round((end - start) / 60000);
              }
              
              if (duration > 0) {
                if (isAudio) totalAudioMins += duration;
                else totalVideoMins += duration;
                
                if (duration >= 30) {
                  dailyValidMins += duration;
                }
              }
            });
            
            if (dailyValidMins >= 60) {
              validDays++;
            }
          });
          
          statsObj[host.id] = { audioLive: totalAudioMins, videoLive: totalVideoMins, validDays };
        } catch(e) {
          console.error("Error fetching stats for host", host.id, e);
          statsObj[host.id] = { audioLive: 0, videoLive: 0, validDays: 0 };
        }
      });
      
      await Promise.all(promises);
      if (isMounted) setHostStats(statsObj);
    };
    
    fetchStats();
    
    return () => { isMounted = false; };
  }, [hosts]);

  const formatLiveTime = (minutes?: number) => {
    if (!minutes) return "0h 0m";
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hrs}h ${mins}m`;
  };

  if (loadingAgencies) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-blue-500" size={40} />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2 flex items-center gap-3">
          <Building2 className="text-purple-500" size={32} />
          Agency Data
        </h1>
        <p className="text-gray-500 font-medium">View detailed live statistics and data for hosts within an agency.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Side: Main Content */}
        <div className="w-full lg:w-2/3">
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 border dark:border-gray-800 shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center">
            <div className="w-full md:w-1/2">
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">
                Select Agency
              </label>
              <select
                value={selectedAgency}
                onChange={(e) => setSelectedAgency(e.target.value)}
                className="w-full p-4 rounded-2xl border dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 dark:text-white outline-none focus:ring-2 ring-purple-500/20 font-bold transition-all appearance-none cursor-pointer"
              >
                <option value="">-- Choose an Agency --</option>
                {agencies.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.displayName || a.name || `Agency (${a.id})`} {a.agencyId ? `[ID: ${a.agencyId}]` : ''}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="w-full md:w-1/2">
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">
                Search Host
              </label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search by name or ID..."
                  value={searchHost}
                  onChange={(e) => setSearchHost(e.target.value)}
                  disabled={!selectedAgency}
                  className="w-full pl-11 pr-4 py-4 rounded-2xl border dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 dark:text-white outline-none focus:ring-2 ring-purple-500/20 font-medium transition-all disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          {selectedAgency && (() => {
            const totalAgencyEarnings = hosts.reduce((sum, host) => {
              const finalEarning = host.totalReceived !== undefined ? host.totalReceived : 0;
              return sum + Number(finalEarning);
            }, 0);
            const agencyCommissionValue = Math.floor(totalAgencyEarnings * (agencyCommissionRate / 100));

            return (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-purple-50 dark:bg-purple-900/10 p-5 rounded-2xl border border-purple-100 dark:border-purple-800/20 flex items-center gap-4">
                  <div className="p-3 bg-purple-100 dark:bg-purple-800/30 text-purple-600 dark:text-purple-400 rounded-xl">
                    <Users size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Total Hosts</p>
                    <p className="text-2xl font-black text-purple-700 dark:text-purple-300">{hosts.length}</p>
                  </div>
                </div>
                
                <div className="bg-yellow-50 dark:bg-yellow-900/10 p-5 rounded-2xl border border-yellow-100 dark:border-yellow-800/20 flex items-center gap-4">
                  <div className="p-3 bg-yellow-100 dark:bg-yellow-800/30 text-yellow-600 dark:text-yellow-400 rounded-xl">
                    <Coins size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-yellow-500 uppercase tracking-widest">Total Earnings</p>
                    <p className="text-2xl font-black text-yellow-700 dark:text-yellow-400">{totalAgencyEarnings.toLocaleString()}</p>
                  </div>
                </div>

                <div className="bg-emerald-50 dark:bg-emerald-900/10 p-5 rounded-2xl border border-emerald-100 dark:border-emerald-800/20 flex items-center gap-4">
                  <div className="p-3 bg-emerald-100 dark:bg-emerald-800/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
                    <TrendingUp size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Commission ({agencyCommissionRate}%)</p>
                    <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400">{agencyCommissionValue.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            );
          })()}

          {!selectedAgency ? (
            <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-3xl border border-dashed dark:border-gray-800">
              <Building2 size={48} className="mx-auto text-gray-300 dark:text-gray-700 mb-4" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Select an Agency</h3>
              <p className="text-gray-500 text-sm">Please select an agency from the dropdown to view its hosts.</p>
            </div>
          ) : loadingHosts ? (
            <div className="flex justify-center py-20">
              <Loader2 className="animate-spin text-purple-500" size={40} />
            </div>
          ) : filteredHosts.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-3xl border border-dashed dark:border-gray-800">
              <Users size={48} className="mx-auto text-gray-300 dark:text-gray-700 mb-4" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">No Hosts Found</h3>
              <p className="text-gray-500 text-sm">This agency currently has no hosts matching your criteria.</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-900 rounded-3xl border dark:border-gray-800 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800/50 text-[10px] uppercase tracking-wider font-black text-gray-400">
                      <th className="p-4 pl-6">Host Profile</th>
                      <th className="p-4">Audio Live</th>
                      <th className="p-4">Video Live</th>
                      <th className="p-4">Valid Days</th>
                      <th className="p-4">Earning (Coins)</th>
                      <th className="p-4 pr-6">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {filteredHosts.map(host => {
                      const name = host.displayName || host.name || "Unknown Host";
                      const id = host.displayId || host.uid || host.id;
                      const photo = host.photoUrl || host.avatar || host.logo;
                      const stats = hostStats[host.id] || { audioLive: 0, videoLive: 0, validDays: 0 };
                      const finalEarning = host.totalReceived !== undefined ? host.totalReceived : 0;
                      
                      return (
                        <tr 
                          key={host.id} 
                          onClick={() => setSelectedHostForModal(host)}
                          className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors cursor-pointer"
                        >
                          <td className="p-4 pl-6">
                            <div className="flex items-center gap-3 min-w-[200px]">
                              {photo ? (
                                <img src={photo} alt="" className="w-10 h-10 rounded-full object-cover shrink-0 bg-gray-100" />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                                  {name[0]?.toUpperCase()}
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="font-bold text-gray-900 dark:text-white truncate">{name}</p>
                                <p className="text-xs font-mono text-gray-500">ID: {id}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold whitespace-nowrap">
                              <Clock size={16} />
                              {formatLiveTime(stats.audioLive)}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2 text-pink-600 dark:text-pink-400 font-bold whitespace-nowrap">
                              <Clock size={16} />
                              {formatLiveTime(stats.videoLive)}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold whitespace-nowrap">
                              <CalendarDays size={16} />
                              {stats.validDays} Days
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-500 font-bold whitespace-nowrap">
                              <Coins size={16} />
                              {Number(finalEarning).toLocaleString()}
                            </div>
                          </td>
                          <td className="p-4 pr-6">
                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1.5 ${
                              host.status === 'blocked' ? 'bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400' :
                              'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                            }`}>
                              <div className={`w-1.5 h-1.5 rounded-full ${host.status === 'blocked' ? 'bg-red-500' : 'bg-emerald-500'}`} />
                              {host.status === 'blocked' ? 'Blocked' : 'Active'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Agency Ranking Leaderboard */}
        <div className="w-full lg:w-1/3">
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 border dark:border-gray-800 shadow-sm sticky top-6">
            <h2 className="text-xl font-black text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <TrendingUp className="text-yellow-500" size={24} />
              Top Agencies
            </h2>
            
            <div className="space-y-4">
              {agencies.slice(0, 10).map((agency, index) => {
                const isTop1 = index === 0;
                const isTop2 = index === 1;
                const isTop3 = index === 2;
                
                return (
                  <div 
                    key={agency.id} 
                    className={`p-4 rounded-2xl flex items-center justify-between border ${
                      isTop1 ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800/50' : 
                      isTop2 ? 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700' : 
                      isTop3 ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800/50' : 
                      'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shrink-0 ${
                        isTop1 ? 'bg-yellow-400 text-white shadow-lg shadow-yellow-400/30' : 
                        isTop2 ? 'bg-gray-300 text-gray-700' : 
                        isTop3 ? 'bg-orange-400 text-white' : 
                        'bg-gray-100 dark:bg-gray-800 text-gray-400'
                      }`}>
                        {index + 1}
                      </div>
                      {(agency.photoUrl || agency.avatar || agency.logo) ? (
                        <img src={agency.photoUrl || agency.avatar || agency.logo} className="w-8 h-8 rounded-full object-cover shrink-0 bg-gray-100 dark:bg-gray-800" alt="Agency Logo" />
                      ) : null}
                      <div className="min-w-0">
                        <p className={`font-bold truncate ${isTop1 ? 'text-yellow-900 dark:text-yellow-400' : 'text-gray-900 dark:text-white'}`}>
                          {agency.displayName || agency.name || "Unknown"}
                        </p>
                        <p className="text-[10px] text-gray-500 font-mono">ID: {agency.agencyId || agency.id}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <p className={`text-sm font-black flex items-center gap-1 ${isTop1 ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-900 dark:text-white'}`}>
                        <Coins size={14} className={isTop1 ? 'text-yellow-500' : 'text-gray-400'} />
                        {Number(agency.totalEarnings || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                );
              })}
              
              {agencies.length === 0 && (
                <div className="text-center py-10 text-gray-400">
                  <p className="text-sm font-medium">No agencies found.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Host Profile Modal */}
      {selectedHostForModal && (() => {
        const host = selectedHostForModal;
        const name = host.displayName || host.name || "Unknown Host";
        const id = host.displayId || host.uid || host.id;
        const photo = host.photoUrl || host.avatar || host.logo;
        const stats = hostStats[host.id] || { audioLive: 0, videoLive: 0, validDays: 0 };
        const finalEarning = host.totalReceived !== undefined ? host.totalReceived : 0;
        
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative">
              <div className="absolute top-4 right-4">
                <button 
                  onClick={() => setSelectedHostForModal(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              
              <div className="p-8 text-center bg-gradient-to-br from-purple-500/10 to-transparent">
                {photo ? (
                  <img src={photo} alt="" className="w-24 h-24 rounded-full object-cover mx-auto mb-4 border-4 border-white dark:border-gray-800 shadow-lg" />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center font-black text-3xl mx-auto mb-4 border-4 border-white dark:border-gray-800 shadow-lg">
                    {name[0]?.toUpperCase()}
                  </div>
                )}
                <h3 className="text-xl font-black text-gray-900 dark:text-white">{name}</h3>
                <p className="text-sm font-mono text-gray-500 mt-1">ID: {id}</p>
                
                <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                  HOST PROFILE
                </div>
              </div>
              
              <div className="p-6 grid grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 text-center">
                  <Clock className="mx-auto text-blue-500 mb-2" size={20} />
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Audio Live</p>
                  <p className="font-bold text-gray-900 dark:text-white">{formatLiveTime(stats.audioLive)}</p>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 text-center">
                  <Clock className="mx-auto text-pink-500 mb-2" size={20} />
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Video Live</p>
                  <p className="font-bold text-gray-900 dark:text-white">{formatLiveTime(stats.videoLive)}</p>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 text-center">
                  <CalendarDays className="mx-auto text-emerald-500 mb-2" size={20} />
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Valid Days</p>
                  <p className="font-bold text-gray-900 dark:text-white">{stats.validDays} Days</p>
                </div>
                
                <div className="bg-yellow-50 dark:bg-yellow-900/10 rounded-2xl p-4 text-center">
                  <Coins className="mx-auto text-yellow-500 mb-2" size={20} />
                  <p className="text-[10px] font-black text-yellow-500 uppercase tracking-widest mb-1">Total Earned</p>
                  <p className="font-bold text-yellow-700 dark:text-yellow-400">{Number(finalEarning).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}


