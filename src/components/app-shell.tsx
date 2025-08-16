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
import SecurityModal from '@/components/modals/security-modal';
import CameraModal from '@/components/modals/camera-modal';
import { mockContacts as initialContacts, mockMessages as initialMessages, mockUpdates as initialUpdates, mockCalls, mockUser } from '@/lib/mock-data';
import { AnimatePresence, motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';

export type View = 'auth' | 'main' | 'chat' | 'call';
export type AppUser = {
  uid: string;
  name: string | null;
  emoji: string;
  id: string | null;
  photoURL: string | null;
  blocked: Record<string, boolean>;
};
export type Contact = (typeof initialContacts)[0];
export type Call = (typeof mockCalls)[0];
export type Update = (typeof initialUpdates)[0];
export type Message = { sender: string; text: string; timestamp: string, type?: 'text' | 'image' | 'audio', duration?: number };


export default function AppShell() {
  const [view, setView] = useState<View>('auth');
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const { toast } = useToast();

  // State for modals
  const [isProfileSetupOpen, setProfileSetupOpen] = useState(false);
  const [isAddFriendOpen, setAddFriendOpen] = useState(false);
  const [isProfileViewOpen, setProfileViewOpen] = useState(false);
  const [isSecurityModalOpen, setSecurityModalOpen] = useState(false);
  const [isCameraOpen, setCameraOpen] = useState(false);
  const [incomingCall, setIncomingCall] = useState<Call | null>(null);

  // State for views
  const [activeChat, setActiveChat] = useState<Contact | null>(null);
  const [activeCall, setActiveCall] = useState<{ contact: Contact; type: 'video' | 'voice' } | null>(null);

  // State for data
  const [contacts, setContacts] = useState(initialContacts);
  const [updates, setUpdates] = useState(initialUpdates);
  const [messages, setMessages] = useState(initialMessages);

  // State for chat selection
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedChats, setSelectedChats] = useState<string[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
        if (firebaseUser) {
            const isNewUser = !firebaseUser.displayName;
            const appUser: AppUser = {
                uid: firebaseUser.uid,
                name: firebaseUser.displayName,
                emoji: '😎', // Default emoji, can be changed in profile setup
                id: firebaseUser.email,
                photoURL: firebaseUser.photoURL,
                blocked: {}, // Load from DB in a real app
            };
            setCurrentUser(appUser);
            
            if (isNewUser) {
                setProfileSetupOpen(true);
            } else {
                setContacts(initialContacts);
                setMessages(initialMessages);
                setUpdates(initialUpdates);
                setView('main');
            }
        } else {
            setCurrentUser(null);
            setView('auth');
            setContacts([]);
            setMessages({});
            setUpdates([]);
        }
    });

    return () => unsubscribe();
  }, []);


  const handleLogin = () => {
    // onAuthStateChanged will handle the view change
  };

  const handleSignup = () => {
    // onAuthStateChanged will handle the view change and open profile setup
  };

  const handleLogout = async () => {
    try {
        await signOut(auth);
        setActiveChat(null);
        setActiveCall(null);
        setIncomingCall(null);
    } catch (error) {
        toast({
            variant: 'destructive',
            title: 'Logout Failed',
            description: 'An error occurred while signing out.',
        });
    }
  };

  const handleProfileSave = (name: string, emoji: string) => {
    if (currentUser) {
        const welcomeBotId = 'welcome-bot';
        const welcomeMessage = {
            sender: welcomeBotId,
            text: `Welcome to EchoConnect, ${name}! To get started, tap the icon in the top right to add a friend.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            type: 'text' as const
        };
        const welcomeContact: Contact = {
            id: welcomeBotId,
            name: 'Welcome to EchoConnect',
            emoji: '👋',
            lastMessage: welcomeMessage.text,
            timestamp: welcomeMessage.timestamp,
            unread: 1,
            isMuted: false,
        };

        setContacts([welcomeContact]);
        setMessages({ [welcomeBotId]: [welcomeMessage]});
        setUpdates(initialUpdates);

        // In a real app, update the user profile in Firebase Auth and your database
        setCurrentUser(prev => prev ? ({...prev, name, emoji}) : null);
        setProfileSetupOpen(false);
        setView('main');
    }
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

  const handleSendMessage = (contactId: string, messageText: string, type: Message['type'] = 'text', duration?: number) => {
    if (!currentUser) return;
    const message: Message = {
      sender: currentUser.uid,
      text: messageText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: type,
    };
    if (duration) {
      message.duration = duration;
    }

    setMessages(prev => {
        const newMessages = { ...prev };
        if (!newMessages[contactId]) {
            newMessages[contactId] = [];
        }
        newMessages[contactId] = [...newMessages[contactId], message];
        return newMessages;
    });
    
    let lastMessageText = message.text;
    if (type === 'image') lastMessageText = '📷 Photo';
    if (type === 'audio') lastMessageText = '🎤 Voice message';


    setContacts(prev => prev.map(c => 
        c.id === contactId 
        ? { ...c, lastMessage: lastMessageText, timestamp: message.timestamp, unread: 0 }
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
    if (!contact || !currentUser) return;

    setCurrentUser(prevUser => prevUser ? ({
        ...prevUser,
        blocked: { ...prevUser.blocked, [contactId]: true }
    }) : null);
    
    setActiveChat(null);
    setView('main');

    toast({
        title: 'Contact Blocked',
        description: `You have blocked ${contact.name}.`,
    });
  };
  
  const handleAddFriend = (friendId: string) => {
    if (!currentUser) return;
    // For demonstration, we'll create a new mock request in the updates list.
    // In a real app, this would send a request to a server.
    const newRequest: Update = {
      id: `req_${Date.now()}`,
      type: 'request',
      from: {
        id: friendId, // In a real app, you'd fetch this user's data
        name: friendId,
        emoji: '👋',
      },
    };

    setUpdates(prev => [newRequest, ...prev]);
    
    toast({
        title: "Friend Request Sent",
        description: `Your request to ${friendId} has been sent. A sample request has been added to your Updates tab for you to try.`,
    });
    setAddFriendOpen(false);
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

  const handleSendPhoto = (photoDataUrl: string) => {
    if (activeChat) {
      handleSendMessage(activeChat.id, photoDataUrl, 'image');
    }
    setCameraOpen(false);
  };


  const viewVariants = {
    initial: { opacity: 0, x: 30 },
    enter: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -30 },
  };

  if (!currentUser) {
      return (
        <div id="app-container" className="w-full max-w-[450px] h-[95vh] max-h-[950px] bg-background shadow-wa rounded-lg overflow-hidden flex flex-col relative transition-all duration-300">
            <AuthView onLogin={handleLogin} onSignup={handleSignup} onGoogleSignIn={handleLogin} />
        </div>
      );
  }

  const visibleContacts = contacts.filter(c => !currentUser.blocked[c.id]);

  const renderView = () => {
    switch (view) {
      case 'auth':
        return <AuthView onLogin={handleLogin} onSignup={handleSignup} onGoogleSignIn={handleLogin} />;
      case 'main':
        return (
          <MainView
            user={currentUser}
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
            user={currentUser}
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
            onOpenCamera={() => setCameraOpen(true)}
          />
        );
      case 'call':
        if (!activeCall) return null;
        return (
          <CallView
            user={currentUser}
            contact={activeCall.contact}
            type={activeCall.type}
            onEndCall={handleEndCall}
          />
        );
      default:
        return <AuthView onLogin={handleLogin} onSignup={handleSignup} onGoogleSignIn={handleLogin} />;
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
      <AddFriendModal 
        isOpen={isAddFriendOpen} 
        onClose={() => setAddFriendOpen(false)} 
        onAddFriend={handleAddFriend}
      />
      <ProfileViewModal 
        isOpen={isProfileViewOpen} 
        onClose={() => setProfileViewOpen(false)} 
        user={currentUser} 
        onLogout={handleLogout} 
        onOpenSecurity={() => {
          setProfileViewOpen(false);
          setSecurityModalOpen(true);
        }}
      />
      <SecurityModal isOpen={isSecurityModalOpen} onClose={() => setSecurityModalOpen(false)} />
      <CameraModal 
        isOpen={isCameraOpen} 
        onClose={() => setCameraOpen(false)} 
        onSendPhoto={handleSendPhoto}
      />
      
      {incomingCall && (
        <IncomingCallModal
          call={incomingCall}
          onAccept={() => {
            if(!incomingCall) return;
            const callContact = incomingCall.contact;
            const callType = incomingCall.type;
            setIncomingCall(null);
            handleStartCall(callContact, callType);
          }}
          onReject={() => {
            if(!incomingCall) return;
            toast({
              title: "Call Rejected",
              description: `You rejected the call from ${incomingCall.contact.name}.`,
            });
            setIncomingCall(null);
          }}
        />
      )}
    </div>
  );
}
