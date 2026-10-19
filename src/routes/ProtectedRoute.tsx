import { Navigate } from 'react-router';
import { useAuth } from '../lib/AuthProvider';

export const ROLES = {
  MOTHER: 'mother_panel',
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  AGENCY: 'agency',
  RESELLER: 'reseller'
};

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { user, role, loading } = useAuth();

  if (loading) return null;

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (role === ROLES.MOTHER) {
    return <>{children}</>;
  }

  if (!role || !allowedRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
