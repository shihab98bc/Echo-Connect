'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MessageCircle, Phone, Paperclip, MapPin, CircleDashed } from 'lucide-react';

interface SecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SecurityFeature = ({ icon, text }: { icon: React.ReactNode, text: string }) => (
    <div className="flex items-start gap-4 text-muted-foreground">
        <div className="w-6 h-6 flex-shrink-0">{icon}</div>
        <p className="flex-grow">{text}</p>
    </div>
);

export default function SecurityModal({ isOpen, onClose }: SecurityModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl text-center">Security</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-6">
            <div className="text-center">
                <h3 className="font-semibold text-lg">Your chats and calls are private</h3>
            </div>
            <p className="text-sm text-muted-foreground text-center">
                End-to-end encryption keeps your personal messages and calls between you and the people you choose. No one outside of the chat, not even EchoConnect, can read, listen to, or share them. This includes your:
            </p>
            <div className="space-y-4 pt-2">
                <SecurityFeature icon={<MessageCircle />} text="Text and voice messages" />
                <SecurityFeature icon={<Phone />} text="Audio and video calls" />
                <SecurityFeature icon={<Paperclip />} text="Photos, videos and documents" />
                <SecurityFeature icon={<MapPin />} text="Location sharing" />
                <SecurityFeature icon={<CircleDashed />} text="Status updates" />
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
