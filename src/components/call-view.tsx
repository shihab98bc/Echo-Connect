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

  const localVideoContainerRef = useRef<HTMLDivElement>(null);
  const controlsTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  const isAudioCall = type === 'voice';
  
  const callDocRef = useRef<DocumentReference | null>(doc(db, 'calls', callId));


  useEffect(() => {
    let localStreamInstance: MediaStream | null = null;
    let peerConnection: RTCPeerConnection | null = null;

    const setupAndStartCall = async () => {
        peerConnection = new RTCPeerConnection(servers);
        pc = peerConnection; // for cleanup

        // Setup remote stream
        const remote = new MediaStream();
        setRemoteStream(remote);

        peerConnection.ontrack = (event) => {
            event.streams[0].getTracks().forEach((track) => {
                remote.addTrack(track);
            });
        };

        // Get local media
        try {
            localStreamInstance = await navigator.mediaDevices.getUserMedia({
                video: type === 'video',
                audio: true,
            });
            setLocalStream(localStreamInstance);
            setHasPermission(true);

            // Add local tracks to peer connection
            localStreamInstance.getTracks().forEach((track) => {
                if(peerConnection) {
                    peerConnection.addTrack(track, localStreamInstance!);
                }
            });

        } catch (error) {
            console.error('Error accessing media devices.', error);
            setHasPermission(false);
            toast({
                variant: 'destructive',
                title: 'Media Access Denied',
                description: 'Please enable camera and microphone permissions.',
            });
            handleEndCall(true); // end call if permissions denied
            return;
        }

        // --- Signaling Logic ---
        if (!callDocRef.current) return;
        const candidatesCollection = collection(callDocRef.current, isCaller ? 'offerCandidates' : 'answerCandidates');
        
        peerConnection.onicecandidate = event => {
            if (event.candidate) {
                addDoc(candidatesCollection, event.candidate.toJSON());
            }
        };

        if (isCaller) {
            // Create offer
            const offerDescription = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offerDescription);

            const offerPayload = {
                sdp: offerDescription.sdp,
                type: offerDescription.type,
                callerId: user.uid,
            };

            await setDoc(callDocRef.current, { offer: offerPayload });

            // Listen for answer
            const unsubAnswer = onSnapshot(callDocRef.current, (snapshot) => {
                const data = snapshot.data();
                if (peerConnection && !peerConnection.currentRemoteDescription && data?.answer) {
                    const answerDescription = new RTCSessionDescription(data.answer);
                    peerConnection.setRemoteDescription(answerDescription);
                }
            });

            // Listen for answer candidates
            const answerCandidates = collection(callDocRef.current, 'answerCandidates');
            const unsubAnswerCandidates = onSnapshot(answerCandidates, (snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'added') {
                        const candidate = new RTCIceCandidate(change.doc.data());
                        peerConnection?.addIceCandidate(candidate);
                    }
                });
            });

            return () => {
                unsubAnswer();
                unsubAnswerCandidates();
            }

        } else { // Is callee
            if (!offer) return;
            
            await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
            
            const answerDescription = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answerDescription);
            
            const answerPayload = {
                type: answerDescription.type,
                sdp: answerDescription.sdp,
            };
            
            await updateDoc(callDocRef.current, { answer: answerPayload });

            // Listen for offer candidates
            const offerCandidates = collection(callDocRef.current, 'offerCandidates');
            const unsubOfferCandidates = onSnapshot(offerCandidates, (snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'added') {
                        const candidate = new RTCIceCandidate(change.doc.data());
                        peerConnection?.addIceCandidate(candidate);
                    }
                });
            });
            
            return () => {
                unsubOfferCandidates();
            }
        }
    };
    
    const unsubPromise = setupAndStartCall();

    const handleEndCall = async (isError = false) => {
        if (peerConnection) {
            peerConnection.close();
            peerConnection = null;
        }
        pc = null;
        localStreamInstance?.getTracks().forEach(track => track.stop());
        setLocalStream(null);
        setRemoteStream(null);
        
        if (callDocRef.current && !isError) {
             if (await getDoc(callDocRef.current)) {
                await deleteDoc(callDocRef.current);
             }
        }
        onEndCall();
    };

    return () => {
        unsubPromise.then(unsub => {
            if (unsub) unsub();
        });
        
        if (peerConnection) {
            peerConnection.close();
            peerConnection = null;
        }
        pc = null;
        localStreamInstance?.getTracks().forEach(track => track.stop());
        setLocalStream(null);
        setRemoteStream(null);

        if (callDocRef.current) {
            getDoc(callDocRef.current).then(docSnap => {
                if (docSnap.exists() && isCaller) {
                    deleteDoc(callDocRef.current!);
                }
            })
        }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, user.uid, callId, isCaller, offer, toast]);
  
  
  useEffect(() => {
    if (controlsTimerRef.current) {
      clearTimeout(controlsTimerRef.current);
    }
    if (showControls && !isAudioCall) {
      controlsTimerRef.current = setTimeout(() => {
        setShowControls(false);
      }, 5000);
    }
    return () => {
      if (controlsTimerRef.current) {
        clearTimeout(controlsTimerRef.current);
      }
    };
  }, [showControls, isAudioCall]);

  const toggleControls = () => {
    if (isAudioCall) return;
    setShowControls(s => !s);
  };

  const isGroupCall = 'isGroup' in contact && (contact as any).isGroup;
  const participants = isGroupCall && 'members' in contact ? (contact as any).members : [contact];
  const remoteParticipants = participants.filter((p: any) => p.id !== user.uid);
  const localParticipant = { id: user.uid, name: "You", emoji: user.emoji };
  
  const toggleMute = () => {
    localStream?.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
    });
    setIsMuted(m => !m);
    toast({ title: isMuted ? 'Microphone Unmuted' : 'Microphone Muted'});
  };

  const toggleVideo = () => {
    if (type === 'voice') return;
    if (hasPermission === false) {
        toast({
            variant: 'destructive',
            title: 'Camera Not Available',
            description: 'Cannot enable video without camera permission.'
        });
        return;
    }
    localStream?.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
    })
    setIsVideoEnabled(v => !v);
    toast({ title: isVideoEnabled ? 'Video Off' : 'Video On'});
  };

  const switchCamera = async () => {
    if(!isVideoEnabled || !localStream) return;
    const videoTrack = localStream.getVideoTracks()[0];
    // @ts-ignore
    const currentFacingMode = videoTrack.getSettings().facingMode;
    const newFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';

    // stop current track
    videoTrack.stop();

    try {
        const newStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: newFacingMode },
            audio: true
        });
        const newVideoTrack = newStream.getVideoTracks()[0];
        
        // replace track in local stream
        localStream.removeTrack(videoTrack);
        localStream.addTrack(newVideoTrack);
        
        toast({ title: 'Camera Switched'});
    } catch(err) {
        console.error("Error switching camera", err);
        toast({ title: 'Could not switch camera', variant: 'destructive'});
        // revert to old track if failed
        localStream.addTrack(videoTrack);
    }
  }

  const toggleSpeaker = () => {
    setIsSpeakerOn(s => !s);
    toast({ title: isSpeakerOn ? 'Speaker Off' : 'Speaker On'});
  };

  return (
    <div className="absolute inset-0 bg-gray-900 text-white flex flex-col z-50 overflow-hidden" onClick={toggleControls}>
        {/* Background */}
        <AnimatePresence>
            <motion.div
                key={isVideoEnabled && hasPermission ? 'video-bg' : 'audio-bg'}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={cn(
                    "absolute inset-0 w-full h-full transition-all duration-500",
                    !isVideoEnabled && "bg-gradient-to-br from-gray-700 via-gray-800 to-gray-900"
                )}
            >
               <div className="absolute inset-0 opacity-20">
                    <motion.div className="absolute h-96 w-96 bg-green-500/50 rounded-full -top-20 -left-20" animate={{ scale: [1, 1.2, 1], x: [0, 20, 0] }} transition={{ duration: 15, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }} />
                    <motion.div className="absolute h-80 w-80 bg-blue-500/50 rounded-full -bottom-20 -right-20" animate={{ scale: [1, 1.2, 1], y: [0, -20, 0] }} transition={{ duration: 12, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}/>
                </div>
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
        <AnimatePresence>
        {showControls && (
            <motion.div 
                className="text-center pt-6 z-10"
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                transition={{ duration: 0.3 }}
            >
                <h2 className="text-3xl font-bold font-headline text-shadow">{contact.name}</h2>
                <p className="text-lg text-white/80 text-shadow">
                    {isGroupCall ? `Group ${type} call` : isAudioCall ? 'Calling...' : 'Video Call'}
                </p>
            </motion.div>
        )}
        </AnimatePresence>
        

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
                            participants.map((p: any) => <ParticipantAvatar key={p.id} participant={p} isAudioCall={isAudioCall} />)
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
                    <div className="absolute inset-0 w-full h-full" onClick={e => { e.stopPropagation(); toggleControls(); }}>
                       <ParticipantVideo participant={contact} isLocal={false} stream={remoteStream} isVideoEnabled={true} isAudioOnly={false} isMuted={!isSpeakerOn}/>
                    </div>

                    
                      <motion.div 
                          className="absolute w-28 h-40 z-10 cursor-move"
                          drag
                          dragConstraints={localVideoContainerRef}
                          dragSnapToOrigin={false}
                          dragElastic={0.1}
                          initial={{ top: 20, right: 20, x:0, y:0 }}
                          dragTransition={{ bounceStiffness: 600, bounceDamping: 20 }}
                          onClick={e => e.stopPropagation()}
                      >
                          <ParticipantVideo participant={localParticipant} isLocal={true} stream={localStream} isVideoEnabled={isVideoEnabled} isAudioOnly={false} />
                      </motion.div>
                    

                    {hasPermission === false && type === 'video' && (
                        <Alert variant="destructive" className="absolute top-24 w-auto z-20">
                            <AlertTitle>Media Access Denied</AlertTitle>
                            <AlertDescription>
                                Please enable camera and mic permissions.
                            </AlertDescription>
                        </Alert>
                    )}
               </motion.div>
            )}
            </AnimatePresence>
        </div>


        {/* Call Controls */}
        <AnimatePresence>
        {showControls && (
            <motion.div 
                className="flex flex-col items-center gap-6 pb-6 z-10"
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                transition={{ duration: 0.3 }}
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-center gap-4 p-4 bg-black/40 rounded-full backdrop-blur-md border border-white/10">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleVideo}
                        className={cn("w-14 h-14 rounded-full text-white hover:bg-white/20", !isVideoEnabled && "bg-white/10", isAudioCall && "hidden")}
                        disabled={isAudioCall || hasPermission === false}
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
                        disabled={isAudioCall || !isVideoEnabled || hasPermission === false}
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
                    onClick={() => onEndCall()}
                    className="bg-destructive hover:bg-destructive/80 text-destructive-foreground rounded-full w-20 h-20 shadow-lg"
                >
                    <EndCallIcon className="h-10 w-10" />
                </Button>
            </motion.div>
        )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
