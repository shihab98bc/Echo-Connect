'use client';

import type { AppUser } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { summarizeUserActivity } from '@/app/actions';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';

interface ProfileViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: AppUser;
  onLogout: () => void;
}

export default function ProfileViewModal({ isOpen, onClose, user, onLogout }: ProfileViewModalProps) {
  const [summary, setSummary] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSummarize = async () => {
    setIsLoading(true);
    setSummary('');
    try {
      const result = await summarizeUserActivity(user.uid);
      if (result.summary) {
        setSummary(result.summary);
      } else {
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not generate summary.",
        });
      }
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An error occurred while generating the summary.",
      });
    }
    setIsLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex flex-col items-center gap-4 text-center">
            <Avatar className="h-24 w-24 text-6xl">
              <AvatarFallback>{user.emoji}</AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle className="font-headline text-3xl">{user.name}</DialogTitle>
              <DialogDescription className="text-base">{user.id}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4 space-y-4">
            <h3 className="font-semibold">AI Communication Summary</h3>
            <p className="text-sm text-muted-foreground">Get an AI-powered summary of your recent conversations.</p>
            <Button onClick={handleSummarize} disabled={isLoading} className="w-full">
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isLoading ? 'Generating...' : 'Generate Summary'}
            </Button>
            {summary && (
              <ScrollArea className="h-32 mt-2 rounded-md border p-4 text-sm">
                {summary}
              </ScrollArea>
            )}
        </div>
        
        <DialogFooter className="mt-4">
          <Button variant="destructive" onClick={onLogout} className="w-full">Logout</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
