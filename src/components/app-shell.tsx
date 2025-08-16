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
  const [user, setUser] = useState(mockUser);
  const [contacts, setContacts] = useState(initialContacts);
  const [updates, setUpdates] = useState(initialUpdates);
  const [messages, setMessages] = useState(initialMessages);

  // State for chat selection
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedChats, setSelectedChats] = useState<string[]>([]);

  const handleLogin = () => {
    setIsAuthenticated(true);
    const isNewUser = !user.name;
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
    setActiveChat(null);
    setActiveCall(null);
    setIncomingCall(null);
  };

  const handleProfileSave = (name: string, emoji: string) => {
    setUser(prev => ({...prev, name, emoji}));
    setProfileSetupOpen(false);
    setView('main');
  };

  const handleStartChat = (contact: Contact) => {
    setContacts(prev => prev.map(c => 
        c.id === contact.id 
        ? { ...c, unread: 0 }
        : c
    ));
    setActiveChat(contact);
    setView('chat');
  };

  const handleStartCall = (contact: Contact, type: 'video' | 'voice') => {
    setActiveCall({ contact, type });
    setView('call');
  };

  const handleEndCall = () => {
    setActiveCall(null);
    setView(activeChat ? 'chat' : 'main');
  };

  const handleSendMessage = (contactId: string, messageText: string) => {
    const message: Message = {
      sender: user.uid,
      text: messageText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => {
        const newMessages = { ...prev };
        if (!newMessages[contactId]) {
            newMessages[contactId] = [];
        }
        newMessages[contactId] = [...newMessages[contactId], message];
        return newMessages;
    });

    setContacts(prev => prev.map(c => 
        c.id === contactId 
        ? { ...c, lastMessage: message.text, timestamp: message.timestamp, unread: 0 }
        : c
    ).sort((a,b) => a.id === contactId ? -1 : b.id === contactId ? 1 : 0));
  };

  const handleToggleMute = (contactId: string) => {
    let contactName = '';
    let isMuted: boolean | undefined = false;
    
    setContacts(prev => prev.map(c => {
        if (c.id === contactId) {
            contactName = c.name;
            isMuted = !c.isMuted;
            return { ...c, isMuted: !c.isMuted };
        }
        return c;
    }));

    toast({
        title: isMuted ? "Notifications Muted" : "Notifications Unmuted",
        description: `You will no longer receive notifications from ${contactName}.`,
    });
  };

  const handleClearChat = (contactId: string) => {
    const contactName = contacts.find(c => c.id === contactId)?.name || 'this contact';

    setMessages(prev => {
        const newMessages = { ...prev };
        if (newMessages[contactId]) {
            newMessages[contactId] = [];
        }
        return newMessages;
    });

    setContacts(prev => prev.map(c => 
        c.id === contactId 
        ? { ...c, lastMessage: 'Chat cleared', timestamp: '' } 
        : c
    ));
    
    toast({
        title: "Chat Cleared",
        description: `Your chat history with ${contactName} has been cleared.`,
    });
  };

  const handleBlockContact = (contactId: string) => {
    const contact = contacts.find(c => c.id === contactId);
    if (!contact) return;

    setUser(prevUser => ({
        ...prevUser,
        blocked: { ...prevUser.blocked, [contactId]: true }
    }));
    
    setActiveChat(null);
    setView('main');

    toast({
        title: 'Contact Blocked',
        description: `You have blocked ${contact.name}.`,
    });
  };

  const handleAcceptRequest = (request: Update) => {
    if (request.type !== 'request') return;
    const newContact: Contact = {
        id: request.from.id,
        name: request.from.name,
        emoji: request.from.emoji,
        lastMessage: 'Say hi!',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        unread: 0,
        isMuted: false,
    };
    setContacts(prev => [newContact, ...prev]);
    setUpdates(prev => prev.filter(u => u.id !== request.id));
    toast({
        title: "Friend Request Accepted",
        description: `You are now connected with ${request.from.name}.`
    });
  };

  const handleRejectRequest = (request: Update) => {
    if (request.type !== 'request') return;
     setUpdates(prev => prev.filter(u => u.id !== request.id));
     toast({
        title: "Friend Request Rejected",
        description: `You have rejected the request from ${request.from.name}.`
    });
  };

  const handleToggleChatSelection = (contactId: string) => {
    setSelectedChats(prev => 
        prev.includes(contactId) 
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };
  
  const handleEnterSelectionMode = (contactId: string) => {
    setIsSelectionMode(true);
    setSelectedChats([contactId]);
  };

  const handleExitSelectionMode = () => {
    setIsSelectionMode(false);
    setSelectedChats([]);
  };

  const handleDeleteSelectedChats = () => {
    setContacts(prev => prev.filter(c => !selectedChats.includes(c.id)));
    setMessages(prev => {
        const newMessages = { ...prev };
        selectedChats.forEach(id => {
            delete newMessages[id];
        });
        return newMessages;
    });
    toast({
        title: `${selectedChats.length} chat(s) deleted.`,
    });
    handleExitSelectionMode();
  };


  // Simulate receiving an incoming call for demo purposes
  /*
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isAuthenticated && !incomingCall && !activeCall) {
        const nextCall = mockCalls.find(c => c.status === 'incoming' && c.id === 'call3');
        if (nextCall) {
            setIncomingCall(nextCall);
        }
      }
    }, 10000);
    return () => clearTimeout(timer);
  }, [isAuthenticated, incomingCall, activeCall]);
  */


  const viewVariants = {
    initial: { opacity: 0, x: 30 },
    enter: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -30 },
  };

  const visibleContacts = contacts.filter(c => !user.blocked[c.id]);

  const renderView = () => {
    switch (view) {
      case 'auth':
        return <AuthView onLogin={handleLogin} onSignup={handleSignup} />;
      case 'main':
        return (
          <MainView
            user={user}
            contacts={visibleContacts}
            updates={updates}
            calls={mockCalls}
            onStartChat={handleStartChat}
            onOpenAddFriend={() => setAddFriendOpen(true)}
            onOpenProfile={() => setProfileViewOpen(true)}
            onAcceptRequest={handleAcceptRequest}
            onRejectRequest={handleRejectRequest}
            onStartCall={handleStartCall}
            isSelectionMode={isSelectionMode}
            selectedChats={selectedChats}
            onToggleChatSelection={handleToggleChatSelection}
            onEnterSelectionMode={handleEnterSelectionMode}
            onExitSelectionMode={handleExitSelectionMode}
            onDeleteSelectedChats={handleDeleteSelectedChats}
          />
        );
      case 'chat':
        if (!activeChat) return null;
        return (
          <ChatView
            user={user}
            contact={activeChat}
            messages={messages[activeChat.id] || []}
            onBack={() => {
              setActiveChat(null);
              setView('main');
            }}
            onStartCall={handleStartCall}
            onSendMessage={handleSendMessage}
            onOpenProfile={() => setProfileViewOpen(true)}
            onToggleMute={handleToggleMute}
            onClearChat={handleClearChat}
            onBlockContact={handleBlockContact}
          />
        );
      case 'call':
        if (!activeCall) return null;
        return (
          <CallView
            user={user}
            contact={activeCall.contact}
            type={activeCall.type}
            onEndCall={handleEndCall}
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
            key={view + (isSelectionMode ? '-select' : '')}
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
      <AddFriendModal isOpen={isAddFriendOpen} onClose={() => setAddFriendOpen(false)} onAddFriend={(name) => {
        const newContact = {
          id: `user${contacts.length + 10}`,
          name,
          emoji: '👋',
          lastMessage: 'Say hi!',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          unread: 0,
          isMuted: false,
        };
        setContacts(prev => [newContact, ...prev]);
        setAddFriendOpen(false);
      }} />
      <ProfileViewModal isOpen={isProfileViewOpen} onClose={() => setProfileViewOpen(false)} user={user} onLogout={handleLogout} />
      
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
            toast({
              title: "Call Rejected",
              description: `You rejected the call from ${incomingCall.contact.name}.`,
            });
          }}
        />
      )}
    </div>
  );
}
