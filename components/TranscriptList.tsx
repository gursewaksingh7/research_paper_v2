import React, { useEffect, useRef } from 'react';
import { TranscriptItem } from '../types';

interface TranscriptListProps {
  transcripts: TranscriptItem[];
  viewMode?: 'split' | 'original' | 'translated'; // split is for teacher mainly
}

export const TranscriptList: React.FC<TranscriptListProps> = ({ transcripts, viewMode = 'split' }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts]);

  if (transcripts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400">
        <p>No speech detected yet.</p>
        <p className="text-sm">Start the microphone to begin.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 pb-20 overflow-y-auto h-full scrollbar-hide">
      {transcripts.map((item) => (
        <div key={item.id} className={`flex flex-col gap-1 p-3 rounded-lg border ${!item.isFinal ? 'opacity-60 bg-slate-50 border-dashed border-slate-300' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">
              {item.speakerName}
            </span>
            <span className="text-xs text-slate-400">
              {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          <div className={`grid ${viewMode === 'split' ? 'grid-cols-2 gap-4' : 'grid-cols-1'}`}>
            {/* Original Text */}
            {(viewMode === 'split' || viewMode === 'original') && (
              <div>
                 {viewMode === 'split' && <span className="text-[10px] text-slate-400 block mb-1">ORIGINAL ({item.originalLang.toUpperCase()})</span>}
                 <p className="text-slate-800 text-lg leading-snug">{item.originalText}</p>
              </div>
            )}

            {/* Translated Text */}
            {(viewMode === 'split' || viewMode === 'translated') && (
              <div className={`${viewMode === 'split' ? 'border-l pl-4 border-slate-100' : ''}`}>
                 {viewMode === 'split' && <span className="text-[10px] text-slate-400 block mb-1">TRANSLATED ({item.originalLang === 'en' ? 'HI' : 'EN'})</span>}
                 {item.translatedText ? (
                    <p className="text-indigo-900 font-medium text-lg leading-snug font-sans">{item.translatedText}</p>
                 ) : (
                    <div className="animate-pulse h-4 bg-slate-200 rounded w-3/4 mt-1"></div>
                 )}
              </div>
            )}
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
};