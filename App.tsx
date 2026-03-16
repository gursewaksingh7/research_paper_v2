import React, { useState, useEffect, useCallback, useRef } from 'react';
import { RoleSelector } from './components/RoleSelector';
import { TranscriptList } from './components/TranscriptList';
import { StudentLiveCaption } from './components/StudentLiveCaption';
import { MicIcon, MicOffIcon, UsersIcon, DownloadIcon, TranslateIcon, CopyIcon } from './components/Icons';
import { Role, User, TranscriptItem } from './types';
import { SpeechRecognitionService } from './services/speechService';
import { translateText } from './services/geminiService';

function App() {
  const [role, setRole] = useState<Role>(Role.NONE);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [participants, setParticipants] = useState<User[]>([]);
  const [transcripts, setTranscripts] = useState<TranscriptItem[]>([]);
  const [liveTranscript, setLiveTranscript] = useState<TranscriptItem | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [sourceLang, setSourceLang] = useState<'en' | 'hi'>('en');
  const [studentViewMode, setStudentViewMode] = useState<'original' | 'translated' | 'both'>('both');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionCode, setSessionCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isCreatingSession, setIsCreatingSession] = useState(false);

  // References for services
  const speechService = useRef<SpeechRecognitionService | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const lastProcessedText = useRef<string>('');
  const lastProcessedTime = useRef<number>(0);

  // Initialize WebSocket
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    console.log("Connecting to WebSocket at:", wsUrl);
    
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      console.log("Connected to WebSocket server");
      setIsConnected(true);
      setError(null);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        const { type, payload } = message;
        console.log("Received message:", type, payload);

        switch (type) {
          case "SESSION_CREATED":
            setSessionId(payload.sessionId);
            setSessionCode(payload.code);
            setIsCreatingSession(false);
            break;
          
          case "JOIN_SUCCESS":
            setSessionId(payload.sessionId);
            setTranscripts(payload.transcripts);
            setParticipants(payload.participants.filter((p: any) => p.id !== currentUser?.id));
            setIsCreatingSession(false);
            break;

          case "NEW_TRANSCRIPT":
            setTranscripts(prev => [...prev, payload]);
            setLiveTranscript(payload);
            break;

          case "LIVE_CAPTION":
            setLiveTranscript(payload);
            break;

          case "PARTICIPANT_JOINED":
            setParticipants(prev => [...prev, payload]);
            break;

          case "PARTICIPANT_LEFT":
            setParticipants(prev => prev.filter(p => p.id !== payload));
            break;

          case "ERROR":
            setError(payload);
            setRole(Role.NONE);
            setIsCreatingSession(false);
            break;
        }
      } catch (err) {
        console.error("Error parsing message:", err);
      }
    };

    ws.onclose = () => {
      console.log("Disconnected from WebSocket server");
      setIsConnected(false);
      // Attempt to reconnect after a delay
      setTimeout(() => {
        if (socketRef.current?.readyState === WebSocket.CLOSED) {
          setError("Connection lost. Please refresh the page.");
        }
      }, 5000);
    };

    setSocket(ws);

    return () => {
      ws.close();
    };
  }, []); // Only run once on mount

  // Handle Speech Result
  const handleSpeechResult = useCallback(async (text: string, isFinal: boolean) => {
    if (!currentUser || !sessionId || !socket || !isFinal) return;

    const trimmedText = text.trim();
    if (!trimmedText) return;

    // Duplicate check: Ignore if the same text was processed within the last 2 seconds
    const now = Date.now();
    if (trimmedText === lastProcessedText.current && (now - lastProcessedTime.current) < 2000) {
      console.log("Ignoring duplicate transcript:", trimmedText);
      return;
    }

    lastProcessedText.current = trimmedText;
    lastProcessedTime.current = now;

    try {
      const translation = await translateText(trimmedText, sourceLang);
      const transcriptData = {
        speakerId: currentUser.id,
        speakerName: currentUser.name,
        originalText: trimmedText,
        translatedText: translation,
        originalLang: sourceLang,
        isFinal: true
      };
      socket.send(JSON.stringify({ type: "SEND_TRANSCRIPT", payload: transcriptData }));
    } catch (err) {
      console.error("Translation error:", err);
    }
  }, [currentUser, sessionId, socket, sourceLang]);

  // Initialize Speech Service
  useEffect(() => {
    speechService.current = new SpeechRecognitionService(
        handleSpeechResult,
        () => setIsRecording(false),
        sourceLang
    );
    return () => {
        speechService.current?.stop();
    };
  }, [handleSpeechResult, sourceLang]);

  const toggleRecording = () => {
    if (isRecording) {
        speechService.current?.stop();
        setIsRecording(false);
    } else {
        speechService.current?.start();
        setIsRecording(true);
    }
  };

  const handleRoleSelect = async (selectedRole: Role, name: string, code?: string) => {
    if (!socket || !isConnected) {
      setError("Not connected to server. Please wait...");
      return;
    }

    const userId = Math.random().toString(36).substring(2, 15);
    const userData: User = {
      id: userId,
      name: name,
      role: selectedRole,
      isOnline: true,
      isSpeaking: false
    };

    setCurrentUser(userData);
    setRole(selectedRole);
    setIsCreatingSession(true);

    if (selectedRole === Role.TEACHER) {
      socket.send(JSON.stringify({ 
        type: "HOST_SESSION", 
        payload: { teacherId: userId, teacherName: name } 
      }));
    } else {
      if (!code) {
        setError("Join code required");
        setRole(Role.NONE);
        setIsCreatingSession(false);
        return;
      }
      socket.send(JSON.stringify({ 
        type: "JOIN_SESSION", 
        payload: { code, userId, name, role: selectedRole } 
      }));
    }
  };

  const handleLogout = () => {
    setRole(Role.NONE);
    setSessionId(null);
    setSessionCode(null);
    setCurrentUser(null);
    setParticipants([]);
    setTranscripts([]);
  };

  const downloadTranscript = () => {
    const content = transcripts
        .map(t => `[${new Date(t.timestamp).toLocaleTimeString()}] ${t.speakerName}: ${t.originalText} \n(Trans: ${t.translatedText})\n`)
        .join('\n');
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ClassSync_Transcript_${new Date().toISOString().slice(0,10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const changeLanguage = (lang: 'en' | 'hi') => {
      setSourceLang(lang);
      speechService.current?.updateLang(lang);
  };

  if (role === Role.NONE || isCreatingSession) {
    return (
      <div className="relative">
        {isCreatingSession ? (
          <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <h2 className="text-xl font-bold text-slate-800">Creating Session...</h2>
            <p className="text-slate-500">Please wait while we set up your classroom.</p>
          </div>
        ) : (
          <RoleSelector 
            onSelect={handleRoleSelect} 
            isReady={isConnected} 
            isLoggedIn={true} 
          />
        )}
        {error && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50 shadow-lg">
            <p className="font-bold">Error</p>
            <p className="text-sm">{error}</p>
            <button onClick={() => setError(null)} className="absolute top-0 bottom-0 right-0 px-4 py-3">
              <span className="text-xl">&times;</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  const Header = () => (
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm z-10 sticky top-0">
          <div className="flex items-center gap-4">
              <button 
                onClick={handleLogout}
                className="text-xs text-slate-400 hover:text-slate-600 font-medium"
              >
                Exit
              </button>
              <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-slate-300'}`}></div>
                  <h1 className="font-bold text-slate-800 text-lg">ClassSync</h1>
              </div>

              {sessionCode && (
                <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Class Code:</span>
                  <span className="font-mono font-bold text-indigo-600 text-lg tracking-widest">{sessionCode}</span>
                  <button 
                    onClick={() => navigator.clipboard.writeText(sessionCode)}
                    className="p-1 hover:bg-slate-200 rounded transition-colors"
                    title="Copy Code"
                  >
                    <CopyIcon className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                </div>
              )}
          </div>
          
          <div className="flex items-center gap-4">
              <div className="flex bg-slate-100 p-1 rounded-lg">
                  <button 
                    onClick={() => changeLanguage('en')}
                    className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${sourceLang === 'en' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                      ENG
                  </button>
                  <button 
                    onClick={() => changeLanguage('hi')}
                    className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${sourceLang === 'hi' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                      HIN
                  </button>
              </div>

              <button 
                onClick={toggleRecording}
                className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all ${isRecording ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200'}`}
              >
                  {isRecording ? <MicOffIcon className="w-4 h-4" /> : <MicIcon className="w-4 h-4" />}
                  {isRecording ? 'Stop Mic' : 'Start Mic'}
              </button>
          </div>
      </header>
  );

  if (role === Role.TEACHER) {
      return (
          <div className="flex flex-col h-screen bg-slate-50">
              <Header />
              <div className="flex flex-1 overflow-hidden">
                  <div className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col">
                      <div className="p-4 border-b border-slate-100">
                          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                              <UsersIcon className="w-4 h-4" /> Participants ({participants.length + 1})
                          </h2>
                      </div>
                      <div className="flex-1 overflow-y-auto p-2">
                          <div className="p-2 flex items-center gap-3 rounded-lg bg-indigo-50 border border-indigo-100 mb-2">
                             <div className="w-8 h-8 rounded-full bg-indigo-200 flex items-center justify-center text-indigo-700 text-xs font-bold">YOU</div>
                             <div>
                                 <p className="text-sm font-medium text-slate-900">{currentUser?.name}</p>
                                 <p className="text-xs text-indigo-600">Broadcasting</p>
                             </div>
                          </div>
                          {participants.map(p => (
                              <div key={p.id} className="p-2 flex items-center gap-3 rounded-lg hover:bg-slate-50">
                                  <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 text-xs font-bold">{p.name.charAt(0)}</div>
                                  <div>
                                      <p className="text-sm font-medium text-slate-700">{p.name}</p>
                                      <p className="text-xs text-slate-400">{p.isOnline ? 'Online' : 'Offline'}</p>
                                  </div>
                              </div>
                          ))}
                      </div>
                      <div className="p-4 border-t border-slate-100">
                          <button 
                            onClick={downloadTranscript}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                          >
                              <DownloadIcon className="w-4 h-4" /> Download
                          </button>
                      </div>
                  </div>

                  <div className="flex-1 flex flex-col bg-slate-50 relative">
                      <div className="absolute top-4 left-0 right-0 z-0 flex justify-center pointer-events-none opacity-5">
                          <TranslateIcon className="w-64 h-64 text-slate-900" />
                      </div>
                      <div className="flex-1 overflow-hidden flex flex-col">
                        <TranscriptList transcripts={transcripts} viewMode="split" />
                        {liveTranscript && !liveTranscript.isFinal && (
                          <div className="px-4 pb-4">
                            <div className="p-3 rounded-lg border border-dashed border-indigo-300 bg-indigo-50/50 opacity-70 animate-pulse">
                              <p className="text-xs font-semibold text-indigo-600 uppercase mb-1">Live Caption...</p>
                              <p className="text-slate-800 text-lg">{liveTranscript.originalText}</p>
                            </div>
                          </div>
                        )}
                      </div>
                  </div>
              </div>
          </div>
      );
  }

  return (
      <div className="flex flex-col h-screen bg-slate-50">
          <Header />
          <div className="flex-1 flex flex-col relative overflow-hidden">
              <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20 bg-white/90 backdrop-blur-sm border border-slate-200 rounded-full shadow-xl p-1 flex gap-1">
                  <button 
                    onClick={() => setStudentViewMode('original')}
                    className={`px-4 py-2 text-sm font-medium rounded-full transition-all ${studentViewMode === 'original' ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}
                  >
                      Original
                  </button>
                  <button 
                    onClick={() => setStudentViewMode('both')}
                    className={`px-4 py-2 text-sm font-medium rounded-full transition-all ${studentViewMode === 'both' ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}
                  >
                      Split
                  </button>
                  <button 
                    onClick={() => setStudentViewMode('translated')}
                    className={`px-4 py-2 text-sm font-medium rounded-full transition-all ${studentViewMode === 'translated' ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}
                  >
                      Translated
                  </button>
              </div>

              <div className="flex-1 overflow-y-auto scrollbar-hide">
                  <StudentLiveCaption lastItem={liveTranscript} mode={studentViewMode} />
              </div>
              
              <div className="h-1/3 border-t border-slate-200 bg-white overflow-hidden flex flex-col">
                  <div className="bg-slate-50 px-4 py-2 border-b border-slate-100 flex justify-between items-center">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Transcript History</span>
                      <button onClick={downloadTranscript} className="text-indigo-600 hover:text-indigo-800">
                          <DownloadIcon className="w-4 h-4" />
                      </button>
                  </div>
                  <div className="flex-1 overflow-hidden">
                      <TranscriptList transcripts={transcripts} viewMode="translated" />
                  </div>
              </div>
          </div>
      </div>
  );
}

export default App;
