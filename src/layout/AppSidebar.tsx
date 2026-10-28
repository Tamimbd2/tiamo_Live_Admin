import React, { useCallback, useMemo } from "react";
import { Link, useLocation } from "react-router";
import {
  LayoutDashboard,
  Users,
  ShoppingBag,
  Gift,
  ImageIcon,
  TrendingUp,
  Mic,
  Palette,
  Building2,
  MessageSquare,
  Coins,
  Settings,
  FileText,
  ShieldCheck,
  Crown,
  Bell,
  Percent,
  ShieldAlert,
} from "lucide-react";

import { useSidebar } from "../context/SidebarContext";
import { ROLES } from "../routes/ProtectedRoute";
import { useAuth } from "../lib/AuthProvider";
import tiamoLogo from "../../assets/Tiamo.png";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  allowedRoles: string[];
  subItems?: {
    name: string;
    path: string;
    icon?: React.ReactNode;
    allowedRoles: string[];
  }[];
};

const navItems: NavItem[] = [
  {
    name: "Dashboard",
    icon: <LayoutDashboard size={22} />,
    path: "/",
    allowedRoles: [
      ROLES.MOTHER,
      ROLES.SUPER_ADMIN,
      ROLES.ADMIN,
      ROLES.AGENCY,
      ROLES.RESELLER,
    ],
  },
  {
    name: "Inbox",
    icon: <MessageSquare size={22} />,
    path: "/inbox",
    allowedRoles: [
      ROLES.MOTHER,
      ROLES.SUPER_ADMIN,
      ROLES.ADMIN,
    ],
  },
  {
    name: "Social Posts",
    icon: <ImageIcon size={22} />,
    path: "/social-posts",
    allowedRoles: [
      ROLES.MOTHER,
      ROLES.SUPER_ADMIN,
      ROLES.ADMIN,
    ],
  },
  {
    name: "User Management",
    icon: <Users size={22} />,
    allowedRoles: [ROLES.MOTHER],
    subItems: [
      {
        name: "User List",
        path: "/users",
        icon: <Users size={18} />,
        allowedRoles: [ROLES.MOTHER],
      },
      {
        name: "All Hosts",
        path: "/all-hosts",
        icon: <Users size={18} />,
        allowedRoles: [ROLES.MOTHER],
      },
      {
        name: "User Levels",
        path: "/user-levels",
        icon: <Users size={18} />,
        allowedRoles: [ROLES.MOTHER],
      },
    ],
  },

  {
    name: "Content Store",
    icon: <ShoppingBag size={22} />,
    allowedRoles: [ROLES.MOTHER, ROLES.SUPER_ADMIN, ROLES.ADMIN],
    subItems: [
      {
        name: "Gift",
        path: "/gifts",
        icon: <Gift size={18} />,
        allowedRoles: [ROLES.MOTHER],
      },

      {
        name: "Frames",
        path: "/frames",
        icon: <ImageIcon size={18} />,
        allowedRoles: [ROLES.MOTHER],
      },
      {
        name: "ID Entry",
        path: "/id-entry",
        icon: <TrendingUp size={18} />,
        allowedRoles: [ROLES.MOTHER],
      },
      {
        name: "Royal Package",
        path: "/royal-package",
        icon: <Crown size={18} />,
        allowedRoles: [ROLES.MOTHER],
      },
      {
        name: "Royal Purchase",
        path: "/royal-purchase",
        icon: <ShoppingBag size={18} />,
        allowedRoles: [ROLES.MOTHER],
      },
      {
        name: "King Package",
        path: "/king-package",
        icon: <Crown size={18} />,
        allowedRoles: [ROLES.MOTHER],
      },
      {
        name: "King Purchase",
        path: "/king-purchase",
        icon: <ShoppingBag size={18} />,
        allowedRoles: [ROLES.MOTHER],
      },
      {
        name: "Crown Package",
        path: "/crown-package",
        icon: <Crown size={18} />,
        allowedRoles: [ROLES.MOTHER],
      },
      {
        name: "Crown Purchase",
        path: "/crown-purchase",
        icon: <ShoppingBag size={18} />,
        allowedRoles: [ROLES.MOTHER],
      },
      {
        name: "Queen Package",
        path: "/queen-package",
        icon: <Crown size={18} />,
        allowedRoles: [ROLES.MOTHER],
      },
      {
        name: "Queen Purchase",
        path: "/queen-purchase",
        icon: <ShoppingBag size={18} />,
        allowedRoles: [ROLES.MOTHER],
      },
      {
        name: "Vip Package",
        path: "/vip-package",
        icon: <Crown size={18} />,
        allowedRoles: [ROLES.MOTHER],
      },
      {
        name: "Vip Purchase",
        path: "/vip-purchase",
        icon: <ShoppingBag size={18} />,
        allowedRoles: [ROLES.MOTHER],
      },
      {
        name: "Vvip Package",
        path: "/vvip-package",
        icon: <Crown size={18} />,
        allowedRoles: [ROLES.MOTHER],
      },
      {
        name: "Vvip Purchase",
        path: "/vvip-purchase",
        icon: <ShoppingBag size={18} />,
        allowedRoles: [ROLES.MOTHER],
      },
      {
        name: "Room Skins",
        path: "/room-skins",
        icon: <Palette size={18} />,
        allowedRoles: [ROLES.MOTHER, ROLES.SUPER_ADMIN, ROLES.ADMIN],
      },
      {
        name: "Room Skin Purchase",
        path: "/room-skin-purchase",
        icon: <ShoppingBag size={18} />,
        allowedRoles: [ROLES.MOTHER, ROLES.SUPER_ADMIN, ROLES.ADMIN],
      },
    ],
  },
  {
    name: "Live Controls",
    icon: <Mic size={22} />,
    allowedRoles: [ROLES.MOTHER, ROLES.SUPER_ADMIN, ROLES.ADMIN],
    subItems: [
      {
        name: "Audio Board",
        path: "/audio-board",
        icon: <Mic size={18} />,
        allowedRoles: [ROLES.MOTHER, ROLES.SUPER_ADMIN, ROLES.ADMIN],
      },
      {
        name: "Video Board",
        path: "/video-board",
        icon: <ImageIcon size={18} />,
        allowedRoles: [ROLES.MOTHER, ROLES.SUPER_ADMIN, ROLES.ADMIN],
      },
      {
        name: "Moderator",
        path: "/moderator-management",
        icon: <ShieldCheck size={18} />,
        allowedRoles: [ROLES.MOTHER, ROLES.SUPER_ADMIN, ROLES.ADMIN],
      },
      {
        name: "Device Banned",
        path: "/device-banned",
        icon: <ShieldCheck size={18} />,
        allowedRoles: [ROLES.MOTHER, ROLES.SUPER_ADMIN, ROLES.ADMIN],
      },
      {
        name: "Email Blocked",
        path: "/email-blocked",
        icon: <ShieldAlert size={18} />,
        allowedRoles: [ROLES.MOTHER, ROLES.SUPER_ADMIN, ROLES.ADMIN],
      },
    ],
  },
  {
    name: "Agency & Reseller",
    icon: <Building2 size={22} />,
    allowedRoles: [
      ROLES.MOTHER,
      ROLES.SUPER_ADMIN,
      ROLES.ADMIN,
      ROLES.AGENCY,
      ROLES.RESELLER,
    ],
    subItems: [
      {
        name: "Agency List",
        path: "/agencies",
        icon: <Building2 size={18} />,
        allowedRoles: [ROLES.MOTHER, ROLES.SUPER_ADMIN, ROLES.ADMIN],
      },
      {
        name: "Agency Data",
        path: "/agency-data",
        icon: <Users size={18} />,
        allowedRoles: [ROLES.MOTHER, ROLES.SUPER_ADMIN, ROLES.ADMIN],
      },
      {
        name: "Host Approvals",
        path: "/host-approvals",
        icon: <Users size={18} />,
        allowedRoles: [
          ROLES.MOTHER,
          ROLES.SUPER_ADMIN,
          ROLES.ADMIN,
          ROLES.AGENCY,
          ROLES.RESELLER,
        ],
      },
      {
        name: "Support",
        path: "/support",
        icon: <MessageSquare size={18} />,
        allowedRoles: [
          ROLES.MOTHER,
          ROLES.SUPER_ADMIN,
          ROLES.ADMIN,
          ROLES.AGENCY,
          ROLES.RESELLER,
        ],
      },
      {
        name: "Reseller",
        path: "/reseller-coin",
        icon: <Users size={18} />,
        allowedRoles: [ROLES.MOTHER],
      },
    ],
  },
  {
    name: "Coin & Earnings",
    icon: <Coins size={22} />,
    allowedRoles: [ROLES.MOTHER, ROLES.RESELLER],
    subItems: [
      {
        name: "Coin Management",
        path: "/Coin-manage",
        icon: <Coins size={18} />,
        allowedRoles: [ROLES.MOTHER, ROLES.RESELLER],
      },
      {
        name: "Gifting Coin management",
        path: "/gifting-coin-manage",
        icon: <Gift size={18} />,
        allowedRoles: [ROLES.MOTHER, ROLES.RESELLER],
      },
      {
        name: "Withdraw Request",
        path: "/withdraw-manage",
        icon: <Coins size={18} />,
        allowedRoles: [ROLES.MOTHER],
      },
      {
        name: "Recharge Package",
        path: "/recharge-packages",
        icon: <Coins size={18} />,
        allowedRoles: [ROLES.MOTHER],
      },
    ],
  },
  {
    icon: <ShieldCheck size={20} />,
    name: "Admin Management",
    path: "/admin-management",
    allowedRoles: [ROLES.MOTHER],
  },
  {
    name: "System Settings",
    icon: <Settings size={22} />,
    allowedRoles: [ROLES.MOTHER, ROLES.SUPER_ADMIN, ROLES.ADMIN],
    subItems: [

      {
        name: "About Us",
        path: "/about-us",
        icon: <FileText size={18} />,
        allowedRoles: [ROLES.MOTHER],
      },
      {
        name: "Commission Setting",
        path: "/commission-setting",
        icon: <Percent size={18} />,
        allowedRoles: [ROLES.MOTHER],
      },
      {
        name: "Notice Management",
        path: "/notice-management",
        icon: <Bell size={18} />,
        allowedRoles: [ROLES.MOTHER],
      },
      {
        name: "Notification Notice",
        path: "/notification-notice",
        icon: <Bell size={18} />,
        allowedRoles: [ROLES.MOTHER, ROLES.SUPER_ADMIN, ROLES.ADMIN],
      },
      {
        name: "Banner Management",
        path: "/banner-management",
        icon: <ImageIcon size={18} />,
        allowedRoles: [ROLES.MOTHER],
      },

      {
        name: "Agora Sdk",
        path: "/agora-sdk",
        icon: <Settings size={18} />,
        allowedRoles: [ROLES.MOTHER],
      },
    ],
  },
];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, setMobileOpen, isHovered, setIsHovered } =
    useSidebar();
  const { role, loading } = useAuth();
  const location = useLocation();


  const isActive = useCallback(
    (path: string) => location.pathname === path,
    [location.pathname],
  );

  const handleMobileClick = () => {
    if (window.innerWidth < 1024) {
      setMobileOpen(false);
    }
  };

  const canAccess = useCallback(
    (allowedRoles: string[]) => {
      if (role === "mother_panel") return true;
      return role ? allowedRoles.includes(role) : false;
    },
    [role],
  );

  const filteredItems = useMemo(() => {
    if (!role) return [];
    return navItems.filter((item) => canAccess(item.allowedRoles));
  }, [role, canAccess]);

  if (loading || !role) {
    return null;
  }

  return (
    <>
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-[45] lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={`fixed mt-16 lg:mt-0 top-0 left-0 h-screen glass-panel text-gray-800 dark:text-gray-100 transition-all duration-300 z-50 
        ${isExpanded || isMobileOpen || isHovered ? "w-[290px]" : "w-[90px]"}
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
        onMouseEnter={() => !isExpanded && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <Link
          to="/"
          className="p-4 flex items-center gap-3 border-b border-gray-200/50 dark:border-white/[0.08] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        >
          <div className="w-11 h-11 rounded-2xl overflow-hidden shrink-0 bg-white/80 dark:bg-white/5 border border-brand-500/20 p-1 flex items-center justify-center shadow-md shadow-brand-500/10">
            <img src={tiamoLogo} alt="Tiamo Live" className="w-full h-full object-contain" />
          </div>
          {(isExpanded || isHovered || isMobileOpen) && (
            <div className="flex flex-col overflow-hidden whitespace-nowrap">
              <span className="font-extrabold text-brand-500 dark:text-brand-400 text-base tracking-tight">
                Tiamo Live
              </span>
              <span className="text-gray-500 dark:text-gray-400 text-[11px] font-medium tracking-wide uppercase">
                {role === ROLES.MOTHER
                  ? "Mother Panel"
                  : role === ROLES.SUPER_ADMIN
                    ? "Super Admin"
                    : role === ROLES.ADMIN
                      ? "Admin"
                      : role === ROLES.AGENCY
                        ? "Agency"
                        : role === ROLES.RESELLER
                          ? "Reseller"
                          : "User"}
              </span>
            </div>
          )}
        </Link>

        <nav className="py-6 overflow-y-auto h-[calc(100vh-100px)] no-scrollbar">
          <ul className="flex flex-col gap-1">
            {filteredItems.map((item) => (
              <React.Fragment key={item.name}>
                {item.subItems ? (
                  <>
                    {(isExpanded || isHovered || isMobileOpen) && (
                      <li className="px-6 pt-5 pb-2 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {item.name}
                      </li>
                    )}
                    {item.subItems
                      .filter((sub) => canAccess(sub.allowedRoles))
                      .map((sub) => (
                        <li key={sub.name}>
                          <Link
                            to={sub.path}
                            onClick={handleMobileClick}
                            className={`flex items-center gap-4 px-6 py-3 transition-all ${isActive(sub.path)
                                ? "bg-brand-500/10 text-brand-600 dark:text-brand-400 border-r-4 border-brand-500 font-bold"
                                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white"
                              }`}
                          >
                            {sub.icon && (
                              <span className="shrink-0">{sub.icon}</span>
                            )}
                            {(isExpanded || isHovered || isMobileOpen) && (
                              <span className="font-medium text-[15px]">{sub.name}</span>
                            )}
                          </Link>
                        </li>
                      ))}
                  </>
                ) : (
                  <li key={item.name}>
                    <Link
                      to={item.path || "#"}
                      onClick={handleMobileClick}
                      className={`flex items-center gap-4 px-6 py-3 transition-all ${isActive(item.path || "")
                          ? "bg-brand-500/10 text-brand-600 dark:text-brand-400 border-r-4 border-brand-500 font-bold"
                          : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white"
                        }`}
                    >
                      <span className="shrink-0">{item.icon}</span>
                      {(isExpanded || isHovered || isMobileOpen) && (
                        <span className="font-medium text-[15px]">{item.name}</span>
                      )}
                    </Link>
                  </li>
                )}
              </React.Fragment>
            ))}
          </ul>
        </nav>
      </aside>
    </>
  );
};

export default AppSidebar;
