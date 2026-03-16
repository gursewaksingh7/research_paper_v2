import React, { useRef, useEffect } from 'react';
import { TranscriptItem } from '../types';

interface StudentLiveCaptionProps {
  lastItem: TranscriptItem | null;
  mode: 'original' | 'translated' | 'both';
}

export const StudentLiveCaption: React.FC<StudentLiveCaptionProps> = ({ lastItem, mode }) => {
  if (!lastItem) {
    return (
      <div className="flex items-center justify-center h-full text-slate-300 text-2xl font-light">
        Waiting for speech...
      </div>
    );
  }

  const showOriginal = mode === 'original' || mode === 'both';
  const showTranslated = mode === 'translated' || mode === 'both';

  return (
    <div className="flex flex-col justify-center items-center h-full px-8 text-center transition-all duration-300">
      <div className="max-w-4xl w-full space-y-8">
        
        <div className="flex items-center justify-center gap-2 mb-4">
             <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">
               {lastItem.speakerName} is speaking...
             </span>
        </div>

        {showOriginal && (
          <div className="transition-all duration-500">
             <p className="text-4xl md:text-5xl font-semibold text-slate-900 leading-tight">
                {lastItem.originalText}
             </p>
          </div>
        )}

        {mode === 'both' && <div className="h-px w-24 bg-slate-300 mx-auto my-6"></div>}

        {showTranslated && (
          <div className="transition-all duration-500">
             {lastItem.translatedText ? (
                <p className="text-3xl md:text-4xl font-medium text-indigo-600 leading-tight">
                    {lastItem.translatedText}
                </p>
             ) : (
                 <div className="flex justify-center gap-1 mt-2">
                    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-75"></span>
                    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-150"></span>
                 </div>
             )}
          </div>
        )}
      </div>
    </div>
  );
};