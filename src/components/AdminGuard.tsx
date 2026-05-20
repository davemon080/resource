import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/auth_context';
import { apiService } from '@/services/api';
import { Loader2 } from 'lucide-react';

const ADMIN_EMAILS = ['davemon080@gmail.com', 'daveimagodei@gmail.com', 'simonodavido@gmail.com'];

export default function AdminGuard() {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAdmin() {
      if (authLoading) return;

      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      // Check for hardcoded emails first
      if (ADMIN_EMAILS.includes(user.email)) {
        setIsAdmin(true);
        setLoading(false);
        return;
      }

      // Then check admins table via backend API
      try {
        const isAdminResponse = await apiService.checkAdmin(user.email || '');
        setIsAdmin(isAdminResponse);
      } catch (err) {
        console.error("Error checking admin status:", err);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    }

    checkAdmin();
  }, [user, authLoading]);

  if (loading || authLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-zinc-50">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-900" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
