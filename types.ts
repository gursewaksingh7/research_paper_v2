export enum Role {
  TEACHER = 'TEACHER',
  STUDENT = 'STUDENT',
  NONE = 'NONE'
}

export interface User {
  id: string;
  name: string;
  role: Role;
  isOnline: boolean;
  isSpeaking: boolean;
}

export interface TranscriptItem {
  id: string;
  speakerId: string;
  speakerName: string;
  timestamp: number;
  originalText: string;
  translatedText: string;
  originalLang: 'en' | 'hi';
  isFinal: boolean;
}

export interface Session {
  id: string;
  teacherId: string;
  teacherName: string;
  createdAt: number;
  isActive: boolean;
  code: string;
}

export interface AppState {
  role: Role;
  currentUser: User | null;
  participants: User[];
  transcripts: TranscriptItem[];
  isRecording: boolean;
  sourceLang: 'en' | 'hi';
}