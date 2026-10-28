import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate } from "react-router";
import { toast } from "react-hot-toast";
import { LuLock, LuMail, LuEye, LuEyeOff } from "react-icons/lu";
import { auth } from "../lib/firebase";
import tiamoLogo from "../../assets/Tiamo.png";

const SignIn: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success("Welcome back!");
      navigate("/");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Invalid credentials";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#070509] p-4 overflow-hidden">
      {/* Decorative Ambient Glow Blobs */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] md:w-[500px] md:h-[500px] bg-brand-500/10 rounded-full blur-[100px] pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[350px] h-[350px] md:w-[600px] md:h-[600px] bg-blue-500/15 rounded-full blur-[120px] pointer-events-none animate-pulse duration-[8000ms]"></div>

      <div className="relative w-full max-w-md bg-white/80 dark:bg-[#140e1b]/70 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl border border-gray-200/50 dark:border-white/[0.08] p-8 md:p-10 hover:border-brand-500/20 transition-all duration-500">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-24 h-24 bg-white/80 dark:bg-white/10 rounded-3xl p-3 shadow-xl shadow-brand-500/10 border border-brand-500/20 flex items-center justify-center">
              <img
                src={tiamoLogo}
                alt="Tiamo Live Logo"
                className="w-full h-full object-contain"
              />
            </div>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-brand-500 dark:text-brand-400">
            Tiamo Live
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">
            Enter your credentials to access the management dashboard
          </p>
        </div>

        <form onSubmit={handleSignIn} className="space-y-6">
          <div>
            <label className="block text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest ml-1 mb-2">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
                <LuMail size={20} />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-gray-50/50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/[0.08] rounded-2xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500/50 outline-none transition-all dark:text-white font-bold"
                placeholder="admin@example.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest ml-1 mb-2">
              Password
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
                <LuLock size={20} />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-12 py-4 bg-gray-50/50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/[0.08] rounded-2xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500/50 outline-none transition-all dark:text-white font-bold"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-500 transition-colors"
              >
                {showPassword ? <LuEyeOff size={20} /> : <LuEye size={20} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-brand-500 hover:bg-brand-600 text-white font-black text-lg rounded-2xl transition-all shadow-lg shadow-brand-500/20 active:scale-[0.98] disabled:opacity-70 flex items-center justify-center cursor-pointer"
          >
            {loading ? (
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-200/50 dark:border-white/[0.06] text-center">
          <p className="text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
            Secure Encryption Enabled • Authorized Access Only
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignIn;
