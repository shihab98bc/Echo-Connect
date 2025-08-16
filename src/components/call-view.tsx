
'use client';

import { useState, useRef, useEffect } from 'react';
import { AppUser, Contact } from './app-shell';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { EndCallIcon, MicIcon, MicOffIcon, VideoIcon, VideoOffIcon, SwitchCameraIcon, SpeakerIcon } from '@/components/icons';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion, useDragControls } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';


interface CallViewProps {
  user: AppUser;
  contact: Contact;
  type: 'video' | 'voice';
  onEndCall: () => void;
}

const ParticipantVideo = ({ participant, isLocal, videoStream, isVideoEnabled, isAudioOnly }: { participant: { id: string, name: string, emoji: string }, isLocal: boolean, videoStream: MediaStream | null, isVideoEnabled: boolean, isAudioOnly: boolean }) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (videoRef.current && videoStream) {
            videoRef.current.srcObject = videoStream;
        }
    }, [videoStream]);
    
    return (
        <motion.div 
            layout
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className={cn(
                "relative rounded-lg overflow-hidden bg-gray-900/50 flex items-center justify-center h-full w-full", 
                isLocal && "border-2 border-white shadow-lg"
            )}
        >
            <AnimatePresence>
            {(isAudioOnly || !isVideoEnabled) ? (
                 <motion.div 
                    key="avatar"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center gap-2"
                >
                    <Avatar className={cn("h-20 w-20 text-4xl", isLocal && "h-10 w-10 text-2xl")}>
                        <AvatarFallback className="bg-white/10">{participant.emoji}</AvatarFallback>
                    </Avatar>
                </motion.div>
            ) : (
                <Image 
                    src={`https://placehold.co/400x400.png?text=${participant.emoji}`}
                    alt={`${participant.name}'s video placeholder`}
                    data-ai-hint="person portrait"
                    width={400}
                    height={400}
                    className="opacity-20 object-cover h-full w-full"
                />
            )}
            </AnimatePresence>
            
            <video ref={videoRef} className={cn("absolute w-full h-full object-cover -z-10", isVideoEnabled ? "opacity-100" : "opacity-0")} autoPlay muted={isLocal} playsInline />

            <div className="absolute bottom-2 left-2 bg-black/50 p-1 rounded text-xs">{participant.name}</div>
        </motion.div>
    );
};

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
  const [isCameraReversed, setIsCameraReversed] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const localVideoContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    let stream: MediaStream;
    const getCameraPermission = async () => {
      if (type === 'voice') {
        setHasCameraPermission(false);
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: isCameraReversed ? 'user' : 'environment' } });
        setHasCameraPermission(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Camera Access Denied',
          description: 'Please enable camera permissions in your browser settings to use this app.',
        });
      }
    };

    getCameraPermission();

    return () => {
        stream?.getTracks().forEach(track => track.stop());
    };
  }, [type, isCameraReversed, toast]);


  const isAudioCall = type === 'voice';

  const isGroupCall = 'isGroup' in contact && contact.isGroup;
  const participants = isGroupCall && 'members' in contact ? contact.members : [contact];
  const remoteParticipants = participants.filter(p => p.id !== user.uid);
  const localParticipant = { id: user.uid, name: "You", emoji: user.emoji };
  
  const toggleMute = () => {
    setIsMuted(m => !m);
    toast({ title: isMuted ? 'Microphone Unmuted' : 'Microphone Muted'});
  };

  const toggleVideo = () => {
    if (type === 'voice') return;
    if (hasCameraPermission === false) {
        toast({
            variant: 'destructive',
            title: 'Camera Not Available',
            description: 'Cannot enable video without camera permission.'
        });
        return;
    }
    setIsVideoEnabled(v => !v);
    toast({ title: isVideoEnabled ? 'Video Off' : 'Video On'});
  };

  const toggleSpeaker = () => {
    setIsSpeakerOn(s => !s);
    toast({ title: isSpeakerOn ? 'Speaker Off' : 'Speaker On'});
  };

  const switchCamera = () => {
    if(!isVideoEnabled) return;
    setIsCameraReversed(r => !r);
    toast({ title: 'Camera Switched'});
  }

  return (
    <div className="absolute inset-0 bg-gray-900 text-white flex flex-col z-50 overflow-hidden">
        {/* Background */}
        <AnimatePresence>
            <motion.div
                key={isVideoEnabled && hasCameraPermission ? 'video-bg' : 'audio-bg'}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={cn(
                    "absolute inset-0 w-full h-full transition-all duration-500",
                    !isVideoEnabled && "bg-gradient-to-br from-gray-700 via-gray-800 to-gray-900"
                )}
            >
                {(isVideoEnabled && hasCameraPermission && !isAudioCall) ? (
                     <video ref={videoRef} className="absolute w-full h-full object-cover opacity-30 blur-sm" autoPlay muted playsInline />
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
        className="call-overlay absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent flex flex-col justify-between"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header Info */}
        <motion.div 
            className="text-center pt-6 z-10"
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
        <div className="absolute inset-0 flex items-center justify-center">
            <AnimatePresence>
            {isAudioCall ? (
                 <motion.div 
                    key="audio-view"
                    className="flex-grow flex flex-col items-center justify-center p-6"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                >
                    <div className={cn("flex justify-center flex-wrap gap-8 transition-all duration-300", isGroupCall ? "scale-90" : "scale-100")}>
                        {isGroupCall ? (
                            participants.map(p => <ParticipantAvatar key={p.id} participant={p} isAudioCall={isAudioCall} />)
                        ) : (
                            <ParticipantAvatar participant={contact} isAudioCall={isAudioCall} />
                        )}
                    </div>
                </motion.div>
            ) : (
                 <motion.div 
                    key="video-view"
                    ref={localVideoContainerRef}
                    className="w-full h-full flex flex-col items-center justify-center relative"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                >
                    <div className="absolute inset-0 w-full h-full">
                       <ParticipantVideo participant={contact} isLocal={false} videoStream={null} isVideoEnabled={isVideoEnabled} isAudioOnly={false}/>
                    </div>

                    {isVideoEnabled && (
                      <motion.div 
                          className="absolute w-28 h-40 z-10 cursor-move"
                          drag
                          dragConstraints={localVideoContainerRef}
                          dragSnapToOrigin={false}
                          dragElastic={0.1}
                          initial={{ top: 20, right: 20, x:0, y:0 }}
                          dragTransition={{ bounceStiffness: 600, bounceDamping: 20 }}
                      >
                          <ParticipantVideo participant={localParticipant} isLocal={true} videoStream={videoRef.current?.srcObject as MediaStream ?? null} isVideoEnabled={isVideoEnabled} isAudioOnly={false} />
                      </motion.div>
                    )}

                    {hasCameraPermission === false && type === 'video' && (
                        <Alert variant="destructive" className="absolute top-24 w-auto z-20">
                            <AlertTitle>Camera Access Denied</AlertTitle>
                            <AlertDescription>
                                Please enable camera permissions.
                            </AlertDescription>
                        </Alert>
                    )}
               </motion.div>
            )}
            </AnimatePresence>
        </div>


        {/* Call Controls */}
        <motion.div 
            className="flex flex-col items-center gap-6 pb-6 z-10"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, type: 'spring', stiffness: 100 }}
        >
             <div className="flex justify-center gap-4 p-4 bg-black/40 rounded-full backdrop-blur-md border border-white/10">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleVideo}
                    className={cn("w-14 h-14 rounded-full text-white hover:bg-white/20", !isVideoEnabled && "bg-white/10", isAudioCall && "hidden")}
                    disabled={isAudioCall || hasCameraPermission === false}
                >
                    {isVideoEnabled ? <VideoIcon className="h-7 w-7" /> : <VideoOffIcon className="h-7 w-7" />}
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleMute}
                    className={cn("w-14 h-14 rounded-full text-white hover:bg-white/20", isMuted && "bg-destructive/50")}
                >
                    {isMuted ? <MicOffIcon className="h-7 w-7" /> : <MicIcon className="h-7 w-7" />}
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={switchCamera}
                    className={cn("w-14 h-14 rounded-full text-white hover:bg-white/20 disabled:opacity-50", isAudioCall && "hidden")}
                    disabled={isAudioCall || !isVideoEnabled || hasCameraPermission === false}
                >
                    <SwitchCameraIcon className="h-7 w-7" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleSpeaker}
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
