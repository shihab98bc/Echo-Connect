'use client';

import { useState } from 'react';
import { AppUser, Contact } from './app-shell';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { EndCallIcon, MicIcon, MicOffIcon, VideoIcon, VideoOffIcon, SwitchCameraIcon, SpeakerIcon } from '@/components/icons';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface CallViewProps {
  user: AppUser;
  contact: Contact;
  type: 'video' | 'voice';
  onEndCall: () => void;
}

const ParticipantVideo = ({ participant, isLocal }: { participant: { id: string, name: string, emoji: string }, isLocal: boolean }) => (
    <div className={cn("relative rounded-lg overflow-hidden bg-gray-900/50 flex items-center justify-center", isLocal && "border-2 border-white shadow-lg")}>
        <Image 
            src={`https://placehold.co/400x400.png?text=${participant.emoji}`}
            alt={`${participant.name}'s video stream`}
            data-ai-hint="person portrait"
            layout="fill"
            objectFit="cover"
            className="opacity-80"
        />
        <div className="absolute bottom-2 left-2 bg-black/50 p-1 rounded text-xs">{participant.name}</div>
        {isLocal && (
             <video className="absolute w-full h-full object-cover -z-10" autoPlay muted playsInline />
        )}
    </div>
);

const ParticipantAvatar = ({ participant }: { participant: { name: string, emoji: string } }) => (
    <div className="flex flex-col items-center gap-2">
        <Avatar className="h-20 w-20 text-4xl border-4 border-white/20">
            <AvatarFallback>{participant.emoji}</AvatarFallback>
        </Avatar>
        <p className="font-semibold text-white/90">{participant.name}</p>
    </div>
);


export default function CallView({ user, contact, type, onEndCall }: CallViewProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(type === 'voice');
  const [isVideoEnabled, setIsVideoEnabled] = useState(type === 'video');

  const isGroupCall = 'isGroup' in contact && contact.isGroup;
  const participants = isGroupCall && 'members' in contact ? contact.members : [contact];
  const remoteParticipants = participants.filter(p => p.id !== user.uid);
  const localParticipant = { id: user.uid, name: "You", emoji: user.emoji };
  const isAudioCall = type === 'voice';

  return (
    <div className="absolute inset-0 bg-gray-800 text-white flex flex-col items-center justify-between z-50">
      <div className={cn(
        "absolute inset-0 w-full h-full transition-all duration-300",
        isVideoEnabled ? "bg-gray-900" : "bg-gradient-to-br from-gray-700 to-gray-900"
      )}>
        {isVideoEnabled && (
             <Image 
                src={`https://placehold.co/450x950.png?text=${contact.emoji}`}
                alt="Remote video stream"
                data-ai-hint="person portrait"
                layout="fill"
                objectFit="cover"
                className="opacity-40"
            />
        )}
      </div>

      <div className="call-overlay absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent flex flex-col justify-between p-4 sm:p-6">
        {/* Remote Participant Video / Info */}
        <div className="flex-grow flex flex-col items-center justify-center pt-10">
            {isVideoEnabled ? (
                 <div className="absolute top-4 right-4 w-28 h-40">
                    <ParticipantVideo participant={localParticipant} isLocal={true} />
               </div>
            ) : (
                <div className={cn("flex justify-center flex-wrap gap-8 transition-all duration-300", isGroupCall ? "mt-12" : "mt-24")}>
                    {isGroupCall ? (
                        participants.map(p => <ParticipantAvatar key={p.id} participant={p} />)
                    ) : (
                        <ParticipantAvatar participant={contact} />
                    )}
                </div>
            )}
            <h2 className="text-3xl font-bold font-headline mt-4 text-shadow">{contact.name}</h2>
            <p className="text-lg text-white/80 text-shadow">
                {isGroupCall ? `Group ${type} call` : isAudioCall ? 'Calling...' : 'Video Call'}
            </p>
        </div>


        {/* Call Controls */}
        <div className="flex flex-col items-center gap-6 pb-4">
            <div className="flex justify-center gap-4 p-4 bg-black/30 rounded-full backdrop-blur-sm">
                 {!isAudioCall && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsVideoEnabled(v => !v)}
                        className={cn("w-14 h-14 rounded-full text-white hover:bg-white/20", !isVideoEnabled && "bg-white/10")}
                    >
                        {isVideoEnabled ? <VideoIcon className="h-7 w-7" /> : <VideoOffIcon className="h-7 w-7" />}
                    </Button>
                 )}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsMuted(m => !m)}
                    className={cn("w-14 h-14 rounded-full text-white hover:bg-white/20", isMuted && "bg-white/10")}
                >
                    {isMuted ? <MicOffIcon className="h-7 w-7" /> : <MicIcon className="h-7 w-7" />}
                </Button>
                {!isAudioCall && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {}} // Placeholder for switch camera
                        className="w-14 h-14 rounded-full text-white hover:bg-white/20 disabled:opacity-50"
                        disabled={!isVideoEnabled}
                    >
                        <SwitchCameraIcon className="h-7 w-7" />
                    </Button>
                )}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsSpeakerOn(s => !s)}
                    className={cn("w-14 h-14 rounded-full text-white hover:bg-white/20", isSpeakerOn && "bg-white/10")}
                >
                    <SpeakerIcon className="h-7 w-7" />
                </Button>
            </div>
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
