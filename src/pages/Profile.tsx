import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth_context';
import { apiService } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Camera, User as UserIcon, Lock, Mail, CheckCircle2, ShieldCheck, Eye, EyeOff, Download, Play, FileText, Trash2, CloudOff } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { useLiveQuery } from 'dexie-react-hooks';
import { offlineDb } from '@/lib/offline-db';
import { useUserProgress } from '@/hooks/useUserProgress';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';

export default function Profile() {
  const { user, login } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [photoUrl, setPhotoUrl] = useState(user?.photoUrl || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      setPhotoUrl(user.photoUrl || '');
      
      // Sync from backend to get latest info
      async function syncData() {
        try {
          const data = await apiService.getUser(user.id);
          if (data.displayName) setDisplayName(data.displayName);
          if (data.photoUrl) setPhotoUrl(data.photoUrl);
        } catch (err) {
          console.error("Error fetching user data:", err);
        }
      }
      syncData();
    }
  }, [user?.id]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        toast.error('Image size must be less than 2MB');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setPhotoUrl(base64String);
        toast.success('Photo uploaded locally. Click "Save Changes" to persist.');
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      // Sync to Backend
      await apiService.updateProfile(user.id, {
        displayName: displayName,
        photoUrl: photoUrl
      });

      // Update local state in context
      const updatedUser = { ...user, displayName, photoUrl };
      const token = localStorage.getItem('auth_token') || '';
      login(token, updatedUser);

      toast.success('Profile updated successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setPasswordLoading(true);
    try {
      await apiService.updatePassword(user.id, newPassword);
      toast.success('Password updated successfully!');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update password');
    } finally {
      setPasswordLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      <header className="space-y-1">
        <h2 className="text-3xl font-black tracking-tighter text-zinc-900">Account Settings</h2>
        <p className="text-zinc-500 font-medium text-lg">Manage your profile and security preferences.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Profile Sidebar */}
        <div className="space-y-6">
          <Card className="border-zinc-100 shadow-sm overflow-hidden text-center">
            <div className="h-24 bg-zinc-900 w-full" />
            <CardContent className="pt-0 flex flex-col items-center -mt-12">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/*" 
                className="hidden" 
              />
              <div className="relative group cursor-pointer" onClick={triggerFileInput}>
                <Avatar className="w-24 h-24 border-4 border-white shadow-xl relative overflow-visible">
                  <AvatarImage src={photoUrl || ''} alt={displayName} className="object-cover rounded-full" />
                  <AvatarFallback className="bg-zinc-100 text-zinc-400">
                    <UserIcon className="w-10 h-10" />
                  </AvatarFallback>
                </Avatar>
                
                {/* Visual indicator for upload */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity border-4 border-transparent">
                  <Camera className="w-6 h-6 text-white" />
                </div>

                {/* Permanent small camera badge */}
                <div className="absolute bottom-0 right-0 w-7 h-7 bg-zinc-900 rounded-full flex items-center justify-center border-2 border-white shadow-md">
                  <Camera className="w-3.5 h-3.5 text-white" />
                </div>
              </div>
              <div className="mt-4 space-y-1">
                <h3 className="font-bold text-xl text-zinc-900">{displayName || 'Student'}</h3>
                <p className="text-zinc-500 text-sm flex items-center justify-center gap-1">
                  <Mail className="w-3 h-3" />
                  {user.email}
                </p>
              </div>
            </CardContent>
            <CardFooter className="bg-zinc-50 border-t border-zinc-100 p-4 flex justify-around">
              <div className="text-center">
                <div className="text-xs font-black uppercase text-zinc-400 tracking-widest">Status</div>
                <div className="flex items-center gap-1 text-green-600 font-bold text-sm">
                  <CheckCircle2 className="w-3 h-3" />
                  Active
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs font-black uppercase text-zinc-400 tracking-widest">Tier</div>
                <div className="text-zinc-900 font-bold text-sm">Nexlify Pro</div>
              </div>
            </CardFooter>
          </Card>

          <Card className="border-zinc-100 shadow-sm bg-zinc-900 text-white">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-zinc-400" />
                Security Badge
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-zinc-400 leading-relaxed font-medium">
              Your account is protected by enterprise-grade security. Last login detected from your work portal.
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="md:col-span-2 space-y-8">
          {/* Profile Form */}
          <Card className="border-zinc-100 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-bold">Personal Information</CardTitle>
              <CardDescription>Update your public identity on the platform.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="displayName" className="font-bold text-zinc-700">Full Name</Label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                    <Input 
                      id="displayName" 
                      placeholder="Your Full Name" 
                      className="pl-10"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                    />
                  </div>
                </div>
                <Button type="submit" disabled={loading} className="font-bold px-8 h-10">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Password Form */}
          <Card className="border-zinc-100 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-bold">Change Password</CardTitle>
              <CardDescription>We recommend using a strong, unique password.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdatePassword} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword" className="font-bold text-zinc-700">New Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                      <Input 
                        id="newPassword" 
                        type={showPassword ? "text" : "password"} 
                        className="pl-10 pr-10"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-600 transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="font-bold text-zinc-700">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                      <Input 
                        id="confirmPassword" 
                        type={showPassword ? "text" : "password"} 
                        className="pl-10 pr-10"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-600 transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>
                <Button type="submit" variant="secondary" disabled={passwordLoading} className="font-bold px-8 h-10">
                  {passwordLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update Password
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Offline Downloads Section */}
      <OfflineDownloads />
    </div>
  );
}

function OfflineDownloads() {
  const { modules } = useUserProgress();
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

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

  const offlineResources = useLiveQuery(() => 
    offlineDb.resources.toArray()
  );

  if (!offlineResources || offlineResources.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
          <Download className="w-5 h-5" />
          Offline Downloads
        </h3>
        {!isOnline && (
          <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
            <CloudOff className="w-3 h-3 mr-1" /> Offline Mode
          </Badge>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {offlineResources.map((res) => {
          const module = modules.find(m => m.id === res.moduleId);
          if (!module) return null;

          return (
            <Card key={res.id} className="border-zinc-200 shadow-sm hover:border-zinc-300 transition-all">
              <CardHeader className="p-4 flex flex-row items-center gap-3 space-y-0 text-left">
                <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0">
                  {res.type === 'video' ? <Play className="w-5 h-5 text-zinc-500" /> : <FileText className="w-5 h-5 text-zinc-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-sm font-bold truncate">{module.title}</CardTitle>
                  <CardDescription className="text-[10px] uppercase font-medium">
                    {res.type.toUpperCase()} • {(res.size / 1024 / 1024).toFixed(1)} MB
                  </CardDescription>
                </div>
              </CardHeader>
              <CardFooter className="p-4 pt-0 flex gap-2">
                <Button 
                  size="sm" 
                  className="flex-1 h-8 text-xs font-bold"
                  onClick={() => navigate(`/modules/${res.moduleId}`)}
                >
                  Open
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  className="h-8 px-2 text-zinc-400 hover:text-red-600 hover:border-red-200"
                  onClick={() => offlineDb.resources.delete(res.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
