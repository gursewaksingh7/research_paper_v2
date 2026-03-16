import React from 'react';
import { Role } from '../types';
import { UsersIcon, ChevronRightIcon } from './Icons';

interface RoleSelectorProps {
  onSelect: (role: Role, name: string, code?: string) => void;
  isReady?: boolean;
  isLoggedIn?: boolean;
  onLogin?: () => void;
  isLoggingIn?: boolean;
}

export const RoleSelector: React.FC<RoleSelectorProps> = ({ 
  onSelect, 
  isReady = true, 
  isLoggedIn = false,
  onLogin,
  isLoggingIn = false
}) => {
  const [name, setName] = React.useState('');
  const [showCodeInput, setShowCodeInput] = React.useState(false);
  const [code, setCode] = React.useState('');

  const handleStudentSelect = () => {
    if (!isReady) return;
    if (!isLoggedIn) {
      onLogin?.();
      return;
    }
    if (!showCodeInput) {
      setShowCodeInput(true);
    } else if (code.length === 6) {
      onSelect(Role.STUDENT, name, code);
    }
  };

  const handleTeacherSelect = () => {
    if (!isReady) return;
    if (!isLoggedIn) {
      onLogin?.();
      return;
    }
    onSelect(Role.TEACHER, name);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full relative overflow-hidden">
        {!isReady && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-50 flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-2"></div>
            <p className="text-sm font-medium text-indigo-600">Connecting to server...</p>
          </div>
        )}
        <div className="text-center mb-8">
            <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <UsersIcon className="w-8 h-8 text-indigo-600" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">ClassSync</h1>
            <p className="text-slate-500 mt-2">Real-time AI Classroom Translator</p>
        </div>

        {!isLoggedIn ? (
          <div className="space-y-6 text-center">
            <p className="text-slate-600">Sign in with Google to start or join a class.</p>
            <button 
              onClick={onLogin}
              disabled={isLoggingIn}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white border-2 border-slate-200 rounded-xl font-bold text-slate-700 hover:bg-slate-50 hover:border-indigo-500 transition-all shadow-sm disabled:opacity-50"
            >
              {isLoggingIn ? (
                <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
              )}
              Sign in with Google
            </button>
          </div>
        ) : (
          <div className="space-y-4">
              {!showCodeInput ? (
                <>
                  <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Your Name</label>
                      <input 
                          type="text" 
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Enter your name"
                          className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                      />
                  </div>

                  <div className="pt-4 space-y-3">
                      <button 
                          onClick={handleTeacherSelect}
                          disabled={!name}
                          className="w-full flex items-center justify-between p-4 border-2 border-slate-100 hover:border-indigo-500 rounded-xl transition-all group disabled:opacity-50"
                      >
                          <div className="text-left">
                              <span className="block font-semibold text-lg text-slate-900 group-hover:text-indigo-600">I am a Teacher</span>
                              <span className="text-sm text-slate-500">Host session, view dashboard</span>
                          </div>
                          <ChevronRightIcon className="text-slate-300 group-hover:text-indigo-500" />
                      </button>

                      <button 
                          onClick={handleStudentSelect}
                          disabled={!name}
                          className="w-full flex items-center justify-between p-4 border-2 border-slate-100 hover:border-purple-500 rounded-xl transition-all group disabled:opacity-50"
                      >
                          <div className="text-left">
                              <span className="block font-semibold text-lg text-slate-900 group-hover:text-purple-600">I am a Student</span>
                              <span className="text-sm text-slate-500">View captions, ask questions</span>
                          </div>
                          <ChevronRightIcon className="text-slate-300 group-hover:text-purple-500" />
                      </button>
                  </div>
                </>
              ) : (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <button 
                    onClick={() => setShowCodeInput(false)}
                    className="text-sm text-indigo-600 font-medium hover:underline"
                  >
                    ← Back to role selection
                  </button>
                  <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Enter 6-Digit Class Code</label>
                      <input 
                          type="text" 
                          maxLength={6}
                          value={code}
                          onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
                          placeholder="000000"
                          className="w-full px-4 py-4 text-center text-3xl tracking-[0.5em] font-bold rounded-lg border border-slate-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                      />
                  </div>
                  <button 
                      onClick={handleStudentSelect}
                      disabled={code.length !== 6}
                      className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold shadow-lg hover:bg-purple-700 transition-all disabled:opacity-50"
                  >
                      Join Class
                  </button>
                </div>
              )}
          </div>
        )}
      </div>
    </div>
  );
};
