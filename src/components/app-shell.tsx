'use client';

import { useState, useEffect, useRef } from 'react';
import AuthView from '@/components/auth-view';
import MainView from '@/components/main-view';
import ChatView from '@/components/chat-view';
import CallView from '@/components/call-view';
import ProfileSetupModal from '@/components/modals/profile-setup-modal';
import AddFriendModal from '@/components/modals/add-friend-modal';
import ProfileViewModal from '@/components/modals/profile-view-modal';
import IncomingCallModal from '@/components/modals/incoming-call-modal';
import { mockUser, mockContacts, mockMessages, mockUpdates, mockCalls } from '@/lib/mock-data';
import { AnimatePresence, motion } from 'framer-motion';

export type View = 'auth' | 'main' | 'chat' | 'call';
export type AppUser = typeof mockUser;
export type Contact = (typeof mockContacts)[0];
export type Call = (typeof mockCalls)[0];

export default function AppShell() {
  const [view, setView] = useState<View>('auth');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // State for modals
  const [isProfileSetupOpen, setProfileSetupOpen] = useState(false);
  const [isAddFriendOpen, setAddFriendOpen] = useState(false);
  const [isProfileViewOpen, setProfileViewOpen] = useState(false);
  const [incomingCall, setIncomingCall] = useState<Call | null>(null);

  // State for views
  const [activeChat, setActiveChat] = useState<Contact | null>(null);
  const [activeCall, setActiveCall] = useState<{ contact: Contact; type: 'video' | 'voice' } | null>(null);

  const ringtoneRef = useRef<HTMLAudioElement>(null);

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

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isAuthenticated && !incomingCall && mockCalls.some(c => c.status === 'incoming')) {
        setIncomingCall(mockCalls.find(c => c.status === 'incoming')!);
      }
    }, 10000);
    return () => clearTimeout(timer);
  }, [isAuthenticated, incomingCall]);

  useEffect(() => {
    if (incomingCall && ringtoneRef.current) {
        ringtoneRef.current.play().catch(e => console.error("Autoplay failed", e));
    } else if (!incomingCall && ringtoneRef.current) {
        ringtoneRef.current.pause();
        ringtoneRef.current.currentTime = 0;
    }
  }, [incomingCall]);

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
            contacts={mockContacts}
            updates={mockUpdates}
            calls={mockCalls}
            onStartChat={handleStartChat}
            onOpenAddFriend={() => setAddFriendOpen(true)}
            onOpenProfile={() => setProfileViewOpen(true)}
          />
        );
      case 'chat':
        if (!activeChat) return null;
        return (
          <ChatView
            user={mockUser}
            contact={activeChat}
            messages={mockMessages[activeChat.id] || []}
            onBack={() => setView('main')}
            onStartCall={handleStartCall}
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

      <audio
        id="ringtone"
        ref={ringtoneRef}
        loop
        src="data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA"
      />
    </div>
  );
}
