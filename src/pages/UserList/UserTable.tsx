import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../components/ui/table";
import Badge from "../../components/ui/badge/Badge";
import { Trash2, Edit, Coins } from "lucide-react";

export interface User {
  id: string;
  displayName?: string;
  fullName?: string;
  name?: string;
  email?: string;
  photoUrl?: string;
  avatar?: string;
  photo?: string;
  isActive?: boolean;
  isBlocked?: boolean;
  displayId?: string;
  role?: string;
  diamonds?: number;
  balance?: number;
  totalReceived?: number;
  giftDiamonds?: number;
  createdAt?: any;
  lastActivity?: any;
  isCoinBlocked?: boolean;
  coinBlocked?: boolean;
  [key: string]: any;
}

interface UserTableProps {
  users: User[];
  selectedUserIds: string[];
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  isAllSelected: boolean;
  handleDeleteUser: (id: string) => void;
  onViewUser: (user: User) => void;
  onManageCoins: (user: User) => void;
}

export default function UserTable({
  users,
  selectedUserIds,
  onToggleSelect,
  onToggleSelectAll,
  isAllSelected,
  handleDeleteUser,
  onViewUser,
  onManageCoins,
}: UserTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="border-y dark:border-gray-800">
          <TableCell className="py-3 px-4 w-12 text-center" isHeader>
            <input
              type="checkbox"
              checked={isAllSelected && users.length > 0}
              onChange={onToggleSelectAll}
              title="Mark All"
              className="w-4 h-4 rounded border-gray-300 dark:border-gray-700 text-red-600 focus:ring-red-500 cursor-pointer accent-red-600"
            />
          </TableCell>
          <TableCell className="py-3 text-start pl-6" isHeader>User</TableCell>
          <TableCell className="py-3 pl-3 text-start" isHeader>Display ID</TableCell>
          <TableCell className="py-3 pl-3 text-start" isHeader>Coins (💎)</TableCell>
          <TableCell className="py-3 pl-3 text-start" isHeader>Email</TableCell>
          <TableCell className="py-3 text-center" isHeader>Status</TableCell>
          <TableCell className="py-3 text-center" isHeader>Actions</TableCell>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => {
          const isSelected = selectedUserIds.includes(user.id);
          const userCoins = Number(user.diamonds ?? user.balance ?? 0);

          return (
            <TableRow
              className={`border-y dark:border-gray-800 transition-colors ${
                isSelected ? "bg-red-50/50 dark:bg-red-950/20" : "hover:bg-gray-50/60 dark:hover:bg-white/[0.02]"
              }`}
              key={user.id}
            >
              {/* Mark Checkbox */}
              <TableCell
                className="py-3 px-4 text-center"
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggleSelect(user.id)}
                  title="Mark User"
                  className="w-4 h-4 rounded border-gray-300 dark:border-gray-700 text-red-600 focus:ring-red-500 cursor-pointer accent-red-600"
                />
              </TableCell>

              {/* User Info - Clickable */}
              <TableCell
                className="py-2 pl-6 cursor-pointer group"
                onClick={() => onViewUser(user)}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img
                      src={user.photoUrl || user.avatar || user.photo || "/default-avatar.png"}
                      alt=""
                      className="h-10 w-10 rounded-full object-cover border border-gray-200 dark:border-gray-700 shrink-0 group-hover:ring-2 ring-blue-500 transition-all shadow-sm"
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold text-gray-900 dark:text-white text-nowrap group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {user.displayName || user.fullName || user.name || "Unnamed User"}
                    </span>
                    <span className="text-[11px] text-gray-400 group-hover:text-blue-500 transition-colors">
                      Click to edit name & photo
                    </span>
                  </div>
                </div>
              </TableCell>

              {/* Display ID */}
              <TableCell
                className="py-3 pl-3 text-sm font-mono font-bold text-gray-700 dark:text-gray-300 cursor-pointer"
                onClick={() => onViewUser(user)}
              >
                {user.displayId ? (
                  <span className="px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800 text-xs tracking-wider">
                    #{user.displayId}
                  </span>
                ) : (
                  <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>
                )}
              </TableCell>

              {/* Coins (Diamonds/Balance) - Clickable to open coin management */}
              <TableCell
                className="py-3 pl-3 cursor-pointer"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  onManageCoins(user);
                }}
              >
                <div 
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/50 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors"
                  title="Click to deduct or add coins"
                >
                  <Coins size={14} className="text-amber-500" />
                  <span className="font-mono font-bold text-xs">
                    {userCoins.toLocaleString()}
                  </span>
                </div>
              </TableCell>

              {/* Email */}
              <TableCell
                className="py-3 text-sm text-gray-500 dark:text-gray-400 pl-3 cursor-pointer"
                onClick={() => onViewUser(user)}
              >
                {user.email || "No email"}
              </TableCell>

              {/* Status */}
              <TableCell className="py-3 pl-3 text-nowrap text-center">
                <div className="flex flex-col items-center gap-1">
                  <Badge color={user.isActive ? "success" : "warning"}>
                    {user.isActive ? "Active" : "Inactive"}
                  </Badge>
                  {Boolean(user.isCoinBlocked || user.coinBlocked) && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                      Coins Blocked
                    </span>
                  )}
                </div>
              </TableCell>

              {/* Actions: View/Edit Details + Deduct/Add Coins + Delete */}
              <TableCell className="py-3 text-center" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                <div className="flex items-center justify-center gap-1">
                  <button
                    type="button"
                    onClick={() => onManageCoins(user)}
                    className="p-2 rounded-xl text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors"
                    title="Deduct or Add Coins (কয়েন কেটে নিন / যোগ করুন)"
                  >
                    <Coins size={17} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onViewUser(user)}
                    className="p-2 rounded-xl text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
                    title="View Details & Edit Name/Photo"
                  >
                    <Edit size={17} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteUser(user.id)}
                    className="p-2 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 transition-colors"
                    title="Delete User"
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

