import { SidebarProvider, useSidebar } from "../context/SidebarContext";
import { Outlet } from "react-router";
import AppHeader from "./AppHeader";
import Backdrop from "./Backdrop";
import AppSidebar from "./AppSidebar";

const LayoutContent: React.FC = () => {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();

  return (
    <div className="relative min-h-screen xl:flex bg-[#FCFBF7] dark:bg-[#070509] text-gray-900 dark:text-gray-100 overflow-hidden transition-colors duration-500">
      {/* Decorative Premium Glow Blobs */}
      <div 
        className="absolute top-[-100px] left-[15%] w-[450px] h-[450px] bg-rose-500/10 dark:bg-rose-500/15 rounded-full blur-[100px] pointer-events-none -z-10 animate-pulse" 
        style={{ animationDuration: '10s' }} 
      />
      <div 
        className="absolute bottom-[20%] right-[10%] w-[550px] h-[550px] bg-rose-500/10 dark:bg-rose-500/10 rounded-full blur-[130px] pointer-events-none -z-10 animate-pulse" 
        style={{ animationDuration: '15s' }} 
      />
      <div 
        className="absolute top-[35%] right-[-50px] w-[350px] h-[350px] bg-pink-500/5 dark:bg-purple-900/10 rounded-full blur-[90px] pointer-events-none -z-10" 
      />

      <div>
        <AppSidebar />
        <Backdrop />
      </div>
      <div
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out ${
          isExpanded || isHovered ? "lg:ml-[290px]" : "lg:ml-[90px]"
        } ${isMobileOpen ? "ml-0" : ""}`}
      >
        <AppHeader />
        <main className="flex-1 p-4 mx-auto w-full max-w-(--breakpoint-2xl) md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

const AppLayout: React.FC = () => {
  return (
    <SidebarProvider>
      <LayoutContent />
    </SidebarProvider>
  );
};

export default AppLayout;
