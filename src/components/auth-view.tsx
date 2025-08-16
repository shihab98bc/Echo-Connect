'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AnimatePresence, motion } from 'framer-motion';
import { auth } from '@/lib/firebase';
import { GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';

interface AuthViewProps {
  onLogin: () => void;
  onSignup: () => void;
  onGoogleSignIn: () => void;
}

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="24px" height="24px" {...props}>
        <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
        <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
        <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.651-3.356-11.303-8H6.393c3.561,6.793,10.637,11.53,17.607,11.53z"/>
        <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C42.012,35.83,44,30.138,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
    </svg>
);

const AuthForm = ({ isLogin, onLogin, onSignup, onGoogleSignIn }: { isLogin: boolean; onLogin: () => void; onSignup: () => void; onGoogleSignIn: () => void; }) => {
    const { toast } = useToast();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);
                onLogin();
            } else {
                await createUserWithEmailAndPassword(auth, email, password);
                // In a real app, you'd likely want to update the user's profile with the name here.
                onSignup();
            }
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Authentication Failed',
                description: error.message,
            });
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
            <form onSubmit={handleSubmit} className="space-y-4">
                <h2 className="text-2xl font-bold text-center text-foreground font-headline">
                    {isLogin ? 'Welcome Back' : 'Create Account'}
                </h2>
                <div className="space-y-4">
                    {!isLogin && (
                         <div className="space-y-2">
                            <Label htmlFor="name">Name</Label>
                            <Input id="name" type="text" placeholder="Alex Ray" required value={name} onChange={e => setName(e.target.value)} />
                        </div>
                    )}
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" placeholder="alex@example.com" required value={email} onChange={e => setEmail(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input id="password" type="password" placeholder="••••••••" required value={password} onChange={e => setPassword(e.target.value)} />
                    </div>
                </div>
                <Button type="submit" className="w-full bg-button-color hover:bg-button-color/90 text-white font-bold">
                    {isLogin ? 'Log In' : 'Sign Up'}
                </Button>
                <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                    </div>
                </div>
                <Button variant="outline" type="button" className="w-full font-bold" onClick={onGoogleSignIn}>
                    <GoogleIcon className="mr-2 h-5 w-5"/>
                    Google
                </Button>
            </form>
        </motion.div>
    );
}

export default function AuthView({ onLogin, onSignup }: AuthViewProps) {
  const [isLoginView, setIsLoginView] = useState(true);
  const { toast } = useToast();

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
        await signInWithPopup(auth, provider);
        // onAuthStateChanged will handle the view transition
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Google Sign-In Failed',
            description: error.message,
        });
    }
  };


  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-background p-8">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-5xl font-bold text-center text-primary font-headline">EchoConnect</h1>
        
        <div className="w-full min-h-[350px] flex items-center justify-center">
            <AnimatePresence mode="wait">
                <AuthForm 
                    isLogin={isLoginView} 
                    onLogin={onLogin} 
                    onSignup={onSignup}
                    onGoogleSignIn={handleGoogleSignIn}
                />
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
