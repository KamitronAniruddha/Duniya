import { PlaceHolderImages } from "./placeholder-images";

export type UserStatus = 'online' | 'idle' | 'offline' | 'dnd';

export interface User {
  id: string;
  name: string;
  avatar: string;
  status: UserStatus;
  bio?: string;
  isMe?: boolean;
}

export interface Message {
  id: string;
  senderId: string;
  content: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
  reactions?: { emoji: string; count: number }[];
  replyTo?: string;
}

export interface Channel {
  id: string;
  name: string;
  type: 'text' | 'voice';
  topic?: string;
}

export interface Server {
  id: string;
  name: string;
  icon: string;
  channels: Channel[];
}

export const CURRENT_USER: User = {
  id: 'me',
  name: 'Alex Rivera',
  avatar: PlaceHolderImages.find(img => img.id === 'avatar-user')?.imageUrl || '',
  status: 'online',
  bio: 'Software Engineer & Designer',
  isMe: true
};

export const MOCK_SERVERS: Server[] = [
  {
    id: 's1',
    name: 'Gaming Hub',
    icon: PlaceHolderImages.find(img => img.id === 'server-gaming')?.imageUrl || '',
    channels: [
      { id: 'c1', name: 'general', type: 'text', topic: 'Main lobby' },
      { id: 'c2', name: 'strategy', type: 'text' },
      { id: 'v1', name: 'Lounge', type: 'voice' },
    ]
  },
  {
    id: 's2',
    name: 'Tech World',
    icon: PlaceHolderImages.find(img => img.id === 'server-tech')?.imageUrl || '',
    channels: [
      { id: 'c3', name: 'news', type: 'text' },
      { id: 'c4', name: 'dev-talk', type: 'text' },
    ]
  },
  {
    id: 's3',
    name: 'Connect Design',
    icon: PlaceHolderImages.find(img => img.id === 'server-design')?.imageUrl || '',
    channels: [
      { id: 'c5', name: 'showcase', type: 'text' },
      { id: 'c6', name: 'critique', type: 'text' },
    ]
  }
];

export const MOCK_MESSAGES: Message[] = [
  { id: 'm1', senderId: 'u1', content: "Hey everyone! How is the project going?", timestamp: '10:30 AM', status: 'read' },
  { id: 'm2', senderId: 'me', content: "It's going great, just finished the new messaging engine components.", timestamp: '10:31 AM', status: 'read' },
  { id: 'm3', senderId: 'u2', content: "Awesome work! Can't wait to see it in action. Does it support reactions yet?", timestamp: '10:32 AM', status: 'read' },
  { id: 'm4', senderId: 'me', content: "Yes! And threaded replies too. 🚀", timestamp: '10:33 AM', status: 'delivered' },
];

export const MOCK_USERS: Record<string, User> = {
  'u1': { id: 'u1', name: 'Sarah Chen', avatar: 'https://picsum.photos/seed/sarah/200/200', status: 'online' },
  'u2': { id: 'u2', name: 'James Wilson', avatar: 'https://picsum.photos/seed/james/200/200', status: 'idle' },
  'me': CURRENT_USER
};