import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { uploadFile } from "../../lib/upload";
import { toast } from "react-hot-toast";

export default function UserProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Form states
  const [fullName, setFullName] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<string>("");
  const [removePhoto, setRemovePhoto] = useState(false);
  
  const [diamonds, setDiamonds] = useState<number>(0);
  const [giftDiamonds, setGiftDiamonds] = useState<number>(0);
  const [lockDiamonds, setLockDiamonds] = useState(false);
  
  const [roles, setRoles] = useState({
    admin: false,
    agent: false,
    host: false,
    moderator: false,
    reseller: false,
    user: false,
  });

  const [email, setEmail] = useState("");

  useEffect(() => {
    if (id) fetchUser();
  }, [id]);

  const fetchUser = async () => {
    try {
      const userDoc = await getDoc(doc(db, "users", id!));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setUser({ id: userDoc.id, ...data });

        // Initialize form
        setFullName(data.fullName || data.name || data.displayName || "");
        setPhotoUrl(data.photoUrl || data.avatar || data.photo || "");
        setDiamonds(Number(data.totalReceived) || Number(data.diamonds) || 0);
        setGiftDiamonds(Number(data.giftDiamonds) || 0);
        setLockDiamonds(data.lockDiamonds || false);
        setEmail(data.email || "");

        // Map roles
        setRoles({
          admin: !!(data.role === "admin" || data.isAdmin),
          agent: !!(data.role === "agent" || data.isAgent),
          host: !!(data.role === "host" || data.isHost || data.ishost),
          moderator: !!(data.role === "moderator" || data.isModerator),
          reseller: !!(data.role === "reseller" || data.isReseller),
          user: !!(data.role === "user" || !data.role),
        });
      } else {
        toast.error("User not found");
        navigate(-1);
      }
    } catch (error) {
      console.error(error);
      toast.error("Error fetching user data");
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = (roleName: keyof typeof roles) => {
    setRoles((prev) => ({
      ...prev,
      [roleName]: !prev[roleName],
    }));
  };

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      // Determine primary role from checkboxes (just an example, priority based or simply last checked)
      let primaryRole = "user";
      if (roles.admin) primaryRole = "admin";
      else if (roles.reseller) primaryRole = "reseller";
      else if (roles.moderator) primaryRole = "moderator";
      else if (roles.host) primaryRole = "host";

      const updateData: any = {
        fullName,
        displayName: fullName,
        totalReceived: diamonds,
        diamonds: diamonds,
        giftDiamonds,
        lockDiamonds,
        email,
        role: primaryRole,
        isHost: roles.host,
        ishost: roles.host,
        isAdmin: roles.admin,
        isAgent: roles.agent,
        isModerator: roles.moderator,
        isReseller: roles.reseller,
      };

      if (selectedFile) {
        const uploadedUrl = await uploadFile(selectedFile, "avatars");
        updateData.photoUrl = uploadedUrl;
        updateData.avatar = uploadedUrl;
        updateData.photo = uploadedUrl;
        setPhotoUrl(uploadedUrl);
      } else if (removePhoto) {
        updateData.photoUrl = "";
        updateData.avatar = "";
        updateData.photo = "";
        setPhotoUrl("");
      }

      await updateDoc(doc(db, "users", id), updateData);
      toast.success("Profile saved successfully");
    } catch (error) {
      console.error(error);
      toast.error("Error saving profile");
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewPhoto(URL.createObjectURL(file));
      setRemovePhoto(false);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    if (isNaN(date.getTime())) return "N/A";
    return new Intl.DateTimeFormat('en-GB', {
      weekday: 'long',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(date);
  };

  if (loading) return <div className="p-10 text-center">Loading user profile...</div>;
  if (!user) return null;

  const currentDisplayPhoto = previewPhoto || (!removePhoto ? photoUrl : "");

  return (
    <div className="p-6 bg-[#f8f9fa] dark:bg-gray-900 min-h-[calc(100vh-64px)] rounded-xl text-gray-800 dark:text-gray-200">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Column */}
        <div className="w-full md:w-[350px] p-6 border-r border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
          
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Profile Image</label>
            <div className="flex flex-col gap-3">
              {currentDisplayPhoto && (
                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-blue-500 mx-auto shadow-md">
                  <img
                    src={currentDisplayPhoto}
                    alt={fullName}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <input 
                type="file" 
                accept="image/*"
                onChange={handleFileChange}
                className="w-full text-sm text-gray-500 border border-gray-300 dark:border-gray-600 rounded cursor-pointer bg-white dark:bg-gray-700 file:mr-4 file:py-2 file:px-4 file:border-0 file:text-sm file:font-semibold file:bg-gray-100 dark:file:bg-gray-600 file:text-gray-700 dark:file:text-gray-200 hover:file:bg-gray-200"
              />
              {photoUrl && (
                <div className="flex items-start gap-2 mt-2">
                  <input 
                    type="checkbox" 
                    checked={removePhoto}
                    onChange={(e) => {
                      setRemovePhoto(e.target.checked);
                      if (e.target.checked) setPreviewPhoto("");
                    }}
                    className="mt-1 w-4 h-4 border-gray-300 rounded text-red-500 focus:ring-red-500 cursor-pointer"
                  />
                  <span className="text-xs text-red-500 font-semibold cursor-pointer">
                    Remove profile photo
                  </span>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Full Name</label>
            <input 
              type="text" 
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:border-blue-500 dark:bg-gray-700"
            />
          </div>
        </div>

        {/* Right Column */}
        <div className="flex-1 p-6 bg-white dark:bg-gray-800">
          
          {/* Profile Details */}
          <div className="mb-8">
            <h3 className="text-lg font-bold border-b pb-2 mb-4 dark:border-gray-700">Profile Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
              <div>
                <label className="block text-sm font-bold mb-2">Diamonds</label>
                <div className="flex items-center">
                  <button 
                    onClick={() => setDiamonds(prev => Math.max(0, prev - 1))}
                    className="w-10 h-10 flex items-center justify-center border border-red-400 text-red-500 font-bold hover:bg-red-50 transition-colors rounded-l"
                  >
                    –
                  </button>
                  <input 
                    type="number"
                    value={diamonds}
                    onChange={(e) => setDiamonds(Number(e.target.value))}
                    className="flex-1 h-10 text-center border-y border-gray-300 dark:border-gray-600 focus:outline-none font-semibold dark:bg-gray-700"
                  />
                  <button 
                    onClick={() => setDiamonds(prev => prev + 1)}
                    className="w-10 h-10 flex items-center justify-center border border-green-500 text-green-600 font-bold hover:bg-green-50 transition-colors rounded-r"
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">Gift Diamonds</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-yellow-500">🎁</span>
                  </div>
                  <input 
                    type="number"
                    value={giftDiamonds}
                    onChange={(e) => setGiftDiamonds(Number(e.target.value))}
                    className="w-full h-10 pl-10 pr-3 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:border-blue-500 font-semibold dark:bg-gray-700"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="lockDiamonds"
                checked={lockDiamonds}
                onChange={(e) => setLockDiamonds(e.target.checked)}
                className="w-4 h-4 text-red-500 border-gray-300 rounded focus:ring-red-500 cursor-pointer"
              />
              <label htmlFor="lockDiamonds" className="text-sm font-bold cursor-pointer">Lock Diamonds</label>
            </div>
          </div>

          {/* User Designation */}
          <div className="mb-8">
            <h3 className="text-lg font-bold border-b pb-2 mb-4 dark:border-gray-700">User Designation</h3>
            <div className="flex flex-col gap-3">
              {[
                { key: 'admin', label: 'Admin' },
                { key: 'agent', label: 'Agent' },
                { key: 'host', label: 'Host' },
                { key: 'moderator', label: 'Moderator' },
                { key: 'reseller', label: 'Reseller' },
                { key: 'user', label: 'User' },
              ].map((role) => (
                <div key={role.key} className="flex items-center gap-2">
                  <input 
                    type="checkbox"
                    id={`role-${role.key}`}
                    checked={roles[role.key as keyof typeof roles]}
                    onChange={() => handleRoleChange(role.key as keyof typeof roles)}
                    className="w-4 h-4 text-pink-500 border-gray-300 rounded focus:ring-pink-500 cursor-pointer"
                  />
                  <label htmlFor={`role-${role.key}`} className="text-sm font-bold text-gray-600 dark:text-gray-300 cursor-pointer">
                    {role.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Account Info */}
          <div className="mb-8">
            <h3 className="text-lg font-bold border-b pb-2 mb-4 dark:border-gray-700">Account Info</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">User ID</p>
                <p className="font-bold text-gray-800 dark:text-gray-200">{user.displayId || user.id}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Email Address</p>
                <input 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:border-blue-500 dark:bg-gray-700 text-sm"
                />
              </div>

              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Joined Date</p>
                <p className="text-sm font-bold text-gray-700 dark:text-gray-300">{formatDate(user.createdAt)}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Last Activity</p>
                <p className="text-sm font-bold text-gray-700 dark:text-gray-300">
                  {user.lastActivity ? formatDate(user.lastActivity) : "N/A"}
                </p>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-center mt-10">
            <button 
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-12 rounded-full flex items-center gap-2 transition-colors disabled:opacity-50 shadow-lg shadow-blue-500/30"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              {saving ? "Saving..." : "Save"}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
