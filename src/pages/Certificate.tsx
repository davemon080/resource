import { useUserProgress } from '@/hooks/useUserProgress';
import { Button } from '@/components/ui/button';
import { Award, Download, Share2, ShieldCheck, Printer } from 'lucide-react';
import { motion } from 'framer-motion';
import { Navigate, useNavigate } from 'react-router-dom';

export default function Certificate() {
  const { progress, modules, loading } = useUserProgress();
  const navigate = useNavigate();

  if (loading) return null;

  if (!progress?.completed) {
    const totalModules = modules.length;
    const completedModules = progress?.unlockedModuleIndex ?? 0;
    const progressPercent = totalModules > 0 ? (completedModules / totalModules) * 100 : 0;

    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-8 lg:p-12 min-h-[60vh] flex flex-col items-center justify-center text-center space-y-8">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-24 h-24 bg-zinc-100 rounded-full flex items-center justify-center relative"
        >
          <Award className="w-12 h-12 text-zinc-300" />
          <div className="absolute inset-0 border-4 border-zinc-200 border-t-zinc-900 rounded-full animate-spin-slow" />
        </motion.div>
        
        <div className="space-y-3">
          <h2 className="text-3xl font-black text-zinc-900">Certificate Locked</h2>
          <p className="text-zinc-500 max-w-sm mx-auto">
            You need to complete all modules in the Nexlify training program to unlock your official certificate.
          </p>
        </div>

        <div className="w-full max-w-xs space-y-4">
          <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-zinc-400">
            <span>Progress</span>
            <span>{completedModules} / {totalModules} Modules</span>
          </div>
          <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              className="h-full bg-zinc-900" 
            />
          </div>
          <Button onClick={() => navigate("/")} variant="outline" className="w-full font-bold">
            Continue Learning
          </Button>
        </div>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  const completionDate = progress.completedAt 
    ? new Date(progress.completedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 overflow-hidden print:hidden">
        <div className="space-y-1">
          <h2 className="text-3xl font-black tracking-tight text-zinc-900">Your Certificate</h2>
          <p className="text-zinc-500">You've earned it! Download or share your achievement.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={handlePrint}>
            <Printer className="w-4 h-4" /> Print
          </Button>
          <Button className="gap-2 shadow-lg shadow-zinc-200">
            <Download className="w-4 h-4" /> Download PDF
          </Button>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative bg-white border-[16px] border-zinc-100 p-8 sm:p-16 lg:p-24 shadow-2xl max-w-4xl mx-auto overflow-hidden print:border-none print:shadow-none print:p-0"
      >
        {/* Certificate Background Elements */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-zinc-50 rounded-full -ml-32 -mt-32 border border-zinc-100" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-zinc-50 rounded-full -mr-48 -mb-48 border border-zinc-100" />
        
        {/* Decorative Inner Border */}
        <div className="absolute inset-4 border-2 border-zinc-200 rounded-sm pointer-events-none" />

        <div className="relative space-y-12 text-center">
          {/* Header */}
          <div className="space-y-6 flex flex-col items-center">
            <div className="w-20 h-20 bg-zinc-900 rounded-2xl flex items-center justify-center transform rotate-12 shadow-xl mb-4">
              <span className="text-white font-bold text-4xl">N</span>
            </div>
            <div>
              <h1 className="text-sm font-bold uppercase tracking-[0.5em] text-zinc-400 mb-2">Certificate of Completion</h1>
              <div className="h-px w-24 bg-zinc-200 mx-auto" />
            </div>
          </div>

          {/* Main Content */}
          <div className="space-y-4">
            <p className="text-zinc-500 font-medium italic serif">This is to certify that</p>
            <h2 className="text-4xl sm:text-6xl font-black tracking-tighter text-zinc-900 capitalize">
              {progress.displayName}
            </h2>
            <div className="max-w-lg mx-auto pt-6">
              <p className="text-zinc-600 leading-relaxed">
                has successfully completed the comprehensive training program in <br/>
                <span className="font-bold text-zinc-900">Nexlify Full Stack & Innovation Mastery</span>
              </p>
            </div>
          </div>

          {/* Verification */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-12 pt-12">
            <div className="flex flex-col items-center space-y-4">
              <div className="w-32 h-px bg-zinc-300" />
              <div className="text-sm">
                <p className="font-bold text-zinc-900">David Simon</p>
                <p className="text-zinc-400 uppercase tracking-widest text-[10px]">Head of Innovation</p>
              </div>
            </div>
            <div className="flex flex-col items-center space-y-4">
              <div className="w-32 h-px bg-zinc-300" />
              <div className="text-sm">
                <p className="font-bold text-zinc-900">{completionDate}</p>
                <p className="text-zinc-400 uppercase tracking-widest text-[10px]">Date of Issuance</p>
              </div>
            </div>
          </div>

          {/* Badge */}
          <div className="pt-8 flex flex-col items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-zinc-900 blur-2xl opacity-10 rounded-full" />
              <div className="w-24 h-24 rounded-full border-4 border-zinc-200 flex items-center justify-center relative bg-white">
                <Award className="w-12 h-12 text-zinc-900" />
              </div>
            </div>
            <div className="flex items-center gap-2 px-4 py-1 bg-zinc-100 rounded-full">
              <ShieldCheck className="w-4 h-4 text-zinc-900" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Verified by Nexlify Innovation</span>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="max-w-4xl mx-auto flex justify-center gap-6 text-zinc-400 py-8 print:hidden">
        <div className="flex items-center gap-2 text-xs font-medium">
          <Share2 className="w-4 h-4" /> Share achievement to LinkedIn
        </div>
      </div>
    </div>
  );
}
