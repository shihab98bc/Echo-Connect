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
import { AnimatePresence, motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signOut, User as FirebaseUser, updateProfile } from 'firebase/auth';
import { collection, doc, onSnapshot, setDoc, getDoc, updateDoc, arrayUnion, serverTimestamp, getDocs, query, where, writeBatch, orderBy, limit, Timestamp } from 'firebase/firestore';


export type View = 'auth' | 'main' | 'chat' | 'call';

export type AppUser = {
  uid: string;
  name: string;
  emoji: string;
  email: string | null;
  photoURL: string | null;
  blocked?: Record<string, boolean>;
};

export type Contact = {
  id: string; // This is the other user's UID
  name: string;
  emoji: string;
  photoURL?: string | null;
  lastMessage?: string;
  timestamp?: any;
  unread: number;
  isMuted: boolean;
};

export type Message = { 
  id: string;
  sender: string; 
  text: string; 
  timestamp: any;
  type?: 'text' | 'image' | 'audio';
  duration?: number 
};

export type Call = { 
  id: string;
  contact: Contact; 
  type: 'video' | 'voice';
  status: 'incoming' | 'outgoing' | 'missed';
  time: string;
};

export type Update = {
  id: string; // The user ID of the person sending the request
  type: 'request';
  from: {
    id: string;
    name: string;
    emoji: string;
  };
};

export default function AppShell() {
  const [view, setView] = useState<View>('auth');
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const { toast } = useToast();

  const [isProfileSetupOpen, setProfileSetupOpen] = useState(false);
  const [isAddFriendOpen, setAddFriendOpen] = useState(false);
  const [isProfileViewOpen, setProfileViewOpen] = useState(false);
  const [isSecurityModalOpen, setSecurityModalOpen] = useState(false);
  const [isCameraOpen, setCameraOpen] = useState(false);
  const [incomingCall, setIncomingCall] = useState<Call | null>(null);

  const [activeChat, setActiveChat] = useState<Contact | null>(null);
  const [activeCall, setActiveCall] = useState<{ contact: Contact; type: 'video' | 'voice' } | null>(null);

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});

  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedChats, setSelectedChats] = useState<string[]>([]);
  
  // Firestore listeners unsubscribe functions
  const unsubscribeRefs = useRef<(() => void)[]>([]);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
        if (firebaseUser) {
            const userDocRef = doc(db, 'users', firebaseUser.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists()) {
                const userData = userDocSnap.data() as AppUser;
                setCurrentUser(userData);
                setView('main');
                setupFirestoreListeners(userData.uid);
            } else {
                setProfileSetupOpen(true);
            }
        } else {
            setCurrentUser(null);
            setView('auth');
            // Cleanup listeners
            unsubscribeRefs.current.forEach(unsub => unsub());
            unsubscribeRefs.current = [];
            setContacts([]);
            setMessages({});
            setUpdates([]);
        }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeRefs.current.forEach(unsub => unsub());
    };
  }, []);

  const setupFirestoreListeners = (uid: string) => {
    // Clean up previous listeners
    unsubscribeRefs.current.forEach(unsub => unsub());
    unsubscribeRefs.current = [];

    // Listener for contacts
    const contactsRef = collection(db, 'users', uid, 'contacts');
    const contactsQuery = query(contactsRef, orderBy('timestamp', 'desc'));
    const unsubContacts = onSnapshot(contactsQuery, (snapshot) => {
        const contactsData = snapshot.docs.map(doc => doc.data() as Contact);
        setContacts(contactsData);

        // For each contact, listen to messages
        contactsData.forEach(contact => {
          const chatId = [uid, contact.id].sort().join('_');
          const messagesRef = collection(db, 'chats', chatId, 'messages');
          const messagesQuery = query(messagesRef, orderBy('timestamp', 'asc'));

          const unsubMessages = onSnapshot(messagesQuery, (msgSnapshot) => {
            const newMessages = msgSnapshot.docs.map(doc => ({id: doc.id, ...doc.data()} as Message));
            setMessages(prev => ({ ...prev, [contact.id]: newMessages }));
          });
          unsubscribeRefs.current.push(unsubMessages);
        });
    });
    unsubscribeRefs.current.push(unsubContacts);
    
    // Listener for friend requests
    const requestsRef = collection(db, 'users', uid, 'friendRequests');
    const unsubRequests = onSnapshot(requestsRef, (snapshot) => {
        const requestsData = snapshot.docs.map(doc => doc.data() as Update);
        setUpdates(requestsData);
    });
    unsubscribeRefs.current.push(unsubRequests);
  };


  const handleProfileSave = async (name: string, emoji: string) => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) return;
    
    try {
        await updateProfile(firebaseUser, { displayName: name });
        const userPayload: AppUser = {
            uid: firebaseUser.uid,
            name,
            emoji,
            email: firebaseUser.email,
            photoURL: firebaseUser.photoURL,
        };
        await setDoc(doc(db, 'users', firebaseUser.uid), userPayload);
        
        setCurrentUser(userPayload);
        setProfileSetupOpen(false);
        setView('main');
        setupFirestoreListeners(firebaseUser.uid);
        toast({ title: `Welcome, ${name}!`, description: "Your profile is set up." });
    } catch (error) {
        console.error("Error saving profile:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not save your profile.' });
    }
  };

  const handleStartChat = (contact: Contact) => {
    // Mark messages as read (optional, can be implemented)
    setActiveChat(contact);
    setView('chat');
  };

  const handleSendMessage = async (contactId: string, messageText: string, type: Message['type'] = 'text', duration?: number) => {
    if (!currentUser) return;
    
    const chatId = [currentUser.uid, contactId].sort().join('_');
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    
    const message: Omit<Message, 'id'> = {
      sender: currentUser.uid,
      text: messageText,
      timestamp: serverTimestamp(),
      type: type,
    };
    if (duration) message.duration = duration;

    let lastMessageText = message.text;
    if (type === 'image') lastMessageText = '📷 Photo';
    if (type === 'audio') lastMessageText = '🎤 Voice message';

    try {
        const newDocRef = doc(collection(db, 'chats', chatId, 'messages'));
        await setDoc(newDocRef, message);
        
        const timestamp = new Date();
        // Update contact docs for both users
        const userContactRef = doc(db, 'users', currentUser.uid, 'contacts', contactId);
        await updateDoc(userContactRef, { lastMessage: lastMessageText, timestamp });

        const otherUserContactRef = doc(db, 'users', contactId, 'contacts', currentUser.uid);
        await updateDoc(otherUserContactRef, { lastMessage: lastMessageText, timestamp });

    } catch (error) {
        console.error("Error sending message:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not send message.' });
    }
  };

  const handleAddFriend = async (friendEmail: string) => {
    if (!currentUser || friendEmail === currentUser.email) {
      toast({ variant: 'destructive', title: 'Error', description: "You cannot add yourself." });
      return;
    }
    
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where("email", "==", friendEmail), limit(1));

    try {
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
            toast({ variant: 'destructive', title: 'User Not Found', description: "No user with that email exists." });
            return;
        }

        const friendDoc = querySnapshot.docs[0];
        const friendData = friendDoc.data() as AppUser;

        // Check if already a contact
        const contactDoc = await getDoc(doc(db, 'users', currentUser.uid, 'contacts', friendData.uid));
        if (contactDoc.exists()) {
             toast({ variant: 'destructive', title: 'Already Friends', description: `You are already connected with ${friendData.name}.` });
             return;
        }
        
        // Send friend request
        const requestRef = doc(db, 'users', friendData.uid, 'friendRequests', currentUser.uid);
        await setDoc(requestRef, {
            id: currentUser.uid,
            type: 'request',
            from: {
                id: currentUser.uid,
                name: currentUser.name,
                emoji: currentUser.emoji,
            }
        });
        
        toast({
            title: "Friend Request Sent",
            description: `Your request to ${friendData.name} has been sent.`,
        });
        setAddFriendOpen(false);

    } catch (error) {
        console.error("Error adding friend:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not send friend request.' });
    }
  };

  const handleAcceptRequest = async (request: Update) => {
    if (!currentUser) return;
    
    const batch = writeBatch(db);
    const requestFromUser = request.from;

    // 1. Add contact to current user's contacts
    const currentUserContactRef = doc(db, 'users', currentUser.uid, 'contacts', requestFromUser.id);
    batch.set(currentUserContactRef, {
        id: requestFromUser.id,
        name: requestFromUser.name,
        emoji: requestFromUser.emoji,
        lastMessage: 'Say hi!',
        timestamp: serverTimestamp(),
        unread: 0,
        isMuted: false,
    });

    // 2. Add current user to the other user's contacts
    const otherUserContactRef = doc(db, 'users', requestFromUser.id, 'contacts', currentUser.uid);
    batch.set(otherUserContactRef, {
        id: currentUser.uid,
        name: currentUser.name,
        emoji: currentUser.emoji,
        lastMessage: 'Say hi!',
        timestamp: serverTimestamp(),
        unread: 0,
        isMuted: false,
    });
    
    // 3. Delete the friend request
    const requestRef = doc(db, 'users', currentUser.uid, 'friendRequests', requestFromUser.id);
    batch.delete(requestRef);

    try {
        await batch.commit();
        toast({
            title: "Friend Request Accepted",
            description: `You are now connected with ${requestFromUser.name}.`
        });
    } catch(error) {
        console.error("Error accepting request:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not accept friend request.' });
    }
  };
  
  const handleRejectRequest = async (request: Update) => {
    if (!currentUser) return;
    try {
        const requestRef = doc(db, 'users', currentUser.uid, 'friendRequests', request.from.id);
        await updateDoc(requestRef, { acknowledged: true }); // Or simply delete it
        toast({
            title: "Friend Request Rejected",
            description: `You have rejected the request from ${request.from.name}.`
        });
    } catch(error) {
         console.error("Error rejecting request:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not reject friend request.' });
    }
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

  const handleStartCall = (contact: Contact, type: 'video' | 'voice') => {
    setActiveCall({ contact, type });
    setView('call');
  };

  const handleEndCall = () => {
    setActiveCall(null);
    setView(activeChat ? 'chat' : 'main');
  };

  const handleToggleMute = (contactId: string) => {
    // This would update the contact in Firestore in a real app
    toast({
        title: "Feature coming soon",
        description: `Muting notifications will be available in a future update.`,
    });
  };

  const handleClearChat = (contactId: string) => {
    toast({
        title: "Feature coming soon",
        description: `Clearing chat history will be available in a future update.`,
    });
  };

  const handleBlockContact = (contactId: string) => {
    toast({
        title: "Feature coming soon",
        description: `Blocking contacts will be available in a future update.`,
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
    toast({
        title: "Feature coming soon",
        description: `Deleting chats will be available in a future update.`,
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

  if (view === 'auth') {
      return (
        <div id="app-container" className="w-full max-w-[450px] h-[95vh] max-h-[950px] bg-background shadow-wa rounded-lg overflow-hidden flex flex-col relative transition-all duration-300">
            <AuthView onLogin={() => {}} onSignup={() => {}} onGoogleSignIn={() => {}} />
        </div>
      );
  }
  
  if (!currentUser) {
      return (
         <div id="app-container" className="w-full max-w-[450px] h-[95vh] max-h-[950px] bg-background shadow-wa rounded-lg overflow-hidden flex flex-col relative transition-all duration-300 items-center justify-center">
            <p>Loading...</p>
         </div>
      )
  }

  const renderView = () => {
    switch (view) {
      case 'main':
        return (
          <MainView
            user={currentUser}
            contacts={contacts}
            updates={updates}
            calls={[]} // Mock calls for now
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
        return <p>Loading...</p>;
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
      {currentUser && (
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
      )}
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
