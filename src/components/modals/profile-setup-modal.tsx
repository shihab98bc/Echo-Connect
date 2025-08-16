'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

const emojis = ['👋', '😀', '😎', '🚀', '🎨', '🌟', '💡', '🎸', '💻', '🎉', '🧠', '🤔'];

interface ProfileSetupModalProps {
  isOpen: boolean;
  onSave: (name: string, emoji: string) => void;
}

export default function ProfileSetupModal({ isOpen, onSave }: ProfileSetupModalProps) {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('👋');

  const handleSave = () => {
    if (name.trim()) {
      onSave(name.trim(), emoji);
    }
  };

  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-[425px]" onInteractOutside={(e) => e.preventDefault()} hideCloseButton>
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">Setup Your Profile</DialogTitle>
          <DialogDescription>
            Let's get you set up. Choose a name and an emoji to represent you.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Display Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your Name" />
          </div>
          <div className="space-y-2">
            <Label>Choose an Emoji</Label>
            <div className="flex flex-wrap gap-2">
                {emojis.map((e) => (
                    <button 
                        key={e}
                        onClick={() => setEmoji(e)}
                        className={`w-12 h-12 text-2xl rounded-full transition-all duration-200 ${emoji === e ? 'bg-primary text-primary-foreground scale-110' : 'bg-secondary'}`}
                    >
                        {e}
                    </button>
                ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave} className="w-full" disabled={!name.trim()}>Save and Continue</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
