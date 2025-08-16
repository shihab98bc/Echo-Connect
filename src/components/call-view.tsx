'use client';

import { AppUser, Contact } from './app-shell';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { EndCallIcon } from '@/components/icons';
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
  const isGroupCall = 'isGroup' in contact && contact.isGroup;
  const participants = isGroupCall && 'members' in contact ? contact.members : [contact];
  const remoteParticipants = participants.filter(p => p.id !== user.uid);
  const localParticipant = { id: user.uid, name: "You", emoji: user.emoji };

  const MainParticipant = () => {
    if (type === 'voice') return null;

    if (isGroupCall) {
        // In a real app, this would be the active speaker
        return <ParticipantVideo participant={remoteParticipants[0]} isLocal={false} />
    } else {
        return <ParticipantVideo participant={contact} isLocal={false} />
    }
  }

  return (
    <div className="absolute inset-0 bg-gray-800 text-white flex flex-col items-center justify-between z-50">
      <div className={cn(
        "absolute inset-0 w-full h-full transition-all duration-300",
        type === 'video' ? "bg-gray-900" : "bg-gradient-to-br from-gray-700 to-gray-900"
      )}>
        {type === 'video' && !isGroupCall && (
             <Image 
                src="https://placehold.co/450x950.png"
                alt="Remote video stream"
                data-ai-hint="person portrait"
                layout="fill"
                objectFit="cover"
                className="opacity-80"
            />
        )}
      </div>

      <div className="call-overlay absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex flex-col justify-between p-4 sm:p-8">
        <div className="w-full">
            {type === 'video' && (
                <div className={cn(
                    "grid gap-2 mt-4",
                    isGroupCall ? `grid-cols-2 grid-rows-${Math.ceil((remoteParticipants.length + 1) / 2)} h-[70%]` : ""
                )}>
                    {isGroupCall ? (
                        <>
                            {remoteParticipants.map(p => <ParticipantVideo key={p.id} participant={p} isLocal={false} />)}
                            <ParticipantVideo participant={localParticipant} isLocal={true} />
                        </>
                    ) : (
                        <div className="absolute top-4 right-4 w-28 h-40">
                             <ParticipantVideo participant={localParticipant} isLocal={true} />
                        </div>
                    )}
                </div>
            )}
        </div>

        <div className="caller-info text-center">
            {type === 'voice' && (
                <div className={cn(
                    "flex justify-center flex-wrap gap-8 transition-all duration-300",
                     isGroupCall ? "mt-24" : "mt-48"
                )}>
                    {isGroupCall ? (
                        participants.map(p => <ParticipantAvatar key={p.id} participant={p} />)
                    ) : (
                        <ParticipantAvatar participant={contact} />
                    )}
                </div>
            )}
            <h2 className="text-3xl font-bold font-headline mt-8">{contact.name}</h2>
            <p className="text-lg text-white/80">
                {isGroupCall ? `Group ${type} call` : `${type.charAt(0).toUpperCase() + type.slice(1)} call in progress...`}
            </p>
        </div>

        <div className="call-controls flex justify-center pb-4">
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