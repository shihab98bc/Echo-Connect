'use client';

import { useState } from 'react';
import { AppUser, Contact } from './app-shell';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { EndCallIcon, MicIcon, MicOffIcon, VideoIcon, VideoOffIcon, SwitchCameraIcon, SpeakerIcon } from '@/components/icons';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';


interface CallViewProps {
  user: AppUser;
  contact: Contact;
  type: 'video' | 'voice';
  onEndCall: () => void;
}

const ParticipantVideo = ({ participant, isLocal }: { participant: { id: string, name: string, emoji: string }, isLocal: boolean }) => (
    <motion.div 
        layout
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        className={cn("relative rounded-lg overflow-hidden bg-gray-900/50 flex items-center justify-center", isLocal && "border-2 border-white shadow-lg")}>
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
    </motion.div>
);

const ParticipantAvatar = ({ participant, isAudioCall }: { participant: { name: string, emoji: string }, isAudioCall: boolean }) => (
    <motion.div 
        className="flex flex-col items-center gap-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
    >
        <div className="relative">
            <Avatar className="h-28 w-28 text-5xl border-4 border-white/20">
                <AvatarFallback className="bg-white/10">{participant.emoji}</AvatarFallback>
            </Avatar>
            {isAudioCall && (
                <motion.div
                    className="absolute inset-0 rounded-full border-4 border-green-500"
                    animate={{
                        scale: [1, 1.1, 1],
                        opacity: [0.5, 1, 0.5],
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                />
            )}
        </div>
        <p className="font-semibold text-white/90 mt-2">{participant.name}</p>
    </motion.div>
);


export default function CallView({ user, contact, type, onEndCall }: CallViewProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(type === 'voice');
  const [isVideoEnabled, setIsVideoEnabled] = useState(type === 'video');
  const isAudioCall = type === 'voice' && !isVideoEnabled;

  const isGroupCall = 'isGroup' in contact && contact.isGroup;
  const participants = isGroupCall && 'members' in contact ? contact.members : [contact];
  const remoteParticipants = participants.filter(p => p.id !== user.uid);
  const localParticipant = { id: user.uid, name: "You", emoji: user.emoji };
  

  return (
    <div className="absolute inset-0 bg-gray-900 text-white flex flex-col z-50 overflow-hidden">
        {/* Background */}
        <AnimatePresence>
            <motion.div
                key={isVideoEnabled ? 'video-bg' : 'audio-bg'}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={cn(
                    "absolute inset-0 w-full h-full transition-all duration-500",
                    !isVideoEnabled && "bg-gradient-to-br from-gray-700 via-gray-800 to-gray-900"
                )}
            >
                {isVideoEnabled ? (
                    <Image 
                        src={`https://placehold.co/450x950.png?text=${contact.emoji}`}
                        alt="Remote video stream background"
                        data-ai-hint="person portrait"
                        layout="fill"
                        objectFit="cover"
                        className="opacity-30 blur-sm"
                    />
                ) : (
                    <div className="absolute inset-0 opacity-20">
                        <motion.div className="absolute h-96 w-96 bg-green-500/50 rounded-full -top-20 -left-20" animate={{ scale: [1, 1.2, 1], x: [0, 20, 0] }} transition={{ duration: 15, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }} />
                        <motion.div className="absolute h-80 w-80 bg-blue-500/50 rounded-full -bottom-20 -right-20" animate={{ scale: [1, 1.2, 1], y: [0, -20, 0] }} transition={{ duration: 12, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}/>
                    </div>
                )}
            </motion.div>
        </AnimatePresence>

      {/* Foreground Content */}
      <motion.div 
        className="call-overlay absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent flex flex-col justify-between p-4 sm:p-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header Info */}
        <motion.div 
            className="text-center pt-4"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
        >
            <h2 className="text-3xl font-bold font-headline text-shadow">{contact.name}</h2>
            <p className="text-lg text-white/80 text-shadow">
                {isGroupCall ? `Group ${type} call` : isAudioCall ? 'Calling...' : 'Video Call'}
            </p>
        </motion.div>

        {/* Main Content: Video or Avatars */}
        <AnimatePresence mode="wait">
            {isVideoEnabled ? (
                 <motion.div 
                    key="video-view"
                    className="flex-grow flex items-center justify-center relative"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                >
                    <div className="absolute top-4 right-4 w-28 h-40 z-10">
                        <ParticipantVideo participant={localParticipant} isLocal={true} />
                    </div>
                     <div className="w-full h-full max-h-[60vh] aspect-[9/16] rounded-lg overflow-hidden shadow-lg">
                        <ParticipantVideo participant={contact} isLocal={false} />
                    </div>
               </motion.div>
            ) : (
                <motion.div 
                    key="audio-view"
                    className="flex-grow flex flex-col items-center justify-center"
                >
                    <div className={cn("flex justify-center flex-wrap gap-8 transition-all duration-300", isGroupCall ? "scale-90" : "scale-100")}>
                        {isGroupCall ? (
                            participants.map(p => <ParticipantAvatar key={p.id} participant={p} isAudioCall={isAudioCall} />)
                        ) : (
                            <ParticipantAvatar participant={contact} isAudioCall={isAudioCall} />
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>

        {/* Call Controls */}
        <motion.div 
            className="flex flex-col items-center gap-6 pb-4"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, type: 'spring', stiffness: 100 }}
        >
            <div className="flex justify-center gap-4 p-4 bg-black/40 rounded-full backdrop-blur-md border border-white/10">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsVideoEnabled(v => !v)}
                    className={cn("w-14 h-14 rounded-full text-white hover:bg-white/20", !isVideoEnabled && "bg-white/10")}
                >
                    {isVideoEnabled ? <VideoIcon className="h-7 w-7" /> : <VideoOffIcon className="h-7 w-7" />}
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsMuted(m => !m)}
                    className={cn("w-14 h-14 rounded-full text-white hover:bg-white/20", isMuted && "bg-white/10")}
                >
                    {isMuted ? <MicOffIcon className="h-7 w-7" /> : <MicIcon className="h-7 w-7" />}
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {}} // Placeholder for switch camera
                    className="w-14 h-14 rounded-full text-white hover:bg-white/20 disabled:opacity-50"
                    disabled={!isVideoEnabled}
                >
                    <SwitchCameraIcon className="h-7 w-7" />
                </Button>
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
        </motion.div>
      </motion.div>
    </div>
  );
}
