'use client';

import { useState, useRef, useEffect } from 'react';
import { AppUser, Contact } from './app-shell';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { EndCallIcon, MicIcon, MicOffIcon, VideoIcon, VideoOffIcon, SwitchCameraIcon, SpeakerIcon } from '@/components/icons';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { collection, doc, addDoc, onSnapshot, updateDoc, deleteDoc, getDoc, setDoc, DocumentReference } from 'firebase/firestore';
import { db } from '@/lib/firebase';


interface CallViewProps {
  user: AppUser;
  contact: Contact;
  type: 'video' | 'voice';
  onEndCall: () => void;
  callId: string;
  isCaller: boolean;
  offer?: any;
}

const servers = {
    iceServers: [
        {
            urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
        },
    ],
    iceCandidatePoolSize: 10,
};

let pc: RTCPeerConnection | null = null;
let localStreamInstance: MediaStream | null = null;


const ParticipantVideo = ({ participant, isLocal, stream, isVideoEnabled, isAudioOnly, isMuted }: { participant: { id?: string, name: string, emoji: string }, isLocal: boolean, stream: MediaStream | null, isVideoEnabled: boolean, isAudioOnly: boolean, isMuted?: boolean }) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);
    
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
            {(isAudioOnly || !isVideoEnabled || !stream) ? (
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
            ) : null}
            </AnimatePresence>
            
            <video ref={videoRef} className={cn("absolute w-full h-full object-cover", (isVideoEnabled && stream) ? "opacity-100" : "opacity-0")} autoPlay muted={isLocal || isMuted} playsInline />

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


export default function CallView({ user, contact, type, onEndCall, callId, isCaller, offer }: CallViewProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(type === 'voice');
  const [isVideoEnabled, setIsVideoEnabled] = useState(type === 'video');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [showControls, setShowControls] = useState(true);
  
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isCallConnected, setIsCallConnected] = useState(false);

  const localVideoContainerRef = useRef<HTMLDivElement>(null);
  const controlsTimerRef = useRef<NodeJS.Timeout | null>(null);
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  const isAudioCall = type === 'voice';
  
  const callDocRef = useRef<DocumentReference | null>(doc(db, 'calls', callId));

  useEffect(() => {
    const handleEndCallCleanup = async (isError = false) => {
        if (durationTimerRef.current) clearInterval(durationTimerRef.current);
        pc?.close();
        pc = null;
        localStreamInstance?.getTracks().forEach(track => track.stop());
        localStreamInstance = null;
        setLocalStream(null);
        setRemoteStream(null);
        
        if (callDocRef.current && !isError) {
             const docSnap = await getDoc(callDocRef.current);
             if (docSnap.exists()) await deleteDoc(callDocRef.current);
        }
        onEndCall();
    };
      
    const setupAndStartCall = async () => {
        pc = new RTCPeerConnection(servers);

        pc.onconnectionstatechange = () => {
            if(pc?.connectionState === 'connected') {
                setIsCallConnected(true);
            } else if (pc?.connectionState === 'failed' || pc?.connectionState === 'disconnected' || pc?.connectionState === 'closed') {
                handleEndCallCleanup();
            }
        }

        try {
            localStreamInstance = await navigator.mediaDevices.getUserMedia({
                video: type === 'video',
                audio: true,
            });
            setLocalStream(localStreamInstance);
            setHasPermission(true);
        } catch (error) {
            console.error('Error accessing media devices.', error);
            setHasPermission(false);
            toast({
                variant: 'destructive',
                title: 'Media Access Denied',
                description: 'Please enable camera and microphone permissions.',
            });
            handleEndCallCleanup(true);
            return;
        }

        localStreamInstance.getTracks().forEach((track) => {
            pc?.addTrack(track, localStreamInstance!);
        });

        const remote = new MediaStream();
        setRemoteStream(remote);

        pc.ontrack = (event) => {
            event.streams[0].getTracks().forEach((track) => {
                remote.addTrack(track);
            });
        };

        if (!callDocRef.current) return;
        const candidatesCollection = collection(callDocRef.current, isCaller ? 'offerCandidates' : 'answerCandidates');
        
        pc.onicecandidate = event => {
            if (event.candidate) {
                addDoc(candidatesCollection, event.candidate.toJSON());
            }
        };

        if (isCaller) {
            const offerDescription = await pc.createOffer();
            await pc.setLocalDescription(offerDescription);
            const offerPayload = { sdp: offerDescription.sdp, type: offerDescription.type, callerId: user.uid };
            await setDoc(callDocRef.current, { offer: offerPayload });

            const unsubAnswer = onSnapshot(callDocRef.current, (snapshot) => {
                const data = snapshot.data();
                if (pc && !pc.currentRemoteDescription && data?.answer) {
                    const answerDescription = new RTCSessionDescription(data.answer);
                    pc.setRemoteDescription(answerDescription);
                }
            });
            const answerCandidates = collection(callDocRef.current, 'answerCandidates');
            const unsubAnswerCandidates = onSnapshot(answerCandidates, (snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'added') pc?.addIceCandidate(new RTCIceCandidate(change.doc.data()));
                });
            });
            return () => { unsubAnswer(); unsubAnswerCandidates(); }
        } else {
            if (!offer) return;
            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            const answerDescription = await pc.createAnswer();
            await pc.setLocalDescription(answerDescription);
            const answerPayload = { type: answerDescription.type, sdp: answerDescription.sdp };
            await updateDoc(callDocRef.current, { answer: answerPayload });

            const offerCandidates = collection(callDocRef.current, 'offerCandidates');
            const unsubOfferCandidates = onSnapshot(offerCandidates, (snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'added') pc?.addIceCandidate(new RTCIceCandidate(change.doc.data()));
                });
            });
            return () => { unsubOfferCandidates(); }
        }
    };
    
    const unsubPromise = setupAndStartCall();

    return () => {
        unsubPromise.then(unsub => {
            if (unsub) unsub();
        });
        
        handleEndCallCleanup();
    };
  }, [type, user.uid, callId, isCaller, offer, toast, onEndCall]);
  
  useEffect(() => {
    if (isCallConnected) {
      durationTimerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
        if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    }
    return () => {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    };
  }, [isCallConnected]);
  
  useEffect(() => {
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    if (showControls && !isAudioCall) {
      controlsTimerRef.current = setTimeout(() => setShowControls(false), 5000);
    }
    return () => {
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    };
  }, [showControls, isAudioCall]);

  const toggleControls = () => {
    if (isAudioCall) return;
    setShowControls(s => !s);
  };
  
  const toggleMute = () => {
    localStream?.getAudioTracks().forEach(track => track.enabled = !track.enabled);
    setIsMuted(m => !m);
    toast({ title: isMuted ? 'Microphone Unmuted' : 'Microphone Muted'});
  };

  const toggleVideo = () => {
    if (type === 'voice' || !hasPermission) {
      toast({ variant: 'destructive', title: 'Camera Not Available' });
      return;
    }
    localStream?.getVideoTracks().forEach(track => track.enabled = !track.enabled);
    setIsVideoEnabled(v => !v);
    toast({ title: isVideoEnabled ? 'Video Off' : 'Video On'});
  };

  const switchCamera = async () => {
    if(!isVideoEnabled || !localStream) return;
    const videoTrack = localStream.getVideoTracks()[0];
    videoTrack.stop();

    try {
        const newStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: videoTrack.getSettings().facingMode === 'user' ? 'environment' : 'user' },
            audio: true
        });
        const newVideoTrack = newStream.getVideoTracks()[0];
        localStream.removeTrack(videoTrack);
        localStream.addTrack(newVideoTrack);
        const sender = pc?.getSenders().find(s => s.track?.kind === 'video');
        sender?.replaceTrack(newVideoTrack);
        toast({ title: 'Camera Switched'});
    } catch(err) {
        console.error("Error switching camera", err);
        toast({ title: 'Could not switch camera', variant: 'destructive'});
        localStream.addTrack(videoTrack); // Revert on failure
    }
  }

  const toggleSpeaker = () => {
    setIsSpeakerOn(s => !s);
    toast({ title: isSpeakerOn ? 'Speaker Off' : 'Speaker On'});
  };

  const handleEndCall = async () => {
    if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    pc?.close();
    pc = null;
    localStreamInstance?.getTracks().forEach(track => track.stop());
    localStreamInstance = null;
    setLocalStream(null);
    setRemoteStream(null);
    
    if (callDocRef.current) {
         const docSnap = await getDoc(callDocRef.current);
         if (docSnap.exists()) await deleteDoc(callDocRef.current);
    }
    onEndCall();
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  return (
    <div className="absolute inset-0 bg-gray-900 text-white flex flex-col z-50 overflow-hidden" onClick={toggleControls}>
        <AnimatePresence>
            <motion.div
                key={isVideoEnabled && hasPermission ? 'video-bg' : 'audio-bg'}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={cn("absolute inset-0 w-full h-full transition-all duration-500", !isVideoEnabled && "bg-gradient-to-br from-gray-700 via-gray-800 to-gray-900")}
            >
               <div className="absolute inset-0 opacity-20">
                    <motion.div className="absolute h-96 w-96 bg-green-500/50 rounded-full -top-20 -left-20" animate={{ scale: [1, 1.2, 1], x: [0, 20, 0] }} transition={{ duration: 15, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }} />
                    <motion.div className="absolute h-80 w-80 bg-blue-500/50 rounded-full -bottom-20 -right-20" animate={{ scale: [1, 1.2, 1], y: [0, -20, 0] }} transition={{ duration: 12, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}/>
                </div>
            </motion.div>
        </AnimatePresence>

      <motion.div 
        className="call-overlay absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent flex flex-col justify-between"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}
      >
        <AnimatePresence>
        {showControls && (
            <motion.div 
                className="text-center pt-6 z-10"
                initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }}
            >
                <h2 className="text-3xl font-bold font-headline text-shadow">{contact.name}</h2>
                 <p className="text-lg text-white/80 text-shadow">
                    {isCallConnected ? formatDuration(callDuration) : isAudioCall ? 'Calling...' : 'Connecting...'}
                </p>
            </motion.div>
        )}
        </AnimatePresence>
        
        <div className="absolute inset-0 flex items-center justify-center">
            <AnimatePresence>
            {isAudioCall ? (
                 <motion.div key="audio-view" className="flex-grow flex flex-col items-center justify-center p-6"
                    initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
                    <ParticipantAvatar participant={contact} isAudioCall={isAudioCall} />
                </motion.div>
            ) : (
                 <motion.div key="video-view" ref={localVideoContainerRef} className="w-full h-full flex flex-col items-center justify-center relative"
                    initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
                    <div className="absolute inset-0 w-full h-full" onClick={e => { e.stopPropagation(); toggleControls(); }}>
                       <ParticipantVideo participant={contact} isLocal={false} stream={remoteStream} isVideoEnabled={true} isAudioOnly={false} isMuted={!isSpeakerOn}/>
                    </div>
                    
                    <motion.div 
                        className="absolute w-28 h-40 z-10 cursor-move"
                        drag dragConstraints={localVideoContainerRef} dragSnapToOrigin={false} dragElastic={0.1}
                        initial={{ top: 20, right: 20, x:0, y:0 }}
                        dragTransition={{ bounceStiffness: 600, bounceDamping: 20 }}
                        onClick={e => e.stopPropagation()}
                    >
                        <ParticipantVideo participant={{id: user.uid, name: 'You', emoji: user.emoji}} isLocal={true} stream={localStream} isVideoEnabled={isVideoEnabled} isAudioOnly={false} />
                    </motion.div>
                    
                    {hasPermission === false && type === 'video' && (
                        <Alert variant="destructive" className="absolute top-24 w-auto z-20">
                            <AlertTitle>Media Access Denied</AlertTitle>
                            <AlertDescription>Enable camera and mic permissions.</AlertDescription>
                        </Alert>
                    )}
               </motion.div>
            )}
            </AnimatePresence>
        </div>

        <AnimatePresence>
        {showControls && (
            <motion.div 
                className="flex flex-col items-center gap-6 pb-6 z-10"
                initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-center gap-4 p-4 bg-black/40 rounded-full backdrop-blur-md border border-white/10">
                    <Button variant="ghost" size="icon" onClick={toggleVideo} className={cn("w-14 h-14 rounded-full text-white hover:bg-white/20", !isVideoEnabled && "bg-white/10", isAudioCall && "hidden")} disabled={isAudioCall || !hasPermission}>
                        {isVideoEnabled ? <VideoIcon className="h-7 w-7" /> : <VideoOffIcon className="h-7 w-7" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={toggleMute} className={cn("w-14 h-14 rounded-full text-white hover:bg-white/20", isMuted && "bg-destructive/50")}>
                        {isMuted ? <MicOffIcon className="h-7 w-7" /> : <MicIcon className="h-7 w-7" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={switchCamera} className={cn("w-14 h-14 rounded-full text-white hover:bg-white/20 disabled:opacity-50", isAudioCall && "hidden")} disabled={isAudioCall || !isVideoEnabled || !hasPermission}>
                        <SwitchCameraIcon className="h-7 w-7" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={toggleSpeaker} className={cn("w-14 h-14 rounded-full text-white hover:bg-white/20", isSpeakerOn && "bg-white/10")}>
                        <SpeakerIcon className="h-7 w-7" />
                    </Button>
                </div>
                <Button onClick={() => handleEndCall()} className="bg-destructive hover:bg-destructive/80 text-destructive-foreground rounded-full w-20 h-20 shadow-lg">
                    <EndCallIcon className="h-10 w-10" />
                </Button>
            </motion.div>
        )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
