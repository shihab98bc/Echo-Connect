'use client';

import { AppUser, Contact } from './app-shell';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { EndCallIcon } from '@/components/icons';
import Image from 'next/image';

interface CallViewProps {
  user: AppUser;
  contact: Contact;
  type: 'video' | 'voice';
  onEndCall: () => void;
}

export default function CallView({ user, contact, type, onEndCall }: CallViewProps) {
  return (
    <div className="absolute inset-0 bg-gray-800 text-white flex flex-col items-center justify-between z-50">
      {type === 'video' ? (
        <>
            <Image 
                id="remote-video"
                src="https://placehold.co/450x950.png"
                alt="Remote video stream"
                data-ai-hint="person portrait"
                layout="fill"
                objectFit="cover"
                className="opacity-80"
            />
            <Image 
                id="local-video"
                src="https://placehold.co/120x160.png"
                alt="Local video stream"
                data-ai-hint="person selfie"
                width={120}
                height={160}
                className="absolute top-4 right-4 rounded-lg border-2 border-white shadow-lg"
            />
        </>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-700 to-gray-900">
             <audio id="remote-audio" autoPlay />
        </div>
      )}

      <div className="call-overlay absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex flex-col justify-between p-8">
        <div className="caller-info text-center mt-12">
            <Avatar className="h-24 w-24 text-6xl mx-auto mb-4 border-4 border-white/50">
                <AvatarFallback>{contact.emoji}</AvatarFallback>
            </Avatar>
            <h2 className="text-3xl font-bold font-headline">{contact.name}</h2>
            <p className="text-lg text-white/80">
                {type === 'video' ? 'Video calling...' : 'Voice calling...'}
            </p>
        </div>

        <div className="call-controls flex justify-center">
            <Button
                onClick={onEndCall}
                className="bg-destructive hover:bg-destructive/80 text-destructive-foreground rounded-full w-20 h-20 shadow-lg"
            >
                <EndCallIcon className="h-10 w-10" />
            </Button>
        </div>
      </div>
    </div>
  );
}
