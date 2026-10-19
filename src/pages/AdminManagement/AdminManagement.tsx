import React, { useState, useEffect } from "react";
import { collection, getDocs, doc, updateDoc, deleteDoc, query, Timestamp } from "firebase/firestore";
import { Search, UserPlus } from "lucide-react";
import { useAuth } from "../../lib/AuthProvider";
import { ROLES } from "../../routes/ProtectedRoute";
import { db } from "../../lib/firebase";
import { createSubUser } from "../../routes/createSubUser";
import AddAdminModal from "./AdminModal";
import AdminTable from "./AdminTable";

export interface AdminData {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  isActive: boolean;
  createdAt?: Timestamp | Date | string | null;
}

export type AdminFormInput = Omit<AdminData, "id" | "isActive" | "createdAt"> & {
  password?: string;
};

const AdminManagement: React.FC = () => {
  const { role, user: currentUser } = useAuth();
  const [admins, setAdmins] = useState<AdminData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const [formData, setFormData] = useState<AdminFormInput>({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: ROLES.ADMIN,
  });

  const fetchAdmins = async () => {
    try {
      const q = query(collection(db, "admins"));
      const querySnapshot = await getDocs(q);
      const adminList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as AdminData[];
      setAdmins(adminList);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleStatusToggle = async (adminId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, "admins", adminId), { isActive: !currentStatus });
      fetchAdmins();
    } catch (error) {
      console.error(error);
    }
  };

  const handleRoleChange = async (adminId: string, newRole: string) => {
    try {
      await updateDoc(doc(db, "admins", adminId), { role: newRole });
      fetchAdmins();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteAdmin = async (adminId: string) => {
    if (window.confirm("Are you sure?")) {
      try {
        await deleteDoc(doc(db, "admins", adminId));
        fetchAdmins();
      } catch (error) {
        console.error(error);
      }
    }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const result = await createSubUser(
      formData.email,
      formData.password || "",
      formData.name,
      formData.phone,
      formData.role,
      currentUser?.uid || "",
    );

    if (result.success) {
      setIsModalOpen(false);
      setFormData({ name: "", email: "", phone: "", password: "", role: ROLES.ADMIN });
      fetchAdmins();
    } else {
      alert(result.error);
    }
    setSubmitting(false);
  };

  const filteredAdmins = admins.filter(
    (admin) =>
      admin.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      admin.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      admin.phone?.includes(searchTerm),
  );

  if (role !== ROLES.MOTHER && role !== ROLES.SUPER_ADMIN && role !== ROLES.ADMIN) {
    return <div className="p-10 text-center text-red-500 font-bold">Access Denied!</div>;
  }

  return (
    <div className="p-3 bg-gray-50 dark:bg-gray-950 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Admin Management</h1>
          <div className="flex items-center gap-4 flex-wrap justify-between ">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search..."
                className="pl-10 pr-4 py-2 border dark:border-gray-800 dark:bg-gray-900 dark:text-white rounded-lg outline-none w-full md:w-64"
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-blue-950 text-white px-4 py-2 rounded-lg dark:bg-transparent dark:border border-gray-700  flex items-center gap-2 hover:bg-blue-900 transition-colors"
            >
              <UserPlus size={18} /> Add Admin
            </button>
          </div>
        </div>

        <AdminTable 
          admins={filteredAdmins}
          loading={loading}
          handleStatusToggle={handleStatusToggle}
          handleRoleChange={handleRoleChange}
          handleDeleteAdmin={handleDeleteAdmin}
        />
      </div>

      <AddAdminModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAddAdmin}
        submitting={submitting}
        formData={formData}
        setFormData={setFormData}
      />
    </div>
  );
};

export default AdminManagement;
