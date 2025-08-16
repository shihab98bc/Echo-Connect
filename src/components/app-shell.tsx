'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import AuthView from '@/components/auth-view';
import MainView from '@/components/main-view';
import ChatView from '@/components/chat-view';
import CallView from '@/components/call-view';
import ProfileSetupModal from '@/components/modals/profile-setup-modal';
import AddFriendModal from '@/components/modals/add-friend-modal';
import ProfileViewModal from '@/components/modals/profile-view-modal';
import IncomingCallModal from '@/components/modals/incoming-call-modal';
import SecurityModal from '@/components/modals/security-modal';
import ImagePreviewModal from '@/components/modals/image-preview-modal';
import { AnimatePresence, motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { auth, db, storage } from '@/lib/firebase';
import { onAuthStateChanged, signOut, User as FirebaseUser, updateProfile } from 'firebase/auth';
import { collection, doc, onSnapshot, setDoc, getDoc, updateDoc, arrayUnion, serverTimestamp, getDocs, query, where, writeBatch, orderBy, limit, Timestamp, addDoc, increment, deleteDoc, runTransaction } from 'firebase/firestore';
import { getDownloadURL, ref, uploadString, deleteObject } from 'firebase/storage';


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
  caption?: string;
  duration?: number;
  status?: 'sent' | 'delivered' | 'seen';
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
  const [isImagePreviewOpen, setImagePreviewOpen] = useState(false);
  
  const [callToAnswer, setCallToAnswer] = useState<any>(null);
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [imageToSend, setImageToSend] = useState<{dataUrl: string, file: File} | null>(null);

  const [activeChat, setActiveChat] = useState<Contact | null>(null);
  const [activeCall, setActiveCall] = useState<{ contact: Contact; type: 'video' | 'voice', callId: string } | null>(null);

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});

  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedChats, setSelectedChats] = useState<string[]>([]);
  const [updatesViewed, setUpdatesViewed] = useState(false);
  
  const unsubscribeRefs = useRef<(() => void)[]>([]);

  const handleEndCall = useCallback(() => {
    setActiveCall(null);
    setCallToAnswer(null);
    setView(prevView => activeChat ? 'chat' : 'main');
  }, [activeChat]);

  const setupFirestoreListeners = useCallback((uid: string) => {
    unsubscribeRefs.current.forEach(unsub => unsub());
    unsubscribeRefs.current = [];

    const userDocRef = doc(db, 'users', uid);
    const unsubUser = onSnapshot(userDocRef, (doc) => {
        if(doc.exists()) {
            setCurrentUser(doc.data() as AppUser);
        }
    });
    unsubscribeRefs.current.push(unsubUser);

    const contactsRef = collection(db, 'users', uid, 'contacts');
    const contactsQuery = query(contactsRef, orderBy('timestamp', 'desc'));
    const unsubContacts = onSnapshot(contactsQuery, (snapshot) => {
        const contactsData = snapshot.docs.map(doc => ({...doc.data(), id: doc.id } as Contact));
        setContacts(contactsData);

        contactsData.forEach(contact => {
          const chatId = [uid, contact.id].sort().join('_');
          const messagesRef = collection(db, 'chats', chatId, 'messages');
          const messagesQuery = query(messagesRef, orderBy('timestamp', 'asc'));

          const unsubMessages = onSnapshot(messagesQuery, (msgSnapshot) => {
            const newMessages = msgSnapshot.docs.map(doc => ({id: doc.id, ...doc.data()} as Message));
            setMessages(prev => ({ ...prev, [contact.id]: newMessages }));
            
            const batch = writeBatch(db);
            let hasUpdates = false;
            newMessages.forEach(msg => {
                if (msg.sender !== uid && msg.status === 'sent') {
                    const msgRef = doc(db, 'chats', chatId, 'messages', msg.id);
                    batch.update(msgRef, { status: 'delivered' });
                    hasUpdates = true;
                }
            });
            if(hasUpdates) batch.commit();
          });
          unsubscribeRefs.current.push(unsubMessages);
        });
    });
    unsubscribeRefs.current.push(unsubContacts);
    
    const requestsRef = collection(db, 'users', uid, 'friendRequests');
    const unsubRequests = onSnapshot(requestsRef, (snapshot) => {
        const requestsData = snapshot.docs.map(doc => doc.data() as Update);
        setUpdates(requestsData);
    });
    unsubscribeRefs.current.push(unsubRequests);
    
    const callDocsRef = collection(db, 'calls');
    const unsubCalls = onSnapshot(callDocsRef, async (snapshot) => {
        for (const change of snapshot.docChanges()) {
            const callData = change.doc.data();
            const callId = change.doc.id;

            if (change.type === 'added') {
                const calleeId = callId.split('_').find(id => id !== callData.offer.callerId);
                
                if (calleeId === uid && !callData.answer) {
                    const callerDoc = await getDoc(doc(db, 'users', callData.offer.callerId));
                    if (callerDoc.exists()) {
                        const callerData = callerDoc.data() as AppUser;
                        setIncomingCall({
                            id: callId,
                            contact: {
                                id: callerData.uid,
                                name: callerData.name,
                                emoji: callerData.emoji,
                                unread: 0,
                                isMuted: false,
                            },
                            type: callData.offer.type,
                            offer: callData.offer,
                            onAccept: () => {
                                setCallToAnswer({ id: callId, offer: callData.offer, contact: {
                                    id: callerData.uid,
                                    name: callerData.name,
                                    emoji: callerData.emoji,
                                }});
                                setView('call');
                                setIncomingCall(null);
                            },
                            onReject: async () => {
                                await deleteDoc(doc(db, 'calls', callId));
                                setIncomingCall(null);
                            }
                        });
                    }
                }
            } else if (change.type === 'removed') {
              if (incomingCall?.id === callId) {
                setIncomingCall(null);
              }
              if ((activeCall?.callId === callId) || (callToAnswer?.id === callId)) {
                handleEndCall();
                toast({ title: 'Call Ended', description: 'The other user has ended the call.' });
              }
            }
        }
    });
    unsubscribeRefs.current.push(unsubCalls);
  }, [toast, incomingCall, activeCall, callToAnswer, handleEndCall]);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
        unsubscribeRefs.current.forEach(unsub => unsub());
        unsubscribeRefs.current = [];

        if (firebaseUser) {
            const userDocRef = doc(db, 'users', firebaseUser.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists()) {
                const userData = userDocSnap.data() as AppUser;
                setCurrentUser(userData);
                setView('main');
                setupFirestoreListeners(userData.uid);
            } else {
                const tempUser: AppUser = {
                    uid: firebaseUser.uid,
                    name: firebaseUser.displayName || 'New User',
                    emoji: '👋',
                    email: firebaseUser.email,
                    photoURL: firebaseUser.photoURL,
                };
                setCurrentUser(tempUser);
                setView('main');
                setProfileSetupOpen(true);
            }
        } else {
            setCurrentUser(null);
            setView('auth');
            setContacts([]);
            setMessages({});
            setUpdates([]);
        }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeRefs.current.forEach(unsub => unsub());
    };
  }, [setupFirestoreListeners]);

  const handleProfileSave = useCallback(async (name: string, emoji: string) => {
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
            blocked: {},
        };
        await setDoc(doc(db, 'users', firebaseUser.uid), userPayload);
        
        const welcomeBotContact = {
            id: 'welcome-bot',
            name: 'EchoConnect Bot',
            emoji: '🤖',
            lastMessage: "Welcome! Let's get you started.",
            timestamp: serverTimestamp(),
            unread: 1,
            isMuted: false,
        };
        await setDoc(doc(db, 'users', firebaseUser.uid, 'contacts', 'welcome-bot'), welcomeBotContact);

        const chatId = [firebaseUser.uid, 'welcome-bot'].sort().join('_');
        const welcomeMessage = {
            sender: 'welcome-bot',
            text: "Welcome to EchoConnect! You can find your user ID in your profile. Share it with friends to connect!",
            timestamp: serverTimestamp(),
            type: 'text',
            status: 'sent'
        };
        await addDoc(collection(db, 'chats', chatId, 'messages'), welcomeMessage);


        setCurrentUser(userPayload);
        setProfileSetupOpen(false);
        setupFirestoreListeners(firebaseUser.uid);
        toast({ title: `Welcome, ${name}!`, description: "Your profile is set up." });
    } catch (error) {
        console.error("Error saving profile:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not save your profile.' });
    }
  }, [setupFirestoreListeners, toast]);

  const handleStartChat = useCallback(async (contact: Contact) => {
    if (!currentUser) return;

    if (currentUser.blocked && currentUser.blocked[contact.id]) {
        toast({ variant: 'destructive', title: 'User Blocked', description: `You have blocked ${contact.name}. Unblock them to chat.` });
        return;
    }

    const contactDocRef = doc(db, 'users', contact.id);
    const contactDoc = await getDoc(contactDocRef);
    if (contactDoc.exists()) {
        const contactData = contactDoc.data() as AppUser;
        if (contactData.blocked && contactData.blocked[currentUser.uid]) {
            toast({ variant: 'destructive', title: 'Blocked', description: `You cannot message this user.` });
            return;
        }
    }

    if (contact.unread > 0) {
        const contactRef = doc(db, 'users', currentUser.uid, 'contacts', contact.id);
        await updateDoc(contactRef, { unread: 0 });
    }

    const chatId = [currentUser.uid, contact.id].sort().join('_');
    const allMessages = messages[contact.id] || [];
    const batch = writeBatch(db);
    let hasUpdates = false;

    allMessages.forEach(msg => {
        if (msg.sender === contact.id && msg.status !== 'seen') {
            const msgRef = doc(db, 'chats', chatId, 'messages', msg.id);
            batch.update(msgRef, { status: 'seen' });
            hasUpdates = true;
        }
    });

    if (hasUpdates) {
        try {
            await batch.commit();
        } catch (error) {
            console.error("Error marking messages as seen:", error);
        }
    }

    setActiveChat(contact);
    setView('chat');
  }, [currentUser, messages, toast]);

  const handleSendMessage = useCallback(async (contactId: string, messageText: string, type: Message['type'] = 'text', options: { duration?: number, caption?: string } = {}) => {
    if (!currentUser) return;
    
    const chatId = [currentUser.uid, contactId].sort().join('_');
    
    let lastMessageText = messageText;
    let finalMessageText = messageText;

    try {
      if (type === 'image' || type === 'audio') {
          const fileExtension = type === 'image' ? 'jpg' : 'webm';
          const storageRef = ref(storage, `chats/${chatId}/${Date.now()}.${fileExtension}`);
          const uploadResult = await uploadString(storageRef, messageText, 'data_url');
          finalMessageText = await getDownloadURL(uploadResult.ref);
          lastMessageText = type === 'image' ? '📷 Photo' : '🎤 Voice message';
      }

      const message: Omit<Message, 'id'> = {
        sender: currentUser.uid,
        text: finalMessageText,
        timestamp: serverTimestamp(),
        type: type,
        status: 'sent',
      };
      if (options.duration) message.duration = options.duration;
      if (options.caption) message.caption = options.caption;

      await addDoc(collection(db, 'chats', chatId, 'messages'), message);
      
      const timestamp = new Date();
      const userContactRef = doc(db, 'users', currentUser.uid, 'contacts', contactId);
      await updateDoc(userContactRef, { lastMessage: lastMessageText, timestamp });

      const otherUserContactRef = doc(db, 'users', contactId, 'contacts', currentUser.uid);
      const otherUserDoc = await getDoc(otherUserContactRef);
      if(otherUserDoc.exists()){
        await updateDoc(otherUserContactRef, { 
          lastMessage: lastMessageText, 
          timestamp,
          unread: increment(1)
        });
      }

    } catch (error) {
        console.error("Error sending message:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not send message.' });
    }
  }, [currentUser, toast]);

  const handleAddFriend = useCallback(async (friendEmail: string) => {
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
        
        if (currentUser.blocked && currentUser.blocked[friendData.uid]) {
             toast({ variant: 'destructive', title: 'User Blocked', description: `You have blocked this user. Unblock them to add as a friend.` });
             return;
        }

        const contactDoc = await getDoc(doc(db, 'users', currentUser.uid, 'contacts', friendData.uid));
        if (contactDoc.exists()) {
             toast({ variant: 'destructive', title: 'Already Friends', description: `You are already connected with ${friendData.name}.` });
             return;
        }
        
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
  }, [currentUser, toast]);

  const handleAcceptRequest = useCallback(async (request: Update) => {
    if (!currentUser) return;
    
    const batch = writeBatch(db);
    const requestFromUser = request.from;

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
  }, [currentUser, toast]);
  
  const handleRejectRequest = useCallback(async (request: Update) => {
    if (!currentUser) return;
    try {
        const requestRef = doc(db, 'users', currentUser.uid, 'friendRequests', request.from.id);
        await deleteDoc(requestRef);
        toast({
            title: "Friend Request Rejected",
            description: `You have rejected the request from ${request.from.name}.`
        });
    } catch(error) {
         console.error("Error rejecting request:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not reject friend request.' });
    }
  }, [currentUser, toast]);
  
  const handleLogout = useCallback(async () => {
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
  }, [toast]);

  const handleStartCall = useCallback((contact: Contact, type: 'video' | 'voice') => {
    if (!currentUser) return;

    if (currentUser.blocked && currentUser.blocked[contact.id]) {
      toast({ variant: 'destructive', title: 'User Blocked', description: `You cannot call a blocked user.` });
      return;
    }

    const callId = [currentUser.uid, contact.id].sort().join('_');
    setActiveCall({ contact, type, callId });
    setView('call');
  }, [currentUser, toast]);
  
  const handleClearChat = useCallback(async (contactId: string) => {
    if (!currentUser) return;
    const chatId = [currentUser.uid, contactId].sort().join('_');
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    try {
      const messagesSnapshot = await getDocs(messagesRef);
      if (messagesSnapshot.empty) {
        toast({ title: "Chat already empty." });
        return;
      }
      const batch = writeBatch(db);
      messagesSnapshot.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();

      const userContactRef = doc(db, 'users', currentUser.uid, 'contacts', contactId);
      await updateDoc(userContactRef, { lastMessage: "", timestamp: serverTimestamp() });
      
      toast({ title: "Chat cleared successfully." });
    } catch(error) {
      console.error("Error clearing chat", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not clear chat.' });
    }
  }, [currentUser, toast]);

  const handleBlockContact = useCallback(async (contactId: string, isBlocked: boolean) => {
    if (!currentUser) return;
    const userRef = doc(db, 'users', currentUser.uid);

    try {
        await updateDoc(userRef, {
            [`blocked.${contactId}`]: !isBlocked
        });
        toast({ title: isBlocked ? 'User unblocked' : 'User blocked' });
    } catch(error) {
        console.error("Error blocking contact:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not update block status.' });
    }
  }, [currentUser, toast]);
  
  const handleDeleteChat = useCallback(async (contactId: string) => {
    if(!currentUser) return;
    const contactRef = doc(db, 'users', currentUser.uid, 'contacts', contactId);
    try {
      await deleteDoc(contactRef);
      setMessages(prev => {
        const newMessages = {...prev};
        delete newMessages[contactId];
        return newMessages;
      });
      toast({ title: "Chat deleted" });
      if (activeChat?.id === contactId) {
        setActiveChat(null);
        setView('main');
      }
    } catch (error) {
      console.error("Error deleting chat:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not delete chat.' });
    }
  }, [currentUser, toast, activeChat]);

  const handleToggleChatSelection = useCallback((contactId: string) => {
    setSelectedChats(prev => 
        prev.includes(contactId) 
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  }, []);
  
  const handleEnterSelectionMode = useCallback((contactId: string) => {
    setIsSelectionMode(true);
    setSelectedChats([contactId]);
  }, []);

  const handleExitSelectionMode = useCallback(() => {
    setIsSelectionMode(false);
    setSelectedChats([]);
  }, []);

  const handleDeleteSelectedChats = useCallback(async () => {
    if (!currentUser) return;
    const batch = writeBatch(db);
    selectedChats.forEach(contactId => {
        const contactRef = doc(db, 'users', currentUser.uid, 'contacts', contactId);
        batch.delete(contactRef);
    });
    try {
        await batch.commit();
        toast({ title: `${selectedChats.length} chat(s) deleted.`});
        handleExitSelectionMode();
    } catch(err) {
        console.error("Error deleting chats:", err);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not delete selected chats.' });
    }
  }, [currentUser, selectedChats, toast, handleExitSelectionMode]);

  const handleFileSelected = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const dataUrl = loadEvent.target?.result as string;
      if (dataUrl) {
        setImageToSend({ dataUrl, file });
        setImagePreviewOpen(true);
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const handleSendImage = useCallback((caption: string) => {
    if (activeChat && imageToSend) {
      handleSendMessage(activeChat.id, imageToSend.dataUrl, 'image', { caption });
    }
    setImagePreviewOpen(false);
    setImageToSend(null);
  }, [activeChat, imageToSend, handleSendMessage]);


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
            updatesViewed={updatesViewed}
            onViewUpdates={() => setUpdatesViewed(true)}
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
            onClearChat={handleClearChat}
            onBlockContact={handleBlockContact}
            onDeleteChat={handleDeleteChat}
            onFileSelected={handleFileSelected}
          />
        );
      case 'call':
        if (!activeCall && !callToAnswer) return null;
        return (
          <CallView
            user={currentUser}
            contact={activeCall?.contact || callToAnswer.contact}
            type={activeCall?.type || callToAnswer.type}
            onEndCall={handleEndCall}
            callId={activeCall?.callId || callToAnswer.id}
            isCaller={!!activeCall}
            offer={callToAnswer?.offer}
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
      {imageToSend && activeChat && (
        <ImagePreviewModal
          isOpen={isImagePreviewOpen}
          onClose={() => {
            setImagePreviewOpen(false);
            setImageToSend(null);
          }}
          onSend={handleSendImage}
          imageDataUrl={imageToSend.dataUrl}
        />
      )}
      
      {incomingCall && (
        <IncomingCallModal
          call={incomingCall}
          onAccept={incomingCall.onAccept}
          onReject={incomingCall.onReject}
        />
      )}
    </div>
  );
}
