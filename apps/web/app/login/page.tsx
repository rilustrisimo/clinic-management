"use client";
import { useState } from 'react';
import { Button, Input, Label } from '@clinic/packages-ui';
import { supabase } from '../../lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPwd, setShowPwd] = useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error, data } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { 
      setLoading(false);
      setError(error.message); 
      return; 
    }
    
    // Wait for session to be established
    if (data?.session) {
      // Give the session cookie time to be written
      await new Promise(resolve => setTimeout(resolve, 100));
      // Force a hard navigation to ensure middleware sees the session
      window.location.href = '/';
    } else {
      setLoading(false);
      setError('Login successful but no session created');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'rgb(var(--surface))' }}>
      <div className="w-full max-w-md">
        <div 
          className="rounded-2xl border bg-white/80 backdrop-blur-sm dark:bg-neutral-900/80 p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.15)]" 
          style={{ borderColor: 'rgb(var(--border))' }}
        >
          <div className="text-center mb-8">
            <h1 className="text-3xl font-semibold tracking-tight mb-2" style={{ color: 'rgb(var(--fg))' }}>
              Clinic
            </h1>
            <p className="text-base" style={{ color: 'rgb(var(--muted))' }}>
              Sign in to continue
            </p>
          </div>
          
          <form onSubmit={onSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="font-medium">
                Email
              </Label>
              <Input 
                id="email" 
                type="email" 
                value={email} 
                onChange={(e)=>setEmail(e.target.value)} 
                required 
                className="h-12 text-base w-full"
                placeholder="Enter your email"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="font-medium">
                Password
              </Label>
              <div className="relative">
                <Input 
                  id="password" 
                  type={showPwd ? 'text' : 'password'} 
                  value={password} 
                  onChange={(e)=>setPassword(e.target.value)} 
                  required 
                  className="h-12 text-base w-full pr-16"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={()=>setShowPwd((v)=>!v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium rounded-md px-2 py-1 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  style={{ color: 'rgb(var(--muted))' }}
                  aria-label={showPwd ? 'Hide password' : 'Show password'}
                >
                  {showPwd ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
            
            {error && (
              <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800">
                {error}
              </div>
            )}
            
            <Button 
              className="w-full h-12 text-base font-semibold rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100 transition-colors" 
              disabled={loading} 
              type="submit"
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </Button>
          </form>
          
          <p className="mt-8 text-center text-sm" style={{ color: 'rgb(var(--muted))' }}>
            Don&apos;t have an account?{' '}
            <a
              href="/register"
              className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Register here
            </a>
            {' '}(Dev only)
          </p>
        </div>
      </div>
    </div>
  );
}
