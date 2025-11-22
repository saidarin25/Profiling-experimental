import React, { useState, useRef } from 'react';
import { MediaType } from '../types';
import {
  VideoCameraIcon,
  MicrophoneIcon,
  DocumentTextIcon,
  PhotoIcon,
  ComputerDesktopIcon,
  DocumentPlusIcon,
} from '@heroicons/react/24/outline';

interface InputConsoleProps {
  onAnalyze: (files: File[], type: MediaType, description: string) => Promise<void>;
  isAnalyzing: boolean;
}

export const InputConsole: React.FC<InputConsoleProps> = ({ onAnalyze, isAnalyzing }) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'record' | 'screen'>('upload');
  const [description, setDescription] = useState('');
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      // Cast Array.from result to File[] to ensure TS knows elements have .type property
      const files: File[] = Array.from(e.target.files);
      
      // Determine dominant type for the icon/log
      let type = MediaType.TEXT_FILE;
      const firstType = files[0].type;

      if (firstType.includes('image')) type = MediaType.IMAGE;
      else if (firstType.includes('pdf')) type = MediaType.PDF;
      else if (firstType.includes('audio')) type = MediaType.AUDIO;
      else if (firstType.includes('video')) type = MediaType.VIDEO;
      else if (firstType.includes('html') || firstType.includes('text')) type = MediaType.HTML;
      
      onAnalyze(files, type, description);
      // Reset input
      e.target.value = '';
      setDescription('');
    }
  };

  const startRecording = async (type: 'audio' | 'screen') => {
    try {
      let stream: MediaStream;
      if (type === 'screen') {
        // Request both video and audio for screen capture to get system audio or mic if needed
        stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      } else {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: type === 'screen' ? 'video/webm' : 'audio/webm' });
        const file = new File([blob], type === 'screen' ? 'screen-capture.webm' : 'voice-note.webm', {
            type: type === 'screen' ? 'video/webm' : 'audio/webm'
        });
        onAnalyze([file], type === 'screen' ? MediaType.VIDEO : MediaType.AUDIO, description);
        
        setDescription(''); // Reset after successful analysis trigger
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setRecording(true);
    } catch (err) {
      console.error("Error starting recording:", err);
      alert("Could not access media devices. Please ensure permissions are granted.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  return (
    <div className="bg-charcoal rounded-xl border border-slate-700 overflow-hidden shadow-lg mb-6">
      {/* Context Input */}
      <div className="p-4 border-b border-slate-700 bg-slate-900/30">
         <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
             Analysis Context
         </label>
         <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Identify speakers (e.g., 'I am the blue text bubble') or describe the situation/relationship..."
            className="w-full bg-slate-800 text-slate-200 text-sm rounded-lg border border-slate-700 p-3 focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition-all resize-none h-20"
         />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-700">
        <button
          onClick={() => setActiveTab('upload')}
          className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
            activeTab === 'upload' ? 'bg-slate-700/50 text-accent' : 'text-slate-400 hover:bg-slate-800'
          }`}
        >
          <DocumentPlusIcon className="w-5 h-5" /> Upload Evidence
        </button>
        <button
          onClick={() => setActiveTab('screen')}
          className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
            activeTab === 'screen' ? 'bg-slate-700/50 text-accent' : 'text-slate-400 hover:bg-slate-800'
          }`}
        >
          <ComputerDesktopIcon className="w-5 h-5" /> Screen Capture
        </button>
        <button
          onClick={() => setActiveTab('record')}
          className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
            activeTab === 'record' ? 'bg-slate-700/50 text-accent' : 'text-slate-400 hover:bg-slate-800'
          }`}
        >
          <MicrophoneIcon className="w-5 h-5" /> Audio Record
        </button>
      </div>

      {/* Content */}
      <div className="p-6 min-h-[200px] flex flex-col items-center justify-center">
        {isAnalyzing ? (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent mx-auto mb-4"></div>
            <p className="text-accent animate-pulse font-semibold">Synthesizing Psychological Profile...</p>
            <p className="text-xs text-slate-500 mt-2">Merging new evidence with existing behavioral data</p>
          </div>
        ) : (
          <>
            {activeTab === 'upload' && (
              <div className="w-full text-center">
                 <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-slate-600 border-dashed rounded-lg cursor-pointer bg-slate-800/50 hover:bg-slate-700/50 transition-all group">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <PhotoIcon className="w-12 h-12 mb-3 text-slate-400 group-hover:text-accent transition-colors" />
                        <p className="mb-2 text-sm text-slate-300"><span className="font-semibold text-accent">Click to upload</span> multiple files</p>
                        <p className="text-xs text-slate-500 max-w-xs mx-auto">
                            Supports: <span className="text-slate-400">Images</span>, <span className="text-slate-400">PDFs</span>, <span className="text-slate-400">HTML</span>, <span className="text-slate-400">Audio</span>, <span className="text-slate-400">Video</span>
                        </p>
                        <p className="text-[10px] text-slate-600 mt-2">You can select multiple images at once.</p>
                    </div>
                    <input 
                        type="file" 
                        className="hidden" 
                        onChange={handleFileChange} 
                        accept="image/*,application/pdf,audio/*,video/*,text/html,.html" 
                        multiple 
                    />
                </label>
              </div>
            )}

            {activeTab === 'screen' && (
              <div className="text-center max-w-md">
                <h3 className="text-slate-200 font-semibold mb-2">Capture Text Conversations</h3>
                <p className="text-slate-400 mb-6 text-sm">
                  This is the most efficient way to analyze long message threads. Start recording, then 
                  <span className="text-accent"> scroll slowly</span> through the text conversation on your screen. 
                  The AI will read the scrolling text and analyze the dynamic.
                </p>
                {!recording ? (
                  <button
                    onClick={() => startRecording('screen')}
                    className="bg-accent hover:bg-accent-hover text-white px-8 py-3 rounded-full font-bold flex items-center gap-2 mx-auto transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:scale-105"
                  >
                    <ComputerDesktopIcon className="w-5 h-5" /> Start Screen Capture
                  </button>
                ) : (
                   <button
                    onClick={stopRecording}
                    className="bg-red-500 hover:bg-red-600 text-white px-8 py-3 rounded-full font-bold flex items-center gap-2 mx-auto animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.4)]"
                  >
                    <div className="w-3 h-3 bg-white rounded-sm" /> Stop Recording
                  </button>
                )}
              </div>
            )}

            {activeTab === 'record' && (
              <div className="text-center max-w-md">
                <h3 className="text-slate-200 font-semibold mb-2">Voice Analysis</h3>
                <p className="text-slate-400 mb-6 text-sm">
                    Record a voice note or live conversation. The AI will detect emotional leakage, hesitation markers, and stress levels in the voice.
                </p>
                {!recording ? (
                  <button
                    onClick={() => startRecording('audio')}
                    className="bg-accent hover:bg-accent-hover text-white px-8 py-3 rounded-full font-bold flex items-center gap-2 mx-auto transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:scale-105"
                  >
                    <MicrophoneIcon className="w-5 h-5" /> Start Microphone
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    className="bg-red-500 hover:bg-red-600 text-white px-8 py-3 rounded-full font-bold flex items-center gap-2 mx-auto animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.4)]"
                  >
                    <div className="w-3 h-3 bg-white rounded-sm" /> Stop Recording
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
