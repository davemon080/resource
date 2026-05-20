import { useState, useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/auth_context';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

export default function AuthGuard() {
  const { user, loading } = useAuth();
  const [showSlowMessage, setShowSlowMessage] = useState(false);

  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => setShowSlowMessage(true), 12000);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 p-6">
        <Loader2 className="w-10 h-10 animate-spin text-zinc-900 mb-4" />
        {showSlowMessage && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-3"
          >
            <p className="text-zinc-600 font-medium">Starting up training platform...</p>
            <p className="text-xs text-zinc-400 max-w-xs leading-relaxed">
              This might take a moment if the database is waking up. 
              <br />If it stays stuck, please refresh the page.
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              Retry Connection
            </Button>
          </motion.div>
        )}
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
