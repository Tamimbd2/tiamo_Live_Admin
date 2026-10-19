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
import { ShieldAlert, Search } from "lucide-react";
import toast from "react-hot-toast";
import BlockEmailModal from "./BlockEmailModal";
import BlockEmailByUserIdModal from "./BlockEmailByUserIdModal";
import { Link } from "react-router";

interface BlockedEmail {
  id: string; // The document ID
  userId?: string;
  name?: string;
  email: string;
  reason: string;
  timestamp: any;
}

export default function EmailBlockedManager() {
  const [blockedEmails, setBlockedEmails] = useState<BlockedEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBlockEmailModalOpen, setIsBlockEmailModalOpen] = useState(false);
  const [isBlockUserIdModalOpen, setIsBlockUserIdModalOpen] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, "banned_emails"),
      orderBy("timestamp", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const emails: BlockedEmail[] = [];
        snapshot.forEach((doc) => {
          emails.push({ id: doc.id, ...doc.data() } as BlockedEmail);
        });
        setBlockedEmails(emails);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching blocked emails:", error);
        toast.error("Failed to load blocked emails");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const filteredEmails = blockedEmails.filter((record) => {
    if (!searchQuery) return true;
    const lowerQuery = searchQuery.toLowerCase();
    return (
      (record.email && record.email.toLowerCase().includes(lowerQuery)) ||
      (record.reason && record.reason.toLowerCase().includes(lowerQuery)) ||
      (record.name && record.name.toLowerCase().includes(lowerQuery)) ||
      (record.userId && record.userId.toLowerCase().includes(lowerQuery))
    );
  });

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allIds = new Set(filteredEmails.map((d) => d.id));
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

  const handleUnblock = async (id?: string) => {
    const idsToUnblock = id ? [id] : Array.from(selectedIds);
    
    if (idsToUnblock.length === 0) {
      toast.error("Please select at least one email to unblock.");
      return;
    }
    if (!window.confirm(`Are you sure you want to unblock ${idsToUnblock.length} email(s)?`)) {
      return;
    }

    try {
      const promises = idsToUnblock.map((recordId) =>
        deleteDoc(doc(db, "banned_emails", recordId))
      );
      await Promise.all(promises);
      toast.success(`Successfully unblocked ${idsToUnblock.length} email(s)`);
      if (!id) {
        setSelectedIds(new Set());
      } else {
        const newSelected = new Set(selectedIds);
        newSelected.delete(id);
        setSelectedIds(newSelected);
      }
    } catch (error) {
      console.error("Error unblocking emails:", error);
      toast.error("Failed to unblock emails");
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "Unknown";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    if (isNaN(date.getTime())) return "Unknown";
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const formatTimeAgo = (timestamp: any) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    if (isNaN(date.getTime())) return "";

    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return "1 day ago";
    if (diffDays < 30) return `${diffDays} days ago`;
    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths === 1) return "1 month ago";
    return `${diffMonths} months ago`;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto min-h-[calc(100vh-64px)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-blue-600 flex items-center gap-3">
          Total Blocked Emails:
          <span className="px-3 py-1 bg-white border border-blue-200 rounded-lg text-blue-600 font-bold">
            {blockedEmails.length}
          </span>
        </h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsBlockEmailModalOpen(true)}
            className="flex items-center gap-2 bg-[#ef4444] hover:bg-red-600 text-white px-4 py-2 rounded-full font-semibold transition-all text-sm"
          >
            <ShieldAlert size={16} />
            Block Email
          </button>
          <button
            onClick={() => setIsBlockUserIdModalOpen(true)}
            className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-full font-semibold transition-all text-sm"
          >
            <Search size={16} />
            Block by User ID
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search by Email or Reason..."
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
          <option value="unblock">Unblock Selected Emails</option>
        </select>
        <button 
          onClick={() => {
            const selectEl = document.querySelector('select') as HTMLSelectElement;
            if (selectEl.value === 'unblock') {
              handleUnblock();
            }
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded font-semibold transition-all text-sm"
        >
          Go
        </button>
      </div>

      <div className="text-sm text-gray-500 mb-2">
        {selectedIds.size} of {filteredEmails.length} selected
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
                    selectedIds.size === filteredEmails.length &&
                    filteredEmails.length > 0
                  }
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
              <th className="p-3">User ID</th>
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Reason</th>
              <th className="p-3">Blocked At</th>
              <th className="p-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-gray-500">
                  Loading blocked emails...
                </td>
              </tr>
            ) : filteredEmails.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-gray-500">
                  No blocked emails found.
                </td>
              </tr>
            ) : (
              filteredEmails.map((record, index) => (
                <tr
                  key={record.id}
                  className={`border-t border-gray-100 dark:border-gray-700 text-sm ${
                    index % 2 === 0 ? "bg-white dark:bg-gray-800" : "bg-gray-50 dark:bg-gray-900/50"
                  } hover:bg-blue-50 dark:hover:bg-blue-900/20`}
                >
                  <td className="p-3 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(record.id)}
                      onChange={() => handleSelectOne(record.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="p-3">
                    {record.userId ? (
                      <Link
                        to={`/user/${record.userId}`}
                        className="text-blue-500 font-semibold hover:underline"
                      >
                        {record.userId}
                      </Link>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="p-3 font-semibold dark:text-gray-200">
                    {record.name || "-"}
                  </td>
                  <td className="p-3 text-gray-600 dark:text-gray-400 font-mono text-xs">
                    {record.email}
                  </td>
                  <td className="p-3 text-gray-700 dark:text-gray-300">
                    {record.reason || "No reason provided"}
                  </td>
                  <td className="p-3">
                    <div className="font-semibold text-gray-800 dark:text-gray-200">
                      {formatDate(record.timestamp)}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {formatTimeAgo(record.timestamp)}
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => handleUnblock(record.id)}
                      className="bg-[#10b981] hover:bg-emerald-600 text-white px-4 py-1.5 rounded-full font-semibold transition-all text-xs"
                    >
                      Unblock
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isBlockEmailModalOpen && (
        <BlockEmailModal onClose={() => setIsBlockEmailModalOpen(false)} />
      )}
      
      {isBlockUserIdModalOpen && (
        <BlockEmailByUserIdModal onClose={() => setIsBlockUserIdModalOpen(false)} />
      )}
    </div>
  );
}
