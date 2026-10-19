import React, { useState } from "react";
import { X, Loader2, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { AdminFormInput } from "./AdminManagement";
import { ROLES } from "../../routes/ProtectedRoute";

interface AddAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
  formData: AdminFormInput;
  setFormData: React.Dispatch<React.SetStateAction<AdminFormInput>>;
}

const AddAdminModal: React.FC<AddAdminModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  submitting,
  formData,
  setFormData,
}) => {
  const [showPassword, setShowPassword] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-900/50">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">Add New Admin</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            <X size={24} />
          </button>
        </div>
        
        <form onSubmit={onSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto no-scrollbar">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
            <input 
              type="text" 
              required
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full p-2.5 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
            <input 
              type="email" 
              required
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full p-2.5 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="admin@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Number</label>
            <input 
              type="tel" 
              required
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              className="w-full p-2.5 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="+8801xxxxxxxxx"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select Role</label>
            <select 
              required
              value={formData.role}
              onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
              className="w-full p-2.5 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value={ROLES.ADMIN}>Admin</option>
              <option value={ROLES.SUPER_ADMIN}>Super Admin</option>
              <option value={ROLES.AGENCY}>Agency</option>
              <option value={ROLES.RESELLER}>Reseller</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                required
                value={formData.password || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                className="w-full p-2.5 pr-10 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Minimum 6 characters"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={submitting}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 mt-2"
          >
            {submitting ? <Loader2 className="animate-spin" size={20} /> : <ShieldCheck size={20} />}
            Create Admin Account
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddAdminModal;
