'use client';

import { Call } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { CheckIcon, XIcon, VoiceCallIcon, VideoCallIcon } from '@/components/icons';
import { motion } from 'framer-motion';

interface IncomingCallModalProps {
  call: Call;
  onAccept: () => void;
  onReject: () => void;
}

export default function IncomingCallModal({ call, onAccept, onReject }: IncomingCallModalProps) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div 
        initial={{ scale: 0.8, opacity: 0, y: 50 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.8, opacity: 0, y: 50 }}
        className="bg-gradient-to-br from-secondary to-background rounded-2xl p-8 shadow-2xl w-full max-w-sm text-center border border-white/10"
      >
        <Avatar className="h-24 w-24 text-6xl mx-auto mb-4 border-4 border-white/50 shadow-lg">
            <AvatarFallback className="bg-muted">{call.contact.emoji}</AvatarFallback>
        </Avatar>
        <h2 className="text-2xl font-bold font-headline">{call.contact.name}</h2>
        <div className="flex items-center justify-center gap-2 mt-2 text-muted-foreground">
            {call.type === 'video' ? <VideoCallIcon className="h-5 w-5"/> : <VoiceCallIcon className="h-5 w-5" />}
            <p>Incoming {call.type} call...</p>
        </div>

        <div className="flex justify-around mt-8">
            <div className="flex flex-col items-center gap-2">
                <Button
                    onClick={onReject}
                    variant="destructive"
                    className="rounded-full w-16 h-16 shadow-lg"
                >
                    <XIcon className="h-8 w-8" />
                </Button>
                <span className="text-sm font-medium">Reject</span>
            </div>
            <div className="flex flex-col items-center gap-2">
                <Button
                    onClick={onAccept}
                    className="bg-green-500 hover:bg-green-600 text-white rounded-full w-16 h-16 shadow-lg"
                >
                    <CheckIcon className="h-8 w-8" />
                </Button>
                <span className="text-sm font-medium">Accept</span>
            </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
