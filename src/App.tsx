import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router";
import { ScrollToTop } from "./components/common/ScrollToTop";
import AppLayout from "./layout/AppLayout";

import NotFound from "./pages/OtherPage/NotFound";
import Home from "./pages/Dashboard/Home";
import UserProfile from "./pages/UserProfile/UserProfile";
import UserList from "./pages/UserList/UserList";
import AllHosts from "./pages/AllHosts/AllHosts";
import GiftingManager from "./pages/Gifting/GiftingManager";
import EmojiManager from "./pages/Emoji/EmojiManager";
import IdEntryManager from "./pages/IdEntry/IdEntryManager";
import FrameManager from "./pages/Frame/FrameManager";
import CoinManager from "./pages/CoinManage/CoinManager";
import GiftingCoinManager from "./pages/CoinManage/GiftingCoinManager";
import RechargePackageManager from "./pages/CoinManage/RechargePackageManager";
import LevelBadgeManager from "./pages/LevelBadgeManage/LevelBadgeManager";
import UserLevelManager from "./pages/UserLevelManage/UserLevelManager";
import PackageManager from "./pages/Packages/PackageManager";
import PackagePurchase from "./pages/Packages/PackagePurchase";
import AgencyManager from "./pages/Agency/AgencyManager";
import AgencyDetails from "./pages/Agency/AgencyDetails";
import AgencyApplications from "./pages/Agency/AgencyApplications";
import HostApprovals from "./pages/Agency/HostApprovals";
import ResellerCoinManager from "./pages/Agency/ResellerCoinManager";
import AgencyData from "./pages/Agency/AgencyData";
import ThemeManager from "./pages/ThemeManager/ThemeManager";
import RoomSkinManager from "./pages/RoomThemeManage/RoomSkinManager";
import AboutUsManager from "./pages/AboutUs/AboutUsManager";
import BannerManager from "./pages/BannerManagement/BannerManager";
import LiveModerator from "./pages/BoardManager/LiveModerator";
import ModeratorManager from "./pages/Moderator/ModeratorManager";
import AudioRoomList from "./pages/BoardManager/AudioBoard/AudioRoomList";
import VideoLiveList from "./pages/BoardManager/VideoBoard/VideoLiveList";
import Support from "./pages/Support/Support";
import AgoraManager from "./pages/AgoraSdk/AgoraManager";
import { useAuth } from "./lib/AuthProvider";
import SignIn from "./AuthPage/SignIn";
import { ProtectedRoute, ROLES } from "./routes/ProtectedRoute";
import AdminManagement from "./pages/AdminManagement/AdminManagement";
import CoinSupplier from "./pages/CoinSupplier/CoinSupplier";
import WithdrawManager from "./pages/WithdrawManage/WithdrawManager";
import NoticeManager from "./pages/Notice/NoticeManager";
import NotificationNoticeManager from "./pages/Notice/NotificationNoticeManager";
import CommissionManager from "./pages/Commission/CommissionManager";
import DeviceBannedManager from "./pages/DeviceBanned/DeviceBannedManager";
import EmailBlockedManager from "./pages/EmailBlocked/EmailBlockedManager";
import InboxManager from "./pages/Inbox/InboxManager";
import SocialPostManager from "./pages/SocialPost/SocialPostManager";

export default function App() {
  const { user, loading } = useAuth();

  if (loading) return null;

  return (
    <Router>
      <ScrollToTop />
      <Routes>
        {!user ? (
          <>
            <Route path="/" element={<SignIn />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        ) : (
          <>
            <Route element={<AppLayout />}>
              <Route index path="/" element={<Home />} />

              <Route path="/admin-management" element={
                <ProtectedRoute allowedRoles={[ROLES.MOTHER]}>
                  <AdminManagement />
                </ProtectedRoute>
              } />

              <Route path="/inbox" element={
                <ProtectedRoute allowedRoles={[ROLES.MOTHER, ROLES.SUPER_ADMIN, ROLES.ADMIN]}>
                  <InboxManager />
                </ProtectedRoute>
              } />

              <Route path="/social-posts" element={
                <ProtectedRoute allowedRoles={[ROLES.MOTHER, ROLES.SUPER_ADMIN, ROLES.ADMIN]}>
                  <SocialPostManager />
                </ProtectedRoute>
              } />

              <Route path="/users" element={
                <ProtectedRoute allowedRoles={[ROLES.MOTHER]}>
                  <UserList />
                </ProtectedRoute>
              } />

              <Route path="/all-hosts" element={
                <ProtectedRoute allowedRoles={[ROLES.MOTHER]}>
                  <AllHosts />
                </ProtectedRoute>
              } />

              <Route path="/user-levels" element={
                <ProtectedRoute allowedRoles={[ROLES.MOTHER]}>
                  <UserLevelManager />
                </ProtectedRoute>
              } />

              <Route path="/user/:id" element={
                <ProtectedRoute allowedRoles={[ROLES.MOTHER, ROLES.SUPER_ADMIN, ROLES.ADMIN]}>
                  <UserProfile />
                </ProtectedRoute>
              } />

              <Route path="/gifts" element={
                <ProtectedRoute allowedRoles={[ROLES.MOTHER]}>
                  <GiftingManager />
                </ProtectedRoute>
              } />

              <Route path="/emojis" element={
                <ProtectedRoute allowedRoles={[ROLES.MOTHER]}>
                  <EmojiManager />
                </ProtectedRoute>
              } />

              <Route path="/id-entry" element={
                <ProtectedRoute allowedRoles={[ROLES.MOTHER]}>
                  <IdEntryManager />
                </ProtectedRoute>
              } />

              <Route path="/frames" element={
                <ProtectedRoute allowedRoles={[ROLES.MOTHER]}>
                  <FrameManager />
                </ProtectedRoute>
              } />

              <Route path="/Coin-manage" element={
                <ProtectedRoute allowedRoles={[ROLES.MOTHER, ROLES.RESELLER]}>
                  <CoinManager />
                </ProtectedRoute>
              } />

              <Route path="/recharge-packages" element={
                <ProtectedRoute allowedRoles={[ROLES.MOTHER]}>
                  <RechargePackageManager />
                </ProtectedRoute>
              } />

              <Route path="/withdraw-manage" element={
                <ProtectedRoute allowedRoles={[ROLES.MOTHER]}>
                  <WithdrawManager />
                </ProtectedRoute>
              } />

              <Route path="/gifting-coin-manage" element={
                <ProtectedRoute allowedRoles={[ROLES.MOTHER, ROLES.RESELLER]}>
                  <GiftingCoinManager />
                </ProtectedRoute>
              } />

              <Route path="/level-badge-manage" element={
                <ProtectedRoute allowedRoles={[ROLES.MOTHER]}>
                  <LevelBadgeManager />
                </ProtectedRoute>
              } />

              <Route path="/royal-package" element={
                <ProtectedRoute allowedRoles={[ROLES.MOTHER]}>
                  <PackageManager categoryName="Royal Package" />
                </ProtectedRoute>
              } />

              <Route path="/royal-purchase" element={
                <ProtectedRoute allowedRoles={[ROLES.MOTHER]}>
                  <PackagePurchase categoryName="Royal Package" />
                </ProtectedRoute>
              } />

              <Route path="/king-package" element={
                <ProtectedRoute allowedRoles={[ROLES.MOTHER]}>
                  <PackageManager categoryName="King Package" />
                </ProtectedRoute>
              } />

              <Route path="/king-purchase" element={
                <ProtectedRoute allowedRoles={[ROLES.MOTHER]}>
                  <PackagePurchase categoryName="King Package" />
                </ProtectedRoute>
              } />

              <Route path="/crown-package" element={
                <ProtectedRoute allowedRoles={[ROLES.MOTHER]}>
                  <PackageManager categoryName="Crown Package" />
                </ProtectedRoute>
              } />

              <Route path="/crown-purchase" element={
                <ProtectedRoute allowedRoles={[ROLES.MOTHER]}>
                  <PackagePurchase categoryName="Crown Package" />
                </ProtectedRoute>
              } />

              <Route path="/queen-package" element={
                <ProtectedRoute allowedRoles={[ROLES.MOTHER]}>
                  <PackageManager categoryName="Queen Package" />
                </ProtectedRoute>
              } />

              <Route path="/queen-purchase" element={
                <ProtectedRoute allowedRoles={[ROLES.MOTHER]}>
                  <PackagePurchase categoryName="Queen Package" />
                </ProtectedRoute>
              } />

              <Route path="/vip-package" element={
                <ProtectedRoute allowedRoles={[ROLES.MOTHER]}>
                  <PackageManager categoryName="Vip Package" />
                </ProtectedRoute>
              } />

              <Route path="/vip-purchase" element={
                <ProtectedRoute allowedRoles={[ROLES.MOTHER]}>
                  <PackagePurchase categoryName="Vip Package" />
                </ProtectedRoute>
              } />

              <Route path="/vvip-package" element={
                <ProtectedRoute allowedRoles={[ROLES.MOTHER]}>
                  <PackageManager categoryName="Vvip Package" />
                </ProtectedRoute>
              } />

              <Route path="/vvip-purchase" element={
                <ProtectedRoute allowedRoles={[ROLES.MOTHER]}>
                  <PackagePurchase categoryName="Vvip Package" />
                </ProtectedRoute>
              } />

              <Route path="/room-skins" element={
                <ProtectedRoute allowedRoles={[ROLES.MOTHER, ROLES.SUPER_ADMIN, ROLES.ADMIN]}>
                  <RoomSkinManager />
                </ProtectedRoute>
              } />

              <Route path="/room-skin-purchase" element={
                <ProtectedRoute allowedRoles={[ROLES.MOTHER, ROLES.SUPER_ADMIN, ROLES.ADMIN]}>
                  <PackagePurchase categoryName="RoomSkin" />
                </ProtectedRoute>
              } />

              <Route path="/agencies" element={
                <ProtectedRoute allowedRoles={[ROLES.MOTHER, ROLES.SUPER_ADMIN, ROLES.ADMIN]}>
                  <AgencyManager />
                </ProtectedRoute>
              } />

              <Route path="/agency-data" element={
                <ProtectedRoute allowedRoles={[ROLES.MOTHER, ROLES.SUPER_ADMIN, ROLES.ADMIN]}>
                  <AgencyData />
                </ProtectedRoute>
              } />

              <Route path="/agency-applications" element={
                <ProtectedRoute allowedRoles={[ROLES.MOTHER, ROLES.SUPER_ADMIN, ROLES.ADMIN]}>
                  <AgencyApplications />
                </ProtectedRoute>
              } />

              <Route path="/agency/:id" element={
                <ProtectedRoute allowedRoles={[ROLES.MOTHER, ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.AGENCY]}>
                  <AgencyDetails />
                </ProtectedRoute>
              } />

              <Route path="/host-approvals" element={
                <ProtectedRoute allowedRoles={[ROLES.MOTHER, ROLES.SUPER_ADMIN, ROLES.ADMIN]}>
                  <HostApprovals />
                </ProtectedRoute>
              } />

              <Route path="/reseller-coin" element={
                <ProtectedRoute allowedRoles={[ROLES.MOTHER]}>
                  <ResellerCoinManager />
                </ProtectedRoute>
              } />

              <Route path="/theme-upload" element={
                <ProtectedRoute allowedRoles={[ROLES.MOTHER]}>
                  <ThemeManager />
                </ProtectedRoute>
              } />

              <Route path="/about-us" element={
                <ProtectedRoute allowedRoles={[ROLES.MOTHER]}>
                  <AboutUsManager />
                </ProtectedRoute>
              } />

              <Route path="/coin-supplier" element={
                <ProtectedRoute allowedRoles={[ROLES.MOTHER]}>
                  <CoinSupplier />
                </ProtectedRoute>
              } />

              <Route path="/banner-management" element={
                <ProtectedRoute allowedRoles={[ROLES.MOTHER]}>
                  <BannerManager />
                </ProtectedRoute>
              } />

              <Route path="/agora-sdk" element={
                <ProtectedRoute allowedRoles={[ROLES.MOTHER]}>
                  <AgoraManager />
                </ProtectedRoute>
              } />

              <Route path="/notice-management" element={
                <ProtectedRoute allowedRoles={[ROLES.MOTHER]}>
                  <NoticeManager />
                </ProtectedRoute>
              } />

              <Route path="/notification-notice" element={
                <ProtectedRoute allowedRoles={[ROLES.MOTHER, ROLES.SUPER_ADMIN, ROLES.ADMIN]}>
                  <NotificationNoticeManager />
                </ProtectedRoute>
              } />

              <Route path="/commission-setting" element={
                <ProtectedRoute allowedRoles={[ROLES.MOTHER]}>
                  <CommissionManager />
                </ProtectedRoute>
              } />

              <Route path="/audio-board" element={
                <ProtectedRoute allowedRoles={[ROLES.MOTHER, ROLES.SUPER_ADMIN, ROLES.ADMIN]}>
                  <AudioRoomList />
                </ProtectedRoute>
              } />

              <Route path="/device-banned" element={
                <ProtectedRoute allowedRoles={[ROLES.MOTHER, ROLES.SUPER_ADMIN, ROLES.ADMIN]}>
                  <DeviceBannedManager />
                </ProtectedRoute>
              } />

              <Route path="/email-blocked" element={
                <ProtectedRoute allowedRoles={[ROLES.MOTHER, ROLES.SUPER_ADMIN, ROLES.ADMIN]}>
                  <EmailBlockedManager />
                </ProtectedRoute>
              } />

              <Route path="/video-board" element={
                <ProtectedRoute allowedRoles={[ROLES.MOTHER, ROLES.SUPER_ADMIN, ROLES.ADMIN]}>
                  <VideoLiveList />
                </ProtectedRoute>
              } />

              <Route path="/moderator-management" element={
                <ProtectedRoute allowedRoles={[ROLES.MOTHER, ROLES.SUPER_ADMIN, ROLES.ADMIN]}>
                  <ModeratorManager />
                </ProtectedRoute>
              } />

              <Route path="/live-moderate/:mode/:roomId" element={
                <ProtectedRoute allowedRoles={[ROLES.MOTHER, ROLES.SUPER_ADMIN, ROLES.ADMIN]}>
                  <LiveModerator />
                </ProtectedRoute>
              } />

              <Route path="/support" element={
                <ProtectedRoute allowedRoles={[ROLES.MOTHER, ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.AGENCY, ROLES.RESELLER]}>
                  <Support />
                </ProtectedRoute>
              } />
            </Route>

            <Route path="/signin" element={<Navigate to="/" replace />} />
            <Route path="*" element={<NotFound />} />
          </>
        )}
      </Routes>
    </Router>
  );
}
