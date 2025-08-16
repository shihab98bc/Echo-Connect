'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AnimatePresence, motion } from 'framer-motion';

interface AuthViewProps {
  onLogin: () => void;
  onSignup: () => void;
}

const AuthForm = ({ isLogin, onLogin, onSignup }: { isLogin: boolean; onLogin: () => void; onSignup: () => void; }) => {
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isLogin) {
            onLogin();
        } else {
            onSignup();
        }
    };
    
    return (
        <motion.div
            key={isLogin ? 'login' : 'signup'}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="w-full"
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                <h2 className="text-2xl font-bold text-center text-foreground font-headline">
                    {isLogin ? 'Welcome Back' : 'Create Account'}
                </h2>
                <div className="space-y-4">
                    {!isLogin && (
                         <div className="space-y-2">
                            <Label htmlFor="name">Name</Label>
                            <Input id="name" type="text" placeholder="Alex Ray" required />
                        </div>
                    )}
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" placeholder="alex@example.com" required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input id="password" type="password" placeholder="••••••••" required />
                    </div>
                </div>
                <Button type="submit" className="w-full bg-button-color hover:bg-button-color/90 text-white font-bold">
                    {isLogin ? 'Log In' : 'Sign Up'}
                </Button>
            </form>
        </motion.div>
    );
}

export default function AuthView({ onLogin, onSignup }: AuthViewProps) {
  const [isLoginView, setIsLoginView] = useState(true);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-background p-8">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-5xl font-bold text-center text-primary font-headline">EchoConnect</h1>
        
        <div className="w-full h-80 flex items-center justify-center">
            <AnimatePresence mode="wait">
                <AuthForm isLogin={isLoginView} onLogin={onLogin} onSignup={onSignup} />
            </AnimatePresence>
        </div>

        <div className="text-center">
          <button
            onClick={() => setIsLoginView(!isLoginView)}
            className="text-sm text-link-color hover:underline"
          >
            {isLoginView ? "Don't have an account? Sign Up" : 'Already have an account? Log In'}
          </button>
        </div>
      </div>
    </div>
  );
}
