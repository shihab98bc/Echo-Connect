export const mockUser = {
    uid: 'user1',
    name: 'Alex Ray',
    emoji: '😎',
    id: '@alexray1234',
    blocked: {
      user5: true,
    },
};
  
export const mockContacts = [
    { id: 'user2', name: 'Zoe Lee', emoji: '🎨', lastMessage: 'See you tomorrow!', timestamp: '10:48 AM', unread: 2, isMuted: false },
    { id: 'user3', name: 'Ben Carter', emoji: '🚀', lastMessage: 'The project is looking great. Good job!', timestamp: '9:15 AM', unread: 0, isMuted: false },
    { 
        id: 'group1', 
        name: 'Design Team', 
        emoji: '🎨🚀🌟', 
        lastMessage: 'Ben: Let\'s sync up at 3 PM.', 
        timestamp: '11:30 AM', 
        unread: 5,
        isGroup: true,
        isMuted: false,
        members: [
            { id: 'user1', name: 'Alex Ray', emoji: '😎' },
            { id: 'user2', name: 'Zoe Lee', emoji: '🎨' },
            { id: 'user3', name: 'Ben Carter', emoji: '🚀' },
            { id: 'user4', name: 'Mia Wong', emoji: '🌟' },
        ]
    },
    { id: 'user4', name: 'Mia Wong', emoji: '🌟', lastMessage: 'Can you send me the file?', timestamp: 'Yesterday', unread: 0, isMuted: true },
    { id: 'user5', name: 'Leo Martinez', emoji: '🎸', lastMessage: 'Let\'s practice this weekend.', timestamp: 'Yesterday', unread: 1, isMuted: false },
    { id: 'user6', name: 'Eva Chen', emoji: '💡', lastMessage: 'I have an idea for the new feature.', timestamp: 'Friday', unread: 0, isMuted: false },
    { 
        id: 'group2', 
        name: 'Weekend Jam', 
        emoji: '🎸💡', 
        lastMessage: 'You: Who can make it on Saturday?', 
        timestamp: 'Wednesday', 
        unread: 0,
        isGroup: true,
        isMuted: true,
        members: [
            { id: 'user1', name: 'Alex Ray', emoji: '😎' },
            { id: 'user5', name: 'Leo Martinez', emoji: '🎸' },
            { id: 'user6', name: 'Eva Chen', emoji: '💡' },
        ]
    },
];

export const mockMessages: Record<string, { sender: string; text: string; timestamp: string, type?: 'text' | 'image' | 'audio', duration?: number }[]> = {
    user2: [
        { sender: 'user2', text: 'Hey Alex, how are you?', timestamp: '10:40 AM', type: 'text' },
        { sender: 'user1', text: 'I\'m good, Zoe! Just working on the new design. How about you?', timestamp: '10:42 AM', type: 'text' },
        { sender: 'user2', text: 'Same here, getting ready for the presentation.', timestamp: '10:45 AM', type: 'text' },
        { sender: 'user2', text: 'Just wanted to confirm our meeting for tomorrow at 2 PM.', timestamp: '10:46 AM', type: 'text' },
        { sender: 'user1', text: 'Yep, confirmed! I\'ll have the mockups ready.', timestamp: '10:47 AM', type: 'text' },
        { sender: 'user2', text: 'Great. See you tomorrow!', timestamp: '10:48 AM', type: 'text' },
    ],
    user3: [
        { sender: 'user3', text: 'The project is looking great. Good job!', timestamp: '9:15 AM', type: 'text' },
    ],
    user4: [
        { sender: 'user4', text: 'Can you send me the file?', timestamp: 'Yesterday', type: 'text' },
    ],
    user5: [
        { sender: 'user1', text: 'Hey, are we on for practice?', timestamp: 'Yesterday', type: 'text' },
        { sender: 'user5', text: 'Let\'s practice this weekend.', timestamp: 'Yesterday', type: 'text' },
    ],
    group1: [
        { sender: 'user2', text: 'Hey team, the new mockups are ready for review!', timestamp: '11:25 AM', type: 'text' },
        { sender: 'user4', text: 'Awesome, I\'ll take a look now.', timestamp: '11:26 AM', type: 'text' },
        { sender: 'user1', text: 'Looking good Zoe!', timestamp: '11:28 AM', type: 'text' },
        { sender: 'user3', text: 'Let\'s sync up at 3 PM to discuss feedback.', timestamp: '11:30 AM', type: 'text' },
    ],
    group2: [
        { sender: 'user5', text: 'Practice this weekend?', timestamp: 'Wednesday', type: 'text' },
        { sender: 'user1', text: 'Who can make it on Saturday?', timestamp: 'Wednesday', type: 'text' },
    ],
};
  
export const mockUpdates = [
    { 
        id: 'update1', 
        type: 'request' as const, 
        from: { id: 'user7', name: 'Dr. Evelyn Reed', emoji: '🔬' }
    },
    { id: 'update2', type: 'info' as const, message: 'End-to-end encryption is enabled for all chats.' },
];
  
export const mockCalls = [
    { id: 'call1', contact: mockContacts.find(c => c.id === 'group1')!, type: 'video' as const, status: 'missed' as const, time: '2:45 PM' },
    { id: 'call2', contact: mockContacts[0], type: 'video' as const, status: 'outgoing' as const, time: '12:30 PM' },
    { id: 'call3', contact: mockContacts[2], type: 'voice' as const, status: 'incoming' as const, time: '11:15 AM' },
    { id: 'call4', contact: mockContacts[4], type: 'video' as const, status: 'missed' as const, time: 'Yesterday' },
];

    
