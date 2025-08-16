'use client';

import { useState, useRef, useEffect } from 'react';
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
} from "@/components/ui/dropdown-menu"
import { useToast } from '@/hooks/use-toast';
import { AnimatePresence, motion } from 'framer-motion';
import { CameraIcon, Paperclip } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';


interface ChatViewProps {
  user: AppUser;
  contact: Contact;
  messages: Message[];
  onBack: () => void;
  onStartCall: (contact: Contact, type: 'video' | 'voice') => void;
  onSendMessage: (contactId: string, message: string) => void;
  onOpenProfile: () => void;
  onToggleMute: (contactId: string) => void;
  onClearChat: (contactId: string) => void;
  onBlockContact: (contactId: string) => void;
  onOpenCamera: () => void;
}

const MessageBubble = ({ text, timestamp, isSent, type = 'text' }: { text: string; timestamp: string; isSent: boolean; type?: 'text' | 'image' }) => (
    <div className={cn("flex", isSent ? 'justify-end' : 'justify-start')}>
        <div className={cn(
            "relative max-w-xs lg:max-w-md px-1 py-1 rounded-lg shadow-md", 
            isSent ? 'bg-message-out-bg rounded-br-none' : 'bg-message-in-bg rounded-bl-none',
            type === 'image' && 'p-1 bg-transparent shadow-none'
        )}>
            {type === 'image' ? (
                <div className="relative">
                    <Image src={text} alt="Sent photo" width={250} height={250} className="rounded-md" />
                    <p className="absolute bottom-1 right-1 text-xs text-white bg-black/50 px-1 py-0.5 rounded">{timestamp}</p>
                </div>
            ) : (
                <>
                    <p className="text-sm text-foreground px-2 py-1">{text}</p>
                    <p className="text-xs text-muted-foreground text-right mt-1 px-2">{timestamp}</p>
                </>
            )}
        </div>
    </div>
);

export default function ChatView({ user, contact, messages, onBack, onStartCall, onSendMessage, onOpenProfile, onToggleMute, onClearChat, onBlockContact, onOpenCamera }: ChatViewProps) {
  const [newMessage, setNewMessage] = useState('');
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      onSendMessage(contact.id, newMessage.trim());
      setNewMessage('');
    }
  };

  const handleFeatureNotImplemented = (feature: string) => {
    toast({
        title: "Feature not available",
        description: `${feature} has not been implemented yet.`,
    });
  };
  
  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onSendMessage(contact.id, `📄 File: ${file.name}`);
      toast({
        title: 'File Sent',
        description: `${file.name} has been sent.`,
      });
    }
    // Reset file input
    if(e.target) {
        e.target.value = '';
    }
  };


  useEffect(() => {
    if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (viewport) {
            viewport.scrollTop = viewport.scrollHeight;
        }
    }
  }, [messages]);

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
                    <DropdownMenuItem onClick={() => handleFeatureNotImplemented('Search')}>Search</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onToggleMute(contact.id)}>
                        {contact.isMuted ? 'Unmute Notifications' : 'Mute Notifications'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onClearChat(contact.id)}>Clear Chat</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={() => onBlockContact(contact.id)}>Block</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </header>

      <ScrollArea className="flex-grow p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.map((msg, index) => (
            <MessageBubble key={index} text={msg.text} timestamp={msg.timestamp} isSent={msg.sender === user.uid} type={msg.type} />
          ))}
        </div>
      </ScrollArea>
      
      <div id="chat-input-container" className="p-2 bg-secondary border-t flex items-center gap-2">
        <div className="flex-grow relative">
            <Input 
                id="chat-input"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..." 
                className="flex-grow rounded-full bg-white pr-24"
                autoComplete="off"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 text-muted-foreground hover:bg-black/10" onClick={handleAttachClick}>
                    <Paperclip className="h-5 w-5" />
                </Button>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 text-muted-foreground hover:bg-black/10" onClick={onOpenCamera}>
                    <CameraIcon className="h-5 w-5" />
                </Button>
            </div>
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
                    <Button type="button" size="icon" className="rounded-full bg-button-color hover:bg-button-color/90 w-12 h-12" onClick={handleSend}>
                        <SendIcon className="h-6 w-6 text-white" />
                    </Button>
                ) : (
                    <Button type="button" size="icon" className="rounded-full bg-button-color hover:bg-button-color/90 w-12 h-12" onClick={() => handleFeatureNotImplemented('Voice message')}>
                        <MicIcon className="h-6 w-6 text-white" />
                    </Button>
                )}
            </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
