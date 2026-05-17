import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUserProgress } from '@/hooks/useUserProgress';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronLeft, PlayCircle, FileText, CheckCircle2, Lock, AlertCircle, Download, CloudOff, Trash2, Loader2 } from 'lucide-react';
import { ModuleType } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useOfflineResource } from '@/hooks/useOfflineResource';
import ReactPlayer from 'react-player';

const Player = ReactPlayer as any;

export default function VideoDetails() {
  const { moduleId } = useParams();
  const navigate = useNavigate();
  const { progress, modules, loading, updateProgress } = useUserProgress();
  const [videoFinished, setVideoFinished] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const currentModuleIndex = modules.findIndex(m => m.id === moduleId);
  const currentModule = modules[currentModuleIndex];
  
  const videoOffline = useOfflineResource(moduleId ?? '', 'video');
  const pdfOffline = useOfflineResource(moduleId ?? '', 'pdf');

  useEffect(() => {
    setVideoFinished(false);
    setIsVideoLoading(false); // Default to false until we know we have a source
    setVideoError(null);
    setHasStarted(false);
  }, [moduleId]);

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

  const [videoSrc, setVideoSrc] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (currentModule?.type === ModuleType.VIDEO) {
      if (videoOffline.isDownloaded && videoOffline.resource) {
        const url = URL.createObjectURL(videoOffline.resource.blob);
        setVideoSrc(url);
        return () => {
          URL.revokeObjectURL(url);
          setVideoSrc(undefined);
        };
      } else {
        setVideoSrc(currentModule.videoUrl);
      }
    }
  }, [currentModule?.id, currentModule?.type, currentModule?.videoUrl, videoOffline.isDownloaded, videoOffline.resource]);
  
  const isLocked = currentModuleIndex > (progress?.unlockedModuleIndex ?? 0);
  const isCompleted = currentModuleIndex < (progress?.unlockedModuleIndex ?? 0);

  useEffect(() => {
    if (!loading && isLocked) {
      toast.error('This module is locked!');
      navigate('/');
    }
  }, [loading, isLocked, navigate]);

  const handleVideoEnded = () => {
    setVideoFinished(true);
    toast.success('Module completed! You can now proceed to the next one.');
  };

  const handleCompleteModule = async () => {
    await updateProgress(currentModuleIndex + 1);
    navigate('/');
  };

  if (loading || !currentModule) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-zinc-200 rounded-full" />
          <div className="h-4 w-32 bg-zinc-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Button 
        variant="ghost" 
        className="mb-6 gap-2 text-zinc-500 hover:text-zinc-900"
        onClick={() => navigate('/')}
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Dashboard
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl ring-1 ring-zinc-900/10"
          >
            {currentModule.type === ModuleType.VIDEO ? (
              <div className="w-full h-full relative group bg-zinc-950">
                <AnimatePresence mode="wait">
                  {videoError && (
                    <motion.div 
                      key="error"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-zinc-900 text-center p-6"
                    >
                      <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                      <h4 className="text-white font-bold text-xl mb-2">Failed to load video</h4>
                      <p className="text-zinc-400 text-sm max-w-xs mb-6">{videoError}</p>
                      <Button variant="secondary" onClick={() => window.location.reload()}>
                        Retry Connection
                      </Button>
                    </motion.div>
                  )}

                  {hasStarted && !videoSrc && !isVideoLoading && !videoError && (
                    <motion.div 
                      key="no-content"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-zinc-900 text-center p-6"
                    >
                      <AlertCircle className="w-12 h-12 text-amber-500 mb-4" />
                      <h4 className="text-white font-bold text-xl mb-2">No Video Content</h4>
                      <p className="text-zinc-400 text-sm max-w-xs">This module's video source is missing or invalid.</p>
                    </motion.div>
                  )}

                  {isVideoLoading && hasStarted && !videoError && (
                    <motion.div 
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-zinc-900/80 backdrop-blur-sm"
                    >
                      <Loader2 className="w-10 h-10 animate-spin text-white mb-4" />
                      <p className="text-white font-bold text-sm uppercase tracking-widest text-center">Buffering Content...</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="absolute inset-0 w-full h-full">
                  <Player
                    url={videoSrc}
                    controls
                    width="100%"
                    height="100%"
                    playing={hasStarted}
                    onReady={() => {
                      if (hasStarted) setIsVideoLoading(false);
                    }}
                    onStart={() => {
                      setHasStarted(true);
                      setIsVideoLoading(false);
                    }}
                    onError={(e: any) => {
                      // Only show error if we have a source but it failed
                      if (videoSrc) {
                        console.error("Player error:", e);
                        setIsVideoLoading(false);
                        setVideoError("The video could not be loaded. Please check the source URL or your connection.");
                      } else {
                        setIsVideoLoading(false);
                      }
                    }}
                    onEnded={handleVideoEnded}
                    config={{
                      file: {
                        attributes: {
                          controlsList: 'nodownload',
                          style: { width: '100%', height: '100%', objectFit: 'contain' }
                        }
                      }
                    }}
                  />
                </div>

                {!hasStarted && (
                  <div 
                    className="absolute inset-0 z-50 cursor-pointer group bg-zinc-900 flex items-center justify-center transition-opacity"
                    onClick={() => {
                      if (videoSrc) {
                        setHasStarted(true);
                        setIsVideoLoading(true);
                      } else {
                        setHasStarted(true);
                        setIsVideoLoading(false);
                      }
                    }}
                  >
                    {currentModule.thumbnailUrl && (
                      <img 
                        src={currentModule.thumbnailUrl} 
                        alt="" 
                        className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity"
                      />
                    )}
                    <div className="relative z-10 w-24 h-24 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 group-hover:scale-110 group-hover:bg-white/20 transition-all duration-300">
                      <PlayCircle className="w-12 h-12 text-white fill-white/20 group-hover:fill-white transition-all" />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-50 border-2 border-dashed border-zinc-200 p-12 text-center">
                <FileText className="w-20 h-20 text-zinc-400 mb-4" />
                <h3 className="text-xl font-bold mb-2">Resource Document</h3>
                <p className="text-zinc-500 mb-8 max-w-sm">Review the materials in this PDF to complete the module.</p>
                <div className="flex gap-3">
                  <Button 
                    size="lg" 
                    className="gap-2"
                    onClick={() => {
                      if (pdfOffline.isDownloaded && pdfOffline.resource) {
                        const url = URL.createObjectURL(pdfOffline.resource.blob);
                        window.open(url, '_blank');
                        // No revokeObjectURL here as it opens in new tab, 
                        // browser handles or it leaks once. 
                        // Better to use a viewer but for now simple download.
                      } else {
                        window.open(currentModule.pdfUrl, '_blank');
                      }
                      setVideoFinished(true);
                    }}
                  >
                    {pdfOffline.isDownloaded ? 'View PDF Offline' : 'View PDF'}
                  </Button>
                </div>
              </div>
            )}
          </motion.div>

          {!isOnline && (
            <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-center gap-3 text-red-800 animate-pulse">
              <CloudOff className="w-5 h-5 shrink-0" />
              <div className="text-sm font-bold">You are currently offline. Showing cached content.</div>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-zinc-300 text-zinc-500 uppercase tracking-widest text-[10px]">
                    Module {String(currentModuleIndex + 1).padStart(2, '0')}
                  </Badge>
                  {isCompleted && (
                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none flex gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Completed
                    </Badge>
                  )}
                  {((currentModule.type === ModuleType.VIDEO && videoOffline.isDownloaded) || 
                    (currentModule.type === ModuleType.PDF && pdfOffline.isDownloaded)) && (
                    <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none flex gap-1">
                      <Download className="w-3 h-3" /> Offline Ready
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <h2 className="text-3xl font-black tracking-tighter text-zinc-900">{currentModule.title}</h2>
                  
                  {currentModule.type === ModuleType.VIDEO && (
                    <div className="flex gap-2">
                      {videoOffline.isDownloaded ? (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 gap-1.5 text-zinc-500 hover:text-red-600 hover:border-red-200"
                          onClick={() => videoOffline.remove()}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete Cache
                        </Button>
                      ) : (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          disabled={!isOnline || videoOffline.isDownloading}
                          className="h-8 gap-1.5"
                          onClick={() => videoOffline.download(currentModule.videoUrl, currentModule.title)}
                        >
                          {videoOffline.isDownloading ? (
                            <div className="w-3.5 h-3.5 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" />
                          ) : (
                            <Download className="w-3.5 h-3.5" />
                          )}
                          Download Offline
                        </Button>
                      )}
                    </div>
                  )}

                  {currentModule.type === ModuleType.PDF && (
                    <div className="flex gap-2">
                      {pdfOffline.isDownloaded ? (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 gap-1.5 text-zinc-500 hover:text-red-600 hover:border-red-200"
                          onClick={() => pdfOffline.remove()}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete Cache
                        </Button>
                      ) : (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          disabled={!isOnline || pdfOffline.isDownloading}
                          className="h-8 gap-1.5"
                          onClick={() => pdfOffline.download(currentModule.pdfUrl, `${currentModule.title}.pdf`)}
                        >
                          {pdfOffline.isDownloading ? (
                            <div className="w-3.5 h-3.5 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" />
                          ) : (
                            <Download className="w-3.5 h-3.5" />
                          )}
                          Download PDF
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {(videoFinished || isCompleted) && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <Button 
                    size="lg" 
                    className="gap-2 bg-zinc-900 text-white hover:bg-zinc-800 font-bold px-8 shadow-lg shadow-zinc-200"
                    onClick={handleCompleteModule}
                  >
                    Finish Module
                    <CheckCircle2 className="w-4 h-4" />
                  </Button>
                </motion.div>
              )}
            </div>
            
            <p className="text-zinc-600 leading-relaxed text-lg max-w-3xl">
              {currentModule.description}
            </p>
          </div>
        </div>

        {/* Sidebar: Curriculum */}
        <div className="space-y-6">
          <Card className="border-zinc-200 shadow-sm overflow-hidden h-full flex flex-col">
            <CardHeader className="bg-zinc-50 border-b border-zinc-100 py-4">
              <h3 className="font-bold text-zinc-900 flex items-center gap-2">
                Curriculum
                <span className="text-xs font-medium text-zinc-400">({modules.length} Lessons)</span>
              </h3>
            </CardHeader>
            <ScrollArea className="flex-1 min-h-[400px]">
              <div className="p-2 space-y-1">
                {modules.map((m, i) => {
                  const itemLocked = i > (progress?.unlockedModuleIndex ?? 0);
                  const itemCompleted = i < (progress?.unlockedModuleIndex ?? 0);
                  const itemActive = m.id === moduleId;

                  return (
                    <button
                      key={m.id}
                      disabled={itemLocked}
                      onClick={() => navigate(`/modules/${m.id}`)}
                      className={`w-full flex items-start gap-3 p-3 rounded-lg text-left transition-all group ${
                        itemActive ? 'bg-zinc-900 text-white shadow-md shadow-zinc-200 scale-[1.02]' : 
                        itemLocked ? 'opacity-50 cursor-not-allowed' : 
                        'hover:bg-zinc-100'
                      }`}
                    >
                      <div className={`mt-1 shrinking-0 ${itemActive ? 'text-zinc-400' : 'text-zinc-500 group-hover:text-zinc-900 transition-colors'}`}>
                        {itemLocked ? <Lock className="w-4 h-4" /> : 
                         itemCompleted ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : 
                         m.type === ModuleType.VIDEO ? <PlayCircle className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                      </div>
                      <div className="space-y-1">
                        <div className={`text-sm font-bold leading-tight ${itemActive ? 'text-white' : 'text-zinc-900'}`}>
                          {m.title}
                        </div>
                        <div className={`text-[10px] uppercase tracking-wider font-medium ${itemActive ? 'text-zinc-400' : 'text-zinc-400'}`}>
                          Lesson {i + 1} • {m.type === ModuleType.VIDEO ? (m.duration ? `${Math.floor(m.duration / 60)}m` : 'Video') : 'PDF'}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </Card>

          {!videoFinished && !isCompleted && currentModule.type === ModuleType.VIDEO && (
            <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex gap-3 text-amber-800">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <div className="text-xs font-medium leading-relaxed">
                Watch this video to the end to unlock the next module. The "Finish Module" button will appear once completed.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
