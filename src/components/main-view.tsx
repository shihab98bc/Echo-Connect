'use client';

import { AppUser, Contact, Call, Update } from './app-shell';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AddFriendIcon, MenuIcon, VideoCallIcon, VoiceCallIcon, CheckIcon, XIcon, MutedIcon, BackIcon } from '@/components/icons';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { ArrowDownLeftIcon, ArrowUpRightIcon, Trash2Icon } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { AnimatePresence, motion } from 'framer-motion';


interface MainViewProps {
  user: AppUser;
  contacts: Contact[];
  updates: Update[];
  calls: Call[];
  onStartChat: (contact: Contact) => void;
  onOpenAddFriend: () => void;
  onOpenProfile: () => void;
  onAcceptRequest: (request: Update) => void;
  onRejectRequest: (request: Update) => void;
  onStartCall: (contact: Contact, type: 'video' | 'voice') => void;
  isSelectionMode: boolean;
  selectedChats: string[];
  onToggleChatSelection: (contactId: string) => void;
  onEnterSelectionMode: (contactId: string) => void;
  onExitSelectionMode: () => void;
  onDeleteSelectedChats: () => void;
}

const ListItem = ({ children, className, ...props }: { children: React.ReactNode, className?: string } & React.HTMLAttributes<HTMLDivElement>) => (
    <div className={cn("flex items-center p-3 hover:bg-secondary transition-colors cursor-pointer", className)} {...props}>{children}</div>
);

const ContactItem = ({ contact, onStartChat, isSelectionMode, isSelected, onToggleSelection, onEnterSelectionMode }: { 
    contact: Contact; 
    onStartChat: (contact: Contact) => void;
    isSelectionMode: boolean;
    isSelected: boolean;
    onToggleSelection: (id: string) => void;
    onEnterSelectionMode: (id: string) => void;
}) => {
    const handleClick = () => {
        if (isSelectionMode) {
            onToggleSelection(contact.id);
        } else {
            onStartChat(contact);
        }
    };
    
    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        if (!isSelectionMode) {
            onEnterSelectionMode(contact.id);
        }
    };
    
    return (
        <ListItem 
            onClick={handleClick} 
            onContextMenu={handleContextMenu}
            className={cn(isSelected && "bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-100/80")}
        >
            <AnimatePresence>
            {isSelectionMode && (
                <motion.div initial={{width: 0, opacity: 0}} animate={{width: 'auto', opacity: 1}} exit={{width: 0, opacity: 0}} className="overflow-hidden pr-3">
                     <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => onToggleSelection(contact.id)}
                        className="h-5 w-5"
                        aria-label={`Select chat with ${contact.name}`}
                    />
                </motion.div>
            )}
            </AnimatePresence>
            <div className="flex items-center gap-4 flex-grow min-w-0">
                <Avatar className="h-12 w-12 text-2xl flex-shrink-0">
                    <AvatarFallback>{contact.emoji}</AvatarFallback>
                </Avatar>
                <div className="flex-grow overflow-hidden">
                    <p className="font-semibold truncate">{contact.name}</p>
                    <p className="text-sm text-muted-foreground truncate">{contact.lastMessage}</p>
                </div>
            </div>
            <div className="text-right flex flex-col items-end gap-1 ml-2 flex-shrink-0">
                <p className="text-xs text-accent">{contact.timestamp}</p>
                <div className="h-6 flex items-center justify-center">
                {contact.unread > 0 ? (
                    <Badge className="bg-accent text-accent-foreground w-6 h-6 flex items-center justify-center rounded-full text-sm">{contact.unread}</Badge>
                ) : contact.isMuted ? (
                    <MutedIcon className="h-5 w-5 text-muted-foreground" />
                ) : null}
                </div>
            </div>
        </ListItem>
    );
};

const CallLogItem = ({ call, onStartCall }: { call: Call; onStartCall: (contact: Contact, type: 'video' | 'voice') => void; }) => {
    const isGroupCall = 'isGroup' in call.contact && call.contact.isGroup;
    return (
        <ListItem>
            <div className="flex items-center gap-4 flex-grow">
                <Avatar className="h-12 w-12 text-2xl">
                    <AvatarFallback>{call.contact.emoji}</AvatarFallback>
                </Avatar>
                <div className="flex-grow">
                    <p className={`font-semibold ${call.status === 'missed' ? 'text-destructive' : ''}`}>{call.contact.name}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {call.status === 'incoming' && <ArrowDownLeftIcon className="h-4 w-4 text-green-500" />}
                        {call.status === 'outgoing' && <ArrowUpRightIcon className="h-4 w-4" />}
                        {call.status === 'missed' && <ArrowDownLeftIcon className="h-4 w-4 text-destructive" />}
                        <p>{isGroupCall && 'Group Call |'} {call.time}</p>
                    </div>
                </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => onStartCall(call.contact, call.type)}>
                {call.type === 'video' ? <VideoCallIcon className="h-6 w-6 text-primary" /> : <VoiceCallIcon className="h-6 w-6 text-primary" />}
            </Button>
        </ListItem>
    );
}

const UpdateItem = ({ update, onAccept, onReject }: { update: Update, onAccept: (req: Update) => void, onReject: (req: Update) => void }) => {
    if (update.type === 'request') {
        return (
            <div className="p-4 bg-secondary/50 rounded-lg">
                <p className="text-sm font-semibold mb-2">Friend Request</p>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 text-xl"><AvatarFallback>{update.from.emoji}</AvatarFallback></Avatar>
                        <p>{update.from.name}</p>
                    </div>
                    <div className="flex gap-2">
                        <Button size="icon" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => onReject(update)}>
                            <XIcon className="h-6 w-6"/>
                        </Button>
                        <Button size="icon" variant="ghost" className="text-green-600 hover:bg-green-600/10" onClick={() => onAccept(update)}>
                            <CheckIcon className="h-6 w-6"/>
                        </Button>
                    </div>
                </div>
            </div>
        );
    }
    return <div className="p-3 text-sm text-muted-foreground">{update.message}</div>;
};

export default function MainView({ 
    user, contacts, updates, calls, onStartChat, onOpenAddFriend, onOpenProfile, 
    onAcceptRequest, onRejectRequest, onStartCall, isSelectionMode, selectedChats,
    onToggleChatSelection, onEnterSelectionMode, onExitSelectionMode, onDeleteSelectedChats
}: MainViewProps) {
  return (
    <div className="w-full h-full flex flex-col bg-background">
      <header className="bg-header-bg text-icon-color shadow-md z-10">
        <div className="flex items-center justify-between p-3 h-[60px]">
            <AnimatePresence mode="wait">
            {isSelectionMode ? (
                 <motion.div 
                    key="selection-header"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex items-center gap-2 w-full"
                 >
                    <Button variant="ghost" size="icon" onClick={onExitSelectionMode} className="text-icon-color hover:bg-white/20">
                      <BackIcon className="h-6 w-6" />
                    </Button>
                    <p className="text-xl font-bold font-headline flex-grow">{selectedChats.length} selected</p>
                    <Button variant="ghost" size="icon" onClick={onDeleteSelectedChats} className="text-icon-color hover:bg-white/20" disabled={selectedChats.length === 0}>
                        <Trash2Icon className="h-6 w-6" />
                    </Button>
                 </motion.div>
            ) : (
                <motion.div 
                    key="default-header"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex items-center justify-between w-full"
                >
                    <h1 className="text-xl font-bold font-headline">EchoConnect</h1>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={onOpenAddFriend} className="text-icon-color hover:bg-white/20">
                            <AddFriendIcon className="h-6 w-6" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={onOpenProfile} className="text-icon-color hover:bg-white/20">
                            <MenuIcon className="h-6 w-6" />
                        </Button>
                    </div>
                </motion.div>
            )}
            </AnimatePresence>
        </div>
      </header>
      <Tabs defaultValue="chats" className="w-full flex-grow flex flex-col">
        <TabsList className="grid w-full grid-cols-3 rounded-none bg-header-bg p-0">
          <TabsTrigger value="chats" className="rounded-none text-icon-color/80 data-[state=active]:text-accent data-[state=active]:bg-header-bg data-[state=active]:shadow-[inset_0_-2px_0_hsl(var(--accent))]">Chats</TabsTrigger>
          <TabsTrigger value="updates" className="rounded-none text-icon-color/80 data-[state=active]:text-accent data-[state=active]:bg-header-bg data-[state=active]:shadow-[inset_0_-2px_0_hsl(var(--accent))]">Updates</TabsTrigger>
          <TabsTrigger value="calls" className="rounded-none text-icon-color/80 data-[state=active]:text-accent data-[state=active]:bg-header-bg data-[state=active]:shadow-[inset_0_-2px_0_hsl(var(--accent))]">Calls</TabsTrigger>
        </TabsList>
        <div className="flex-grow overflow-hidden">
            <ScrollArea className="h-full">
                <TabsContent value="chats">
                    {contacts.length > 0 ? (
                        contacts.map(contact => 
                            <ContactItem 
                                key={contact.id} 
                                contact={contact} 
                                onStartChat={onStartChat} 
                                isSelectionMode={isSelectionMode}
                                isSelected={selectedChats.includes(contact.id)}
                                onToggleSelection={onToggleChatSelection}
                                onEnterSelectionMode={onEnterSelectionMode}
                            />)
                    ) : (
                        <div className="text-center text-muted-foreground p-8">No chats yet. Add a friend to start chatting!</div>
                    )}
                </TabsContent>
                <TabsContent value="updates" className="p-4 space-y-4">
                     {updates.length > 0 ? (
                        updates.map((update, i) => <UpdateItem key={update.id || i} update={update} onAccept={onAcceptRequest} onReject={onRejectRequest} />)
                     ) : (
                        <div className="text-center text-muted-foreground p-8">No new updates.</div>
                     )}
                </TabsContent>
                <TabsContent value="calls">
                     {calls.length > 0 ? (
                        calls.map((call, i) => <CallLogItem key={call.id || i} call={call} onStartCall={onStartCall} />)
                    ) : (
                        <div className="text-center text-muted-foreground p-8">No recent calls.</div>
                    )}
                </TabsContent>
            </ScrollArea>
        </div>
      </Tabs>
    </div>
  );
}
