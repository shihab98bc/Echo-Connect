'use client';

import { useState, useEffect } from 'react';
import AuthView from '@/components/auth-view';
import MainView from '@/components/main-view';
import ChatView from '@/components/chat-view';
import CallView from '@/components/call-view';
import ProfileSetupModal from '@/components/modals/profile-setup-modal';
import AddFriendModal from '@/components/modals/add-friend-modal';
import ProfileViewModal from '@/components/modals/profile-view-modal';
import IncomingCallModal from '@/components/modals/incoming-call-modal';
import { mockUser, mockContacts as initialContacts, mockMessages as initialMessages, mockUpdates as initialUpdates, mockCalls } from '@/lib/mock-data';
import { AnimatePresence, motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';

export type View = 'auth' | 'main' | 'chat' | 'call';
export type AppUser = typeof mockUser;
export type Contact = (typeof initialContacts)[0];
export type Call = (typeof mockCalls)[0];
export type Update = (typeof initialUpdates)[0];
export type Message = { sender: string; text: string; timestamp: string };


export default function AppShell() {
  const [view, setView] = useState<View>('auth');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { toast } = useToast();

  // State for modals
  const [isProfileSetupOpen, setProfileSetupOpen] = useState(false);
  const [isAddFriendOpen, setAddFriendOpen] = useState(false);
  const [isProfileViewOpen, setProfileViewOpen] = useState(false);
  const [incomingCall, setIncomingCall] = useState<Call | null>(null);

  // State for views
  const [activeChat, setActiveChat] = useState<Contact | null>(null);
  const [activeCall, setActiveCall] = useState<{ contact: Contact; type: 'video' | 'voice' } | null>(null);

  // State for data
  const [contacts, setContacts] = useState(initialContacts);
  const [updates, setUpdates] = useState(initialUpdates);
  const [messages, setMessages] = useState(initialMessages);

  const handleLogin = () => {
    setIsAuthenticated(true);
    const isNewUser = !mockUser.name;
    if (isNewUser) {
      setProfileSetupOpen(true);
    } else {
      setView('main');
    }
  };

  const handleSignup = () => {
    setIsAuthenticated(true);
    setProfileSetupOpen(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setView('auth');
  };

  const handleProfileSave = (name: string, emoji: string) => {
    mockUser.name = name;
    mockUser.emoji = emoji;
    setProfileSetupOpen(false);
    setView('main');
  };

  const handleStartChat = (contact: Contact) => {
    setActiveChat(contact);
    setView('chat');
  };

  const handleStartCall = (contact: Contact, type: 'video' | 'voice') => {
    setActiveCall({ contact, type });
    setView('call');
  };

  const handleSendMessage = (contactId: string, message: Message) => {
    setMessages(prev => {
        const newMessages = { ...prev };
        if (!newMessages[contactId]) {
            newMessages[contactId] = [];
        }
        newMessages[contactId] = [...newMessages[contactId], message];
        return newMessages;
    });

    // Also update the last message for the contact in the contact list
    setContacts(prev => prev.map(c => 
        c.id === contactId 
        ? { ...c, lastMessage: message.text, timestamp: message.timestamp }
        : c
    ));
  };


  const handleAcceptRequest = (request: Update) => {
    if (request.type !== 'request') return;
    // Add to contacts
    const newContact: Contact = {
        id: request.from.id,
        name: request.from.name,
        emoji: request.from.emoji,
        lastMessage: 'Say hi!',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        unread: 0,
    };
    setContacts(prev => [newContact, ...prev]);
    // Remove from updates
    setUpdates(prev => prev.filter(u => u !== request));
    toast({
        title: "Friend Request Accepted",
        description: `You are now connected with ${request.from.name}.`
    });
  };

  const handleRejectRequest = (request: Update) => {
    if (request.type !== 'request') return;
     // Remove from updates
     setUpdates(prev => prev.filter(u => u !== request));
     toast({
        title: "Friend Request Rejected",
        description: `You have rejected the request from ${request.from.name}.`
    });
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isAuthenticated && !incomingCall && mockCalls.some(c => c.status === 'incoming')) {
        setIncomingCall(mockCalls.find(c => c.status === 'incoming')!);
      }
    }, 10000);
    return () => clearTimeout(timer);
  }, [isAuthenticated, incomingCall]);

  const viewVariants = {
    initial: { opacity: 0, x: 30 },
    enter: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -30 },
  };

  const renderView = () => {
    switch (view) {
      case 'auth':
        return <AuthView onLogin={handleLogin} onSignup={handleSignup} />;
      case 'main':
        return (
          <MainView
            user={mockUser}
            contacts={contacts}
            updates={updates}
            calls={mockCalls}
            onStartChat={handleStartChat}
            onOpenAddFriend={() => setAddFriendOpen(true)}
            onOpenProfile={() => setProfileViewOpen(true)}
            onAcceptRequest={handleAcceptRequest}
            onRejectRequest={handleRejectRequest}
          />
        );
      case 'chat':
        if (!activeChat) return null;
        return (
          <ChatView
            user={mockUser}
            contact={activeChat}
            messages={messages[activeChat.id] || []}
            onBack={() => setView('main')}
            onStartCall={handleStartCall}
            onSendMessage={handleSendMessage}
          />
        );
      case 'call':
        if (!activeCall) return null;
        return (
          <CallView
            user={mockUser}
            contact={activeCall.contact}
            type={activeCall.type}
            onEndCall={() => {
              setActiveCall(null);
              setView(activeChat ? 'chat' : 'main');
            }}
          />
        );
      default:
        return <AuthView onLogin={handleLogin} onSignup={handleSignup} />;
    }
  };

  return (
    <div id="app-container" className="w-full max-w-[450px] h-[95vh] max-h-[950px] bg-background shadow-wa rounded-lg overflow-hidden flex flex-col relative transition-all duration-300">
      <AnimatePresence mode="wait">
        <motion.div
            key={view}
            variants={viewVariants}
            initial="initial"
            animate="enter"
            exit="exit"
            transition={{ type: "tween", ease: "circOut", duration: 0.3 }}
            className="h-full w-full absolute top-0 left-0"
        >
            <div className="w-full h-full flex flex-col">{renderView()}</div>
        </motion.div>
      </AnimatePresence>

      <ProfileSetupModal isOpen={isProfileSetupOpen} onSave={handleProfileSave} />
      <AddFriendModal isOpen={isAddFriendOpen} onClose={() => setAddFriendOpen(false)} />
      <ProfileViewModal isOpen={isProfileViewOpen} onClose={() => setProfileViewOpen(false)} user={mockUser} onLogout={handleLogout} />
      
      {incomingCall && (
        <IncomingCallModal
          call={incomingCall}
          onAccept={() => {
            const callContact = incomingCall.contact;
            const callType = incomingCall.type;
            setIncomingCall(null);
            handleStartCall(callContact, callType);
          }}
          onReject={() => {
            setIncomingCall(null);
          }}
        />
      )}
    </div>
  );
}
