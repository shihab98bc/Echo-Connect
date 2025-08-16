'use client';

import { useState } from 'react';
import { AppUser, Contact, Message } from './app-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { BackIcon, VoiceCallIcon, VideoCallIcon, MoreOptionsIcon, SendIcon } from '@/components/icons';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ChatViewProps {
  user: AppUser;
  contact: Contact;
  messages: Message[];
  onBack: () => void;
  onStartCall: (contact: Contact, type: 'video' | 'voice') => void;
  onSendMessage: (contactId: string, message: Message) => void;
}

const MessageBubble = ({ text, timestamp, isSent }: { text: string; timestamp: string; isSent: boolean }) => (
    <div className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}>
        <div className={`relative max-w-xs lg:max-w-md px-3 py-2 rounded-lg shadow-md ${isSent ? 'bg-message-out-bg rounded-br-none' : 'bg-message-in-bg rounded-bl-none'}`}>
            <p className="text-sm text-foreground">{text}</p>
            <p className="text-xs text-muted-foreground text-right mt-1">{timestamp}</p>
        </div>
    </div>
);

export default function ChatView({ user, contact, messages, onBack, onStartCall, onSendMessage }: ChatViewProps) {
  const [newMessage, setNewMessage] = useState('');

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      const message: Message = {
        sender: user.uid,
        text: newMessage.trim(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      onSendMessage(contact.id, message);
      setNewMessage('');
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-chat-pattern">
      <header className="bg-header-bg text-icon-color flex items-center p-2 gap-2 shadow-md z-10">
        <Button variant="ghost" size="icon" onClick={onBack} className="text-icon-color hover:bg-white/20">
          <BackIcon className="h-6 w-6" />
        </Button>
        <Avatar className="h-10 w-10 text-xl">
          <AvatarFallback>{contact.emoji}</AvatarFallback>
        </Avatar>
        <p className="font-semibold flex-grow truncate">{contact.name}</p>
        <div className="flex items-center">
            <Button variant="ghost" size="icon" onClick={() => onStartCall(contact, 'voice')} className="text-icon-color hover:bg-white/20">
                <VoiceCallIcon className="h-6 w-6" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onStartCall(contact, 'video')} className="text-icon-color hover:bg-white/20">
                <VideoCallIcon className="h-6 w-6" />
            </Button>
            <Button variant="ghost" size="icon" className="text-icon-color hover:bg-white/20">
                <MoreOptionsIcon className="h-6 w-6" />
            </Button>
        </div>
      </header>

      <ScrollArea className="flex-grow p-4">
        <div className="space-y-4">
          {messages.map((msg, index) => (
            <MessageBubble key={index} text={msg.text} timestamp={msg.timestamp} isSent={msg.sender === user.uid} />
          ))}
        </div>
      </ScrollArea>
      
      <div id="chat-input-container" className="p-2 bg-secondary border-t">
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <Input 
            id="chat-input"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..." 
            className="flex-grow rounded-full bg-white"
          />
          <Button type="submit" size="icon" className="rounded-full bg-button-color hover:bg-button-color/90 w-12 h-12">
            <SendIcon className="h-6 w-6 text-white" />
          </Button>
        </form>
      </div>
    </div>
  );
}
