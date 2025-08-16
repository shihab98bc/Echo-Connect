'use client';

import { AppUser, Contact, Call } from './app-shell';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AddFriendIcon, MenuIcon, VideoCallIcon, VoiceCallIcon } from '@/components/icons';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MainViewProps {
  user: AppUser;
  contacts: Contact[];
  updates: any[];
  calls: Call[];
  onStartChat: (contact: Contact) => void;
  onOpenAddFriend: () => void;
  onOpenProfile: () => void;
}

const ListItem = ({ children }: { children: React.ReactNode }) => (
    <div className="flex items-center p-3 hover:bg-secondary transition-colors cursor-pointer">{children}</div>
);

const ContactItem = ({ contact, onStartChat }: { contact: Contact; onStartChat: (contact: Contact) => void; }) => (
    <ListItem>
        <div className="flex items-center gap-4 flex-grow" onClick={() => onStartChat(contact)}>
            <Avatar className="h-12 w-12 text-2xl">
                <AvatarFallback>{contact.emoji}</AvatarFallback>
            </Avatar>
            <div className="flex-grow overflow-hidden">
                <p className="font-semibold truncate">{contact.name}</p>
                <p className="text-sm text-muted-foreground truncate">{contact.lastMessage}</p>
            </div>
        </div>
        <div className="text-right flex flex-col items-end gap-1">
            <p className="text-xs text-accent">{contact.timestamp}</p>
            {contact.unread > 0 && <Badge className="bg-accent text-accent-foreground w-6 h-6 flex items-center justify-center">{contact.unread}</Badge>}
        </div>
    </ListItem>
);

const CallLogItem = ({ call }: { call: Call }) => (
    <ListItem>
        <div className="flex items-center gap-4 flex-grow">
            <Avatar className="h-12 w-12 text-2xl">
                <AvatarFallback>{call.contact.emoji}</AvatarFallback>
            </Avatar>
            <div className="flex-grow">
                <p className={`font-semibold ${call.status === 'missed' ? 'text-destructive' : ''}`}>{call.contact.name}</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {call.status === 'incoming' && <ArrowDownLeftIcon className="h-4 w-4 text-green-500" />}
                    {call.status === 'outgoing' && <ArrowUpRightIcon className="h-4 w-4 text-blue-500" />}
                    {call.status === 'missed' && <ArrowDownLeftIcon className="h-4 w-4 text-destructive" />}
                    <p>{call.time}</p>
                </div>
            </div>
        </div>
        <Button variant="ghost" size="icon">
            {call.type === 'video' ? <VideoCallIcon className="h-6 w-6 text-primary" /> : <VoiceCallIcon className="h-6 w-6 text-primary" />}
        </Button>
    </ListItem>
);

const UpdateItem = ({ update }: { update: any }) => {
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
                        <Button size="sm" variant="outline">Reject</Button>
                        <Button size="sm">Accept</Button>
                    </div>
                </div>
            </div>
        );
    }
    return <div className="p-3 text-sm text-muted-foreground">{update.message}</div>;
};

export default function MainView({ user, contacts, updates, calls, onStartChat, onOpenAddFriend, onOpenProfile }: MainViewProps) {
  return (
    <div className="w-full h-full flex flex-col bg-background">
      <header className="bg-header-bg text-icon-color shadow-md z-10">
        <div className="flex items-center justify-between p-3">
          <h1 className="text-xl font-bold font-headline">EchoConnect</h1>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={onOpenAddFriend} className="text-icon-color hover:bg-white/20">
              <AddFriendIcon className="h-6 w-6" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onOpenProfile} className="text-icon-color hover:bg-white/20">
              <MenuIcon className="h-6 w-6" />
            </Button>
          </div>
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
                    {contacts.map(contact => <ContactItem key={contact.id} contact={contact} onStartChat={onStartChat} />)}
                </TabsContent>
                <TabsContent value="updates" className="p-4 space-y-4">
                    {updates.map((update, i) => <UpdateItem key={i} update={update} />)}
                </TabsContent>
                <TabsContent value="calls">
                    {calls.map((call, i) => <CallLogItem key={i} call={call} />)}
                </TabsContent>
            </ScrollArea>
        </div>
      </Tabs>
    </div>
  );
}

// Dummy icons for call logs
const ArrowDownLeftIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 4.5 4.5 19.5m0-15v15h15" />
    </svg>
);
  
const ArrowUpRightIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 19.5 15-15m0 0H8.25m11.25 0v11.25" />
    </svg>
);
