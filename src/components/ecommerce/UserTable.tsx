import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import Badge from "../ui/badge/Badge";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../../lib/firebase";

export default function UserTable() {
  const [users, setUsers] = useState<any[]>([]);
  const [filter, setFilter] = useState<"All" | "Active" | "Inactive">("All");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        const usersData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setUsers(usersData);
      } catch (error) {
        console.error(error);
      }
    };
    fetchUsers();
  }, []);

  const filteredData = users.filter((user) => {
    if (filter === "All") return true;
    const isActiveFilter = filter === "Active";
    return user.isActive === isActiveFilter;
  });

  return (
    <div className="overflow-hidden rounded-3xl border border-gray-200/50 bg-white/70 dark:bg-[#140e1b]/60 backdrop-blur-xl px-4 pb-3 pt-4 dark:border-white/[0.08] sm:px-6 hover:shadow-xl hover:shadow-purple-500/5 hover:border-purple-500/20 transition-all duration-300">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
          Users
        </h3>

        <div className="flex items-center gap-2">
          <select
            className="rounded-lg border border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-700 px-3 py-2 text-sm text-gray-700 dark:text-gray-400 cursor-pointer outline-none focus:border-pink-500/50"
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
          >
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>

          <button
            onClick={() => navigate("/users")}
            className="rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-white/[0.05] transition-all"
          >
            See all
          </button>
        </div>
      </div>

      <div className="max-w-full overflow-x-auto overflow-y-auto max-h-[400px] scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-800">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-[#FCFBF7]/95 dark:bg-[#140e1b]/95 border-y border-gray-200/50 dark:border-white/[0.06]">
            <TableRow >
              <TableCell isHeader className="py-3 px-2 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">User</TableCell>
              <TableCell isHeader className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Email</TableCell>
              <TableCell isHeader className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Status</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800/50">
            {filteredData.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="py-3 text-start">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 overflow-hidden rounded-full">
                      <img
                        src={user.photoUrl || "/default-avatar.png"}
                        className="h-full w-full object-cover"
                        alt={user.displayName}
                      />
                    </div>
                    <span className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                      {user.displayName}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="py-3 text-start text-gray-500 text-theme-sm dark:text-gray-400">
                  {user.email}
                </TableCell>
                <TableCell className="py-3 text-start">
                  <Badge
                    size="sm"
                    color={user.isActive ? "success" : "warning"}
                  >
                    {user.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
