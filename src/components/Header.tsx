import { LayoutDashboard, Award, LogOut, User as UserIcon, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth_context';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useUserProgress } from '@/hooks/useUserProgress';

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { progress } = useUserProgress();
  const ADMIN_EMAIL = 'davemon080@gmail.com';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isAdmin = user?.email === ADMIN_EMAIL;

  if (!user || location.pathname === '/login') return null;

  return (
    <header className="border-b border-zinc-100 bg-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <motion.div 
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-1.5 cursor-pointer"
          onClick={() => navigate('/')}
        >
          <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center">
            <img src="https://iili.io/Bp0LZ3Q.jpg" alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
          <span className="font-bold text-zinc-900 tracking-tight">Nexlify Innovation</span>
        </motion.div>

        <nav className="flex items-center gap-2 sm:gap-4">
          <Button
            variant={location.pathname === '/' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => navigate('/')}
            className="gap-2 font-bold"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span className="hidden md:inline">Dashboard</span>
          </Button>
          <Button
            variant={location.pathname === '/certificate' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => navigate('/certificate')}
            className="gap-2 font-bold"
          >
            <Award className="w-4 h-4" />
            <span className="hidden md:inline">Certificate</span>
          </Button>
          <Button
            variant={location.pathname === '/profile' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => navigate('/profile')}
            className="gap-2 font-bold"
          >
            <UserIcon className="w-4 h-4" />
            <span className="hidden md:inline">Profile</span>
          </Button>

          {isAdmin && (
            <Button
              variant={location.pathname === '/admin' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => navigate('/admin')}
              className="gap-2 font-bold bg-zinc-900 text-white hover:bg-zinc-800"
            >
              <ShieldCheck className="w-4 h-4" />
              <span className="hidden md:inline">Admin</span>
            </Button>
          )}
          
          <div className="h-6 w-px bg-zinc-100 mx-1 hidden sm:block" />

          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="h-8 gap-2 bg-zinc-100 text-zinc-900 border-none px-3 hidden xs:flex">
              <UserIcon className="w-3 h-3" />
              <span className="max-w-[100px] truncate">{progress?.displayName?.split(' ')[0] || user.displayName?.split(' ')[0] || 'User'}</span>
            </Badge>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="gap-2 text-zinc-500 hover:text-red-600 hover:bg-red-50 p-2 sm:px-3"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </nav>
      </div>
    </header>
  );
}
