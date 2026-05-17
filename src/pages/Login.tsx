import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '@/services/api';
import { useAuth } from '@/lib/auth_context';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Mail, Lock, Eye, EyeOff, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || (!isLogin && !displayName)) {
      toast.error('Please fill in all fields.');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        const response = await apiService.login({ email, password });
        login(response.token, response.user);
        toast.success('Successfully logged in!');
        if (response.user.email === 'davemon080@gmail.com') {
          navigate('/admin');
        } else {
          navigate('/');
        }
      } else {
        const response = await apiService.signup({ email, password, displayName });
        login(response.token, response.user);
        toast.success('Account created successfully!');
        navigate('/');
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      toast.error(error.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4 bg-zinc-50">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-xl border-zinc-200 overflow-hidden">
          <CardHeader className="space-y-1 text-center bg-zinc-900 text-white py-8">
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 bg-white rounded-2xl overflow-hidden flex items-center justify-center shadow-lg transform -rotate-3 p-1">
                <img src="https://iili.io/Bp0LZ3Q.jpg" alt="Logo" className="w-full h-full object-cover rounded-xl" referrerPolicy="no-referrer" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">Nexlify Student Portal</CardTitle>
            <CardDescription className="text-zinc-400">
              {isLogin ? 'Sign in to access your dashboard' : 'Create an account to start learning'}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 p-6">
            <form onSubmit={handleAuth} className="space-y-4">
              <AnimatePresence mode="wait">
                {!isLogin && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2 overflow-hidden"
                  >
                    <Label htmlFor="displayName">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                      <Input 
                        id="displayName" 
                        placeholder="John Doe" 
                        className="pl-10"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        required={!isLogin} 
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="name@company.com" 
                    className="pl-10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  {isLogin && (
                    <button type="button" className="text-xs text-zinc-500 hover:text-zinc-900 font-medium">
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                  <Input 
                    id="password" 
                    type={showPassword ? "text" : "password"} 
                    className="pl-10 pr-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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
              <Button type="submit" className="w-full h-11 font-bold" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isLogin ? 'Sign In' : 'Create Account'}
              </Button>
            </form>

            <div className="text-center">
              <button 
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-zinc-600 hover:text-zinc-900 font-medium underline underline-offset-4"
              >
                {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
              </button>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4 bg-zinc-50 border-t border-zinc-100 p-6">
            <p className="text-[10px] text-zinc-400 text-center leading-relaxed">
              By continuing, you agree to Nexlify's Terms of Service. 
              Access is restricted to authorized personnel.
            </p>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}
