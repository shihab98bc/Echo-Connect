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
    { id: 'user2', name: 'Zoe Lee', emoji: '🎨', lastMessage: 'See you tomorrow!', timestamp: '10:48 AM', unread: 2 },
    { id: 'user3', name: 'Ben Carter', emoji: '🚀', lastMessage: 'The project is looking great. Good job!', timestamp: '9:15 AM', unread: 0 },
    { id: 'user4', name: 'Mia Wong', emoji: '🌟', lastMessage: 'Can you send me the file?', timestamp: 'Yesterday', unread: 0 },
    { id: 'user5', name: 'Leo Martinez', emoji: '🎸', lastMessage: 'Let\'s practice this weekend.', timestamp: 'Yesterday', unread: 1 },
    { id: 'user6', name: 'Eva Chen', emoji: '💡', lastMessage: 'I have an idea for the new feature.', timestamp: 'Friday', unread: 0 },
];

export const mockMessages: Record<string, { sender: string; text: string; timestamp: string }[]> = {
    user2: [
        { sender: 'user2', text: 'Hey Alex, how are you?', timestamp: '10:40 AM' },
        { sender: 'user1', text: 'I\'m good, Zoe! Just working on the new design. How about you?', timestamp: '10:42 AM' },
        { sender: 'user2', text: 'Same here, getting ready for the presentation.', timestamp: '10:45 AM' },
        { sender: 'user2', text: 'Just wanted to confirm our meeting for tomorrow at 2 PM.', timestamp: '10:46 AM' },
        { sender: 'user1', text: 'Yep, confirmed! I\'ll have the mockups ready.', timestamp: '10:47 AM' },
        { sender: 'user2', text: 'Great. See you tomorrow!', timestamp: '10:48 AM' },
    ],
    user3: [
        { sender: 'user3', text: 'The project is looking great. Good job!', timestamp: '9:15 AM' },
    ],
    user4: [
        { sender: 'user4', text: 'Can you send me the file?', timestamp: 'Yesterday' },
    ],
    user5: [
        { sender: 'user1', text: 'Hey, are we on for practice?', timestamp: 'Yesterday' },
        { sender: 'user5', text: 'Let\'s practice this weekend.', timestamp: 'Yesterday' },
    ],
};
  
export const mockUpdates = [
    { type: 'request', from: { id: 'user7', name: 'Dr. Evelyn Reed', emoji: '🔬' } },
    { type: 'info', message: 'End-to-end encryption is enabled for all chats.' },
];
  
export const mockCalls = [
    { contact: mockContacts[0], type: 'video' as const, status: 'outgoing' as const, time: '12:30 PM' },
    { contact: mockContacts[2], type: 'voice' as const, status: 'incoming' as const, time: '11:15 AM' },
    { contact: mockContacts[3], type: 'video' as const, status: 'missed' as const, time: 'Yesterday' },
];
