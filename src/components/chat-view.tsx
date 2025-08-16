'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { AppUser, Contact, Message } from './app-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { BackIcon, VoiceCallIcon, VideoCallIcon, MoreOptionsIcon, SendIcon, MicIcon } from '@/components/icons';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { useToast } from '@/hooks/use-toast';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, CheckCheck, Paperclip, PauseCircleIcon, PlayCircle, Trash2, Camera } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import { Timestamp } from 'firebase/firestore';
import CameraModal from './modals/camera-modal';


interface ChatViewProps {
  user: AppUser;
  contact: Contact;
  messages: Message[];
  onBack: () => void;
  onStartCall: (contact: Contact, type: 'video' | 'voice') => void;
  onSendMessage: (contactId: string, content: string | File, type?: Message['type'], options?: { duration?: number, caption?: string }) => void;
  onOpenProfile: () => void;
  onClearChat: (contactId: string) => void;
  onBlockContact: (contactId: string, isBlocked: boolean) => void;
  onDeleteChat: (contactId: string) => void;
  onFileSelected: (file: File) => void;
}

const AudioPlayer = ({ src, duration }: { src: string, duration?: number }) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);

    const togglePlay = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const formatTime = (time: number) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    useEffect(() => {
        const audio = audioRef.current;
        const updateProgress = () => {
            if (audio) {
                setProgress((audio.currentTime / audio.duration) * 100);
                setCurrentTime(audio.currentTime);
            }
        };
        const onEnded = () => setIsPlaying(false);

        if (audio) {
            audio.addEventListener('timeupdate', updateProgress);
            audio.addEventListener('ended', onEnded);
        }

        return () => {
            if (audio) {
                audio.removeEventListener('timeupdate', updateProgress);
                audio.removeEventListener('ended', onEnded);
            }
        };
    }, []);

    return (
        <div className="flex items-center gap-2 w-full max-w-xs">
            <audio ref={audioRef} src={src} preload="metadata" />
            <Button variant="ghost" size="icon" onClick={togglePlay} className="h-10 w-10 shrink-0">
                {isPlaying ? <PauseCircleIcon className="h-6 w-6" /> : <PlayCircle className="h-6 w-6" />}
            </Button>
            <div className="flex-grow flex flex-col gap-1">
                <Slider
                    value={[progress]}
                    onValueChange={(value) => {
                        if (audioRef.current) {
                            audioRef.current.currentTime = (value[0] / 100) * audioRef.current.duration;
                        }
                    }}
                    className="w-full h-1.5"
                />
                <div className="text-xs text-muted-foreground flex justify-between">
                    <span>{formatTime(currentTime)}</span>
                    <span>{duration ? formatTime(duration) : '0:00'}</span>
                </div>
            </div>
        </div>
    );
};

const formatMessageTimestamp = (timestamp: any) => {
  if (!timestamp) return '';
  let date: Date;
  if (timestamp instanceof Timestamp) {
    date = timestamp.toDate();
  } else if (timestamp && typeof timestamp.seconds === 'number') {
     date = new Date(timestamp.seconds * 1000);
  }
  else {
    return ''; // Should not happen with firestore server timestamps
  }
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};


const MessageBubble = ({ text, timestamp, isSent, type = 'text', duration, status, caption }: Message & { isSent: boolean }) => {
    const MessageStatus = () => {
        if (!isSent) return null;
        switch(status) {
            case 'sent':
                return <Check className="h-4 w-4 text-muted-foreground" />;
            case 'delivered':
                return <CheckCheck className="h-4 w-4 text-muted-foreground" />;
            case 'seen':
                return <CheckCheck className="h-4 w-4 text-blue-500" strokeWidth={2.5}/>;
            default:
                return <Check className="h-4 w-4 text-muted-foreground" />;
        }
    };
    
    return (
        <div className={cn("flex", isSent ? 'justify-end' : 'justify-start')}>
            <div className={cn(
                "relative max-w-xs lg:max-w-md px-1 py-1 rounded-lg shadow-md", 
                isSent ? 'bg-message-out-bg rounded-br-none' : 'bg-message-in-bg rounded-bl-none',
                type === 'image' && 'p-1 bg-transparent shadow-none',
                type === 'audio' && 'p-2'
            )}>
                {type === 'image' ? (
                    <div className="relative">
                        <Image src={text} alt={caption || "Sent photo"} width={250} height={250} className="rounded-md object-cover" />
                        {caption && <p className="text-sm px-2 py-1 bg-black/50 text-white rounded-b-md absolute bottom-0 left-0 right-0">{caption}</p>}
                        <div className="absolute bottom-1 right-1 text-xs text-white bg-black/50 px-1.5 py-0.5 rounded flex items-center gap-1">
                           <span>{formatMessageTimestamp(timestamp)}</span>
                           <MessageStatus />
                        </div>
                    </div>
                ) : type === 'audio' ? (
                    <div className="flex items-end gap-2">
                        <AudioPlayer src={text} duration={duration} />
                        <div className="flex items-center gap-1 self-end pb-1">
                           <p className="text-xs text-muted-foreground">{formatMessageTimestamp(timestamp)}</p>
                           <MessageStatus />
                        </div>
                    </div>
                ) : (
                    <>
                        <p className="text-sm text-foreground px-2 py-1">{text}</p>
                        <div className="flex justify-end items-center gap-1 mt-1 px-2">
                            <p className="text-xs text-muted-foreground text-right">{formatMessageTimestamp(timestamp)}</p>
                            <MessageStatus />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};


const VoiceRecorder = ({ onSend, onCancel }: { onSend: (dataUrl: string, duration: number) => void, onCancel: () => void }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [duration, setDuration] = useState(0);
    const durationRef = useRef(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const isCancelledRef = useRef(false);

    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            mediaRecorderRef.current = recorder;

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            recorder.onstop = () => {
                stream.getTracks().forEach(track => track.stop());
                if (isCancelledRef.current) {
                    isCancelledRef.current = false;
                    chunksRef.current = [];
                    return;
                }
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                const reader = new FileReader();
                reader.onload = (e) => {
                    const dataUrl = e.target?.result as string;
                    onSend(dataUrl, durationRef.current);
                };
                reader.readAsDataURL(blob);
                chunksRef.current = [];
            };

            recorder.start();
            setIsRecording(true);
            timerRef.current = setInterval(() => {
                durationRef.current += 1;
                setDuration(durationRef.current);
            }, 1000);
        } catch (error) {
            console.error("Error starting recording:", error);
            alert("Could not start recording. Please grant microphone permission.");
            onCancel();
        }
    }, [onCancel, onSend]);

    const stopRecording = (cancelled = false) => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            isCancelledRef.current = cancelled;
            mediaRecorderRef.current.stop();
        }
        setIsRecording(false);
        if(timerRef.current) clearInterval(timerRef.current);
        if (cancelled) {
            onCancel();
        }
    };

    useEffect(() => {
        startRecording();
        return () => {
            if(timerRef.current) clearInterval(timerRef.current);
            if(mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                isCancelledRef.current = true;
                mediaRecorderRef.current.stop();
            }
        };
    }, [startRecording]);
    
    const formatTime = (time: number) => {
        const minutes = Math.floor(time / 60);
        const seconds = time % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex-grow flex items-center justify-between px-4">
            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => stopRecording(true)}>
                <Trash2 className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2 text-muted-foreground">
                <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                <span>{formatTime(duration)}</span>
            </div>
            <Button size="icon" className="rounded-full bg-button-color hover:bg-button-color/90 w-12 h-12" onClick={() => stopRecording(false)}>
                <SendIcon className="h-6 w-6 text-white" />
            </Button>
        </div>
    );
};


export default function ChatView({ user, contact, messages, onBack, onStartCall, onSendMessage, onOpenProfile, onClearChat, onBlockContact, onDeleteChat, onFileSelected }: ChatViewProps) {
  const [newMessage, setNewMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (newMessage.trim()) {
      onSendMessage(contact.id, newMessage.trim());
      setNewMessage('');
    }
  };
  
  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        onFileSelected(file);
      } else {
        toast({
          title: 'File type not supported',
          description: `Sending files other than images is not yet implemented.`,
          variant: 'destructive',
        });
      }
    }
    if(e.target) e.target.value = '';
  };
  
  const handleSendVoiceMessage = (dataUrl: string, duration: number) => {
    onSendMessage(contact.id, dataUrl, 'audio', { duration });
    setIsRecording(false);
  };
  
  const handleSendPhoto = async (photoDataUrl: string) => {
    try {
      const response = await fetch(photoDataUrl);
      const blob = await response.blob();
      const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
      onFileSelected(file);
    } catch (error) {
      console.error("Error converting data URL to file:", error);
      toast({
        variant: "destructive",
        title: "Error sending photo",
        description: "Could not process the captured image."
      })
    }
  }


  useEffect(() => {
    if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (viewport) {
            viewport.scrollTop = viewport.scrollHeight;
        }
    }
  }, [messages]);
  
  const isContactBlocked = user.blocked ? user.blocked[contact.id] : false;

  return (
    <div className="w-full h-full flex flex-col bg-chat-pattern">
      <header className="bg-header-bg text-icon-color flex items-center p-2 gap-2 shadow-md z-10">
        <Button variant="ghost" size="icon" onClick={onBack} className="text-icon-color hover:bg-white/20">
          <BackIcon className="h-6 w-6" />
        </Button>
        <div className="flex items-center gap-3 flex-grow" onClick={onOpenProfile}>
          <Avatar className="h-10 w-10 text-xl cursor-pointer">
            <AvatarFallback>{contact.emoji}</AvatarFallback>
          </Avatar>
          <p className="font-semibold truncate cursor-pointer">{contact.name}</p>
        </div>
        <div className="flex items-center">
            <Button variant="ghost" size="icon" onClick={() => onStartCall(contact, 'voice')} className="text-icon-color hover:bg-white/20">
                <VoiceCallIcon className="h-6 w-6" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onStartCall(contact, 'video')} className="text-icon-color hover:bg-white/20">
                <VideoCallIcon className="h-6 w-6" />
            </Button>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-icon-color hover:bg-white/20">
                        <MoreOptionsIcon className="h-6 w-6" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={onOpenProfile}>View Contact</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onClearChat(contact.id)}>Clear Chat</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onBlockContact(contact.id, isContactBlocked)}>
                        {isContactBlocked ? 'Unblock' : 'Block'}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive" onClick={() => onDeleteChat(contact.id)}>Delete Chat</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </header>

      <ScrollArea className="flex-grow p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} {...msg} isSent={msg.sender === user.uid} />
          ))}
        </div>
      </ScrollArea>
      
      <div id="chat-input-container" className="p-2 bg-secondary border-t flex items-center gap-2">
        {isRecording ? (
            <VoiceRecorder onSend={handleSendVoiceMessage} onCancel={() => setIsRecording(false)} />
        ) : (
             <>
                <div className="flex-grow flex items-center bg-white rounded-full px-3 shadow-sm">
                    <Input 
                        id="chat-input"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend(e)}
                        placeholder="Type a message..." 
                        className="flex-grow bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 h-12 pr-0"
                        autoComplete="off"
                        disabled={isContactBlocked}
                    />
                    <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 text-muted-foreground hover:bg-black/10" onClick={handleAttachClick} disabled={isContactBlocked}>
                        <Paperclip className="h-5 w-5" />
                    </Button>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/jpeg,image/png,image/gif" />
                     <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 text-muted-foreground hover:bg-black/10" onClick={() => setIsCameraOpen(true)} disabled={isContactBlocked}>
                        <Camera className="h-5 w-5" />
                    </Button>
                </div>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={newMessage ? 'send' : 'mic'}
                        initial={{ opacity: 0, scale: 0.7 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.7 }}
                        transition={{ duration: 0.2 }}
                    >
                        {newMessage ? (
                            <Button type="button" size="icon" className="rounded-full bg-button-color hover:bg-button-color/90 w-12 h-12" onClick={handleSend} disabled={isContactBlocked}>
                                <SendIcon className="h-6 w-6 text-white" />
                            </Button>
                        ) : (
                            <Button type="button" size="icon" className="rounded-full bg-button-color hover:bg-button-color/90 w-12 h-12" onClick={() => setIsRecording(true)} disabled={isContactBlocked}>
                                <MicIcon className="h-6 w-6 text-white" />
                            </Button>
                        )}
                    </motion.div>
                </AnimatePresence>
            </>
        )}
      </div>
      <CameraModal 
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onSendPhoto={handleSendPhoto}
      />
    </div>
  );
}
