'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface AddFriendModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddFriend: (name: string) => void;
}

export default function AddFriendModal({ isOpen, onClose, onAddFriend }: AddFriendModalProps) {
  const [friendId, setFriendId] = useState('');
  const { toast } = useToast();

  const handleAddFriend = () => {
    if (friendId.trim()) {
      onAddFriend(friendId);
      toast({
        title: "Friend Request Sent",
        description: `Your request to ${friendId} has been sent.`,
      });
      onClose();
      setFriendId('');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">Add a Friend</DialogTitle>
          <DialogDescription>
            Enter your friend's unique EchoConnect ID to send them a request.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="friend-id">Friend's ID</Label>
            <Input 
                id="friend-id" 
                value={friendId}
                onChange={(e) => setFriendId(e.target.value)}
                placeholder="@friend1234" 
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleAddFriend} className="w-full" disabled={!friendId.trim()}>Send Request</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
