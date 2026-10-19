import React, { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { ShieldAlert } from "lucide-react";
import toast from "react-hot-toast";
import BlockDeviceModal from "./BlockDeviceModal";
import { Link } from "react-router";

interface BannedDevice {
  id: string; // The document ID
  userId: string;
  name: string;
  deviceName: string;
  deviceId: string;
  photoUrl?: string;
  timestamp: any;
}

export default function DeviceBannedManager() {
  const [bannedDevices, setBannedDevices] = useState<BannedDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, "banned_devices"),
      orderBy("timestamp", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const devices: BannedDevice[] = [];
        snapshot.forEach((doc) => {
          devices.push({ id: doc.id, ...doc.data() } as BannedDevice);
        });
        setBannedDevices(devices);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching banned devices:", error);
        toast.error("Failed to load banned devices");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const filteredDevices = bannedDevices.filter((device) => {
    if (!searchQuery) return true;
    const lowerQuery = searchQuery.toLowerCase();
    return (
      (device.deviceId && device.deviceId.toLowerCase().includes(lowerQuery)) ||
      (device.name && device.name.toLowerCase().includes(lowerQuery)) ||
      (device.userId && device.userId.toLowerCase().includes(lowerQuery))
    );
  });

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allIds = new Set(filteredDevices.map((d) => d.id));
      setSelectedIds(allIds);
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleUnban = async () => {
    if (selectedIds.size === 0) {
      toast.error("Please select at least one device to unban.");
      return;
    }
    if (!window.confirm(`Are you sure you want to unban ${selectedIds.size} device(s)?`)) {
      return;
    }

    try {
      const promises = Array.from(selectedIds).map((id) =>
        deleteDoc(doc(db, "banned_devices", id))
      );
      await Promise.all(promises);
      toast.success(`Successfully unbanned ${selectedIds.size} device(s)`);
      setSelectedIds(new Set());
    } catch (error) {
      console.error("Error unbanning devices:", error);
      toast.error("Failed to unban devices");
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto min-h-[calc(100vh-64px)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-blue-600 flex items-center gap-3">
          Total Blocked Devices:
          <span className="px-3 py-1 bg-white border border-blue-200 rounded-lg text-blue-600 font-bold">
            {bannedDevices.length}
          </span>
        </h1>
        <button
          onClick={() => setIsBlockModalOpen(true)}
          className="flex items-center gap-2 bg-[#f43f5e] hover:bg-rose-600 text-white px-4 py-2 rounded-full font-semibold transition-all text-sm"
        >
          <ShieldAlert size={16} />
          Block by User ID
        </button>
      </div>

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search by Device ID, Name or Reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2.5 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-800 focus:outline-none focus:border-blue-500"
          />
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded font-semibold transition-all">
          Search
        </button>
      </div>

      {/* Bulk Actions */}
      <div className="flex items-center gap-3 mb-4">
        <select className="border border-gray-300 dark:border-gray-600 dark:bg-gray-800 rounded px-3 py-1.5 w-64 focus:outline-none">
          <option>----------</option>
          <option value="unban">Unban Selected Devices</option>
        </select>
        <button 
          onClick={() => {
            const selectEl = document.querySelector('select') as HTMLSelectElement;
            if (selectEl.value === 'unban') {
              handleUnban();
            }
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded font-semibold transition-all text-sm"
        >
          Go
        </button>
      </div>

      <div className="text-sm text-gray-500 mb-2">
        {selectedIds.size} of {filteredDevices.length} selected
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded shadow-sm border border-gray-200 dark:border-gray-700 overflow-x-auto">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead>
            <tr className="bg-rose-100 dark:bg-rose-900/30 text-blue-600 dark:text-blue-400 text-sm font-semibold">
              <th className="p-3 w-12 text-center">
                <input
                  type="checkbox"
                  onChange={handleSelectAll}
                  checked={
                    selectedIds.size === filteredDevices.length &&
                    filteredDevices.length > 0
                  }
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
              <th className="p-3">User ID</th>
              <th className="p-3">Name</th>
              <th className="p-3">Device Name</th>
              <th className="p-3">Device ID</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-500">
                  Loading blocked devices...
                </td>
              </tr>
            ) : filteredDevices.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-500">
                  No blocked devices found.
                </td>
              </tr>
            ) : (
              filteredDevices.map((device, index) => (
                <tr
                  key={device.id}
                  className={`border-t border-gray-100 dark:border-gray-700 text-sm ${
                    index % 2 === 0 ? "bg-white dark:bg-gray-800" : "bg-gray-50 dark:bg-gray-900/50"
                  } hover:bg-blue-50 dark:hover:bg-blue-900/20`}
                >
                  <td className="p-3 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(device.id)}
                      onChange={() => handleSelectOne(device.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="p-3">
                    <Link
                      to={`/user/${device.userId}`}
                      className="text-blue-500 font-semibold hover:underline"
                    >
                      {device.userId}
                    </Link>
                  </td>
                  <td className="p-3 font-semibold dark:text-gray-200 flex items-center gap-2">
                    {device.name}
                  </td>
                  <td className="p-3 text-gray-600 dark:text-gray-400">
                    {device.deviceName}
                  </td>
                  <td className="p-3 text-gray-500 dark:text-gray-400 uppercase text-xs tracking-wider">
                    {device.deviceId}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isBlockModalOpen && (
        <BlockDeviceModal onClose={() => setIsBlockModalOpen(false)} />
      )}
    </div>
  );
}
