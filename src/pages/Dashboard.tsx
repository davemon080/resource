import { useEffect, useState } from 'react';
import { useUserProgress } from '@/hooks/useUserProgress';
import { seedModules } from '@/lib/seed';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Lock, Play, FileText, CheckCircle2, Award, Download, Trash2, CloudOff, Search, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ModuleType } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useLiveQuery } from 'dexie-react-hooks';
import { offlineDb } from '@/lib/offline-db';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export default function Dashboard() {
  const { progress, modules, loading, error } = useUserProgress();
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    // Redundant seeding removed as it's handled on the server
  }, []);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-6 space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-64 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <p className="text-red-500 font-medium">{error}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  const currentUnlocked = progress?.unlockedModuleIndex ?? 0;
  const completedCount = modules.filter((_, i) => i < currentUnlocked).length;
  const totalCount = modules.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const filteredModules = modules.filter(m => 
    m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Welcome Header */}
      <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 p-8 bg-white rounded-3xl border border-zinc-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-zinc-900" />
        <div className="space-y-2 relative z-10">
          <h2 className="text-4xl font-black tracking-tighter text-zinc-900">
            Keep pushing, {progress?.displayName?.split(' ')[0]}!
          </h2>
          <p className="text-zinc-500 font-medium">
            You've completed <span className="text-zinc-900 font-bold">{completedCount} of {totalCount}</span> modules.
          </p>
        </div>
        
        <div className="w-full lg:w-96 space-y-3 relative z-10">
          <div className="flex justify-between text-xs font-black uppercase tracking-widest text-zinc-900">
            <span>Overall Training Progress</span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          <div className="h-3 w-full bg-zinc-50 rounded-full overflow-hidden border border-zinc-100">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full bg-zinc-900" 
            />
          </div>
        </div>
      </section>

      {/* Search and Modules Grid */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <h3 className="text-xl font-bold text-zinc-900 self-start">Training Modules</h3>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <Input 
              placeholder="Search modules..." 
              className="pl-9 pr-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {filteredModules.length > 0 ? (
          <motion.div 
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            <AnimatePresence mode="popLayout">
              {filteredModules.map((module) => {
                const index = modules.findIndex(m => m.id === module.id);
                const isLocked = index > currentUnlocked;
                const isCompleted = index < currentUnlocked;
                const isCurrent = index === currentUnlocked;

                return (
                  <motion.div 
                    key={module.id} 
                    variants={item}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                  >
                    <Card 
                      className={`group relative overflow-hidden transition-all duration-300 border-zinc-200 shadow-sm h-full flex flex-col ${
                        isLocked ? 'opacity-75 cursor-not-allowed' : 'hover:shadow-md hover:border-zinc-400 cursor-pointer'
                      }`}
                      onClick={() => !isLocked && navigate(`/modules/${module.id}`)}
                    >
                      {/* Thumbnail */}
                      <div className="aspect-video w-full overflow-hidden relative bg-zinc-100">
                        {module.thumbnailUrl ? (
                          <img 
                            src={module.thumbnailUrl} 
                            alt={module.title}
                            className={`w-full h-full object-cover transition-transform duration-500 ${!isLocked && 'group-hover:scale-110'} ${isLocked && 'grayscale'}`}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-zinc-200">
                            {module.type === ModuleType.VIDEO ? <Play className="w-12 h-12 text-zinc-400" /> : <FileText className="w-12 h-12 text-zinc-400" />}
                          </div>
                        )}
                        
                        {/* Overlay */}
                        {isLocked && (
                          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex flex-col items-center justify-center text-white p-4 text-center">
                            <Lock className="w-8 h-8 mb-2" />
                            <span className="text-sm font-bold uppercase tracking-widest">Locked</span>
                          </div>
                        )}

                        {isCompleted && (
                          <div className="absolute top-2 right-2 bg-green-500 text-white p-1.5 rounded-full shadow-lg">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                        )}

                        {!isLocked && (
                          <div className="absolute bottom-2 left-2 flex gap-1">
                            <Badge variant="secondary" className="bg-white/90 backdrop-blur-sm text-zinc-900 border-none shadow-sm">
                              {module.type === ModuleType.VIDEO ? 'Video' : 'PDF'}
                            </Badge>
                            {module.duration && (
                              <Badge variant="secondary" className="bg-white/90 backdrop-blur-sm text-zinc-900 border-none shadow-sm">
                                {Math.floor(module.duration / 60)}m
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>

                      <CardHeader className="p-5 flex-1">
                        <div className="flex justify-between items-start gap-2 mb-2">
                          <span className="text-[10px] font-black text-zinc-300 uppercase tracking-tighter">
                            Module {String(index + 1).padStart(2, '0')}
                          </span>
                        </div>
                        <CardTitle className={`text-lg transition-colors ${isLocked ? 'text-zinc-400' : 'text-zinc-900 line-clamp-1 group-hover:text-zinc-950'}`}>
                          {module.title}
                        </CardTitle>
                        <CardDescription className="line-clamp-2 text-sm leading-relaxed">
                          {module.description}
                        </CardDescription>
                      </CardHeader>

                      <CardContent className="p-5 pt-0">
                        <Button 
                          className="w-full gap-2 font-bold pointer-events-none"
                          disabled={isLocked}
                          variant={isCurrent ? 'default' : 'outline'}
                        >
                          {isCompleted ? 'Review' : isCurrent ? 'Start Now' : 'Locked'}
                          {!isLocked && (module.type === ModuleType.VIDEO ? <Play className="w-3 h-3 fill-current" /> : <FileText className="w-3 h-3" />)}
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-zinc-100 rounded-2xl bg-zinc-50/50">
            <Search className="w-12 h-12 text-zinc-200 mb-4" />
            <h4 className="text-xl font-bold text-zinc-900">No modules found</h4>
            <p className="text-zinc-500">We couldn't find any modules matching "{searchQuery}"</p>
            <Button 
              variant="link" 
              className="mt-2 text-zinc-900 font-bold"
              onClick={() => setSearchQuery('')}
            >
              Clear search
            </Button>
          </div>
        )}
      </section>

      {/* Completion Banner */}
      {progress?.completed && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-zinc-900 text-white p-8 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl overflow-hidden relative"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-zinc-800 rounded-full -mr-32 -mt-32 opacity-20" />
          <div className="text-center md:text-left z-10">
            <h3 className="text-2xl font-bold mb-2">Congratulations! 🎉</h3>
            <p className="text-zinc-400 max-w-md">
              You've completed the entire Nexlify training program. Your certificate is now ready for download.
            </p>
          </div>
          <Button 
            size="lg" 
            variant="secondary"
            className="font-bold gap-2 hover:bg-white transition-colors z-10"
            onClick={() => navigate('/certificate')}
          >
            <Award className="w-5 h-5" />
            Claim Certificate
          </Button>
        </motion.div>
      )}
    </div>
  );
}
