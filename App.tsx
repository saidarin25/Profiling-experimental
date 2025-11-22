import React, { useState, useEffect, useRef, useMemo } from 'react';
import { InputConsole } from './components/InputConsole';
import { AnalysisDashboard } from './components/AnalysisDashboard';
import { PsychologicalProfile, MediaType } from './types';
import { analyzeMedia, MediaInput } from './services/gemini';
import { 
    SparklesIcon, 
    ArrowDownTrayIcon, 
    TrashIcon, 
    DocumentTextIcon, 
    DocumentIcon, 
    CodeBracketIcon, 
    ChevronDownIcon,
    UserGroupIcon,
    PlusCircleIcon,
    UserIcon,
    CheckIcon
} from '@heroicons/react/24/solid';

const generateNewProfile = (): PsychologicalProfile => ({
  id: crypto.randomUUID(),
  firstName: "New",
  lastName: "Subject",
  dateOfBirth: "",
  lastUpdated: Date.now(),
  bigFive: {
    openness: 50,
    conscientiousness: 50,
    extraversion: 50,
    agreeableness: 50,
    neuroticism: 50
  },
  mbti: "Unknown",
  enneagram: "Unknown",
  attachmentStyle: "Unknown",
  summary: "Profile pending. Upload evidence (text screenshots, photos, videos, audio) to begin the psychological profiling process.",
  keyTraits: [],
  bodyLanguageNotes: [],
  toneVoiceNotes: [],
  history: []
});

function App() {
  // Profiles State: Dictionary of ID -> Profile
  const [profiles, setProfiles] = useState<Record<string, PsychologicalProfile>>({});
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // UI States
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // --- Initialization & Migration Logic ---
  useEffect(() => {
    const loadData = () => {
        const savedProfiles = localStorage.getItem('psycho_profiles_db');
        const savedActiveId = localStorage.getItem('psycho_active_id');
        
        if (savedProfiles) {
            // Happy path: Load existing multi-profile DB
            try {
                const parsedProfiles = JSON.parse(savedProfiles);
                setProfiles(parsedProfiles);
                
                // Restore active session or default to first available
                if (savedActiveId && parsedProfiles[savedActiveId]) {
                    setActiveProfileId(savedActiveId);
                } else {
                    const firstId = Object.keys(parsedProfiles)[0];
                    if (firstId) setActiveProfileId(firstId);
                }
            } catch (e) {
                console.error("DB Corruption", e);
                // Fallback to reset if DB is corrupt
                const newP = generateNewProfile();
                setProfiles({ [newP.id]: newP });
                setActiveProfileId(newP.id);
            }
        } else {
            // Migration Path: Check for legacy single profile
            const legacyProfile = localStorage.getItem('psycho_profile_v3');
            if (legacyProfile) {
                try {
                    const parsedLegacy = JSON.parse(legacyProfile);
                    const newId = crypto.randomUUID();
                    const migratedProfile: PsychologicalProfile = {
                        ...generateNewProfile(), // defaults
                        ...parsedLegacy,        // overwrite with legacy data
                        id: newId,              // ensure ID is set
                        firstName: parsedLegacy.firstName || parsedLegacy.name?.split(' ')[0] || "Subject",
                        lastName: parsedLegacy.lastName || parsedLegacy.name?.split(' ').slice(1).join(' ') || "001",
                    };
                    
                    setProfiles({ [newId]: migratedProfile });
                    setActiveProfileId(newId);
                    
                    // Clean up legacy key
                    localStorage.removeItem('psycho_profile_v3');
                } catch (e) {
                    // Legacy corrupt? Start fresh
                    const newP = generateNewProfile();
                    setProfiles({ [newP.id]: newP });
                    setActiveProfileId(newP.id);
                }
            } else {
                // Totally fresh start
                const newP = generateNewProfile();
                setProfiles({ [newP.id]: newP });
                setActiveProfileId(newP.id);
            }
        }
    };
    loadData();
  }, []);

  // --- Persistence Logic ---
  useEffect(() => {
      if (Object.keys(profiles).length > 0) {
        localStorage.setItem('psycho_profiles_db', JSON.stringify(profiles));
      }
  }, [profiles]);

  useEffect(() => {
      if (activeProfileId) {
        localStorage.setItem('psycho_active_id', activeProfileId);
      }
  }, [activeProfileId]);

  // Click outside handlers for menus
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
            setShowExportMenu(false);
        }
        if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
            setShowProfileMenu(false);
        }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- Derived State ---
  const activeProfile = useMemo(() => {
      if (activeProfileId && profiles[activeProfileId]) {
          return profiles[activeProfileId];
      }
      // Fallback if something is wrong, though useEffect handles init
      return generateNewProfile(); 
  }, [profiles, activeProfileId]);


  // --- Profile Management Actions ---
  const handleCreateProfile = () => {
      const newProfile = generateNewProfile();
      setProfiles(prev => ({ ...prev, [newProfile.id]: newProfile }));
      setActiveProfileId(newProfile.id);
      setShowProfileMenu(false);
  };

  const handleSwitchProfile = (id: string) => {
      setActiveProfileId(id);
      setShowProfileMenu(false);
  };

  const handleDeleteProfile = () => {
      if (!activeProfileId) return;
      
      if(confirm(`Are you sure you want to delete the profile for ${activeProfile.firstName} ${activeProfile.lastName}? This cannot be undone.`)) {
          const newProfiles = { ...profiles };
          delete newProfiles[activeProfileId];
          
          const remainingIds = Object.keys(newProfiles);
          
          if (remainingIds.length === 0) {
              // If we deleted the last one, create a fresh empty one
              const fresh = generateNewProfile();
              setProfiles({ [fresh.id]: fresh });
              setActiveProfileId(fresh.id);
          } else {
              setProfiles(newProfiles);
              setActiveProfileId(remainingIds[0]);
          }
      }
  };

  const handleUpdateProfile = (updates: Partial<PsychologicalProfile>) => {
      if (!activeProfileId) return;
      
      setProfiles(prev => ({
          ...prev,
          [activeProfileId]: {
              ...prev[activeProfileId],
              ...updates,
              lastUpdated: Date.now()
          }
      }));
  }

  // --- Analysis Logic ---
  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleAnalysis = async (files: File[], type: MediaType, description: string) => {
    if (files.length === 0) return;

    setIsAnalyzing(true);
    setError(null);
    try {
      const mediaInputs: MediaInput[] = await Promise.all(files.map(async (file) => {
        const base64 = await convertFileToBase64(file);
        return {
          mimeType: file.type,
          data: base64
        };
      }));

      // Analyze against current active profile
      const result = await analyzeMedia(mediaInputs, activeProfile, description);

      // Update state
      setProfiles(prev => {
        const current = prev[activeProfileId!]; // Non-null assertion safe due to guard
        if (!current) return prev;

        const newHistoryItem = {
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            type: type,
            summary: result.newObservations,
            fileName: files.length > 1 ? `${files.length} files uploaded` : files[0].name
        };

        const newBodyLanguage = result.bodyLanguageAnalysis 
            ? [...current.bodyLanguageNotes, result.bodyLanguageAnalysis] 
            : current.bodyLanguageNotes;
        
        const newToneNotes = result.toneAnalysis 
            ? [...current.toneVoiceNotes, result.toneAnalysis] 
            : current.toneVoiceNotes;

        let newFirstName = current.firstName;
        let newLastName = current.lastName;
        let newDOB = current.dateOfBirth;

        // Intelligent Bio Update: Only override defaults or empty strings, or if AI is confident
        if (result.candidateProfile) {
            if (result.candidateProfile.firstName && (current.firstName === "New" || current.firstName === "Subject" || !current.firstName)) {
                newFirstName = result.candidateProfile.firstName;
            }
            if (result.candidateProfile.lastName && (current.lastName === "Subject" || current.lastName === "001" || !current.lastName)) {
                newLastName = result.candidateProfile.lastName;
            }
            if (result.candidateProfile.dateOfBirth && !current.dateOfBirth) {
                newDOB = result.candidateProfile.dateOfBirth;
            }
        }

        const updatedProfile: PsychologicalProfile = {
          ...current,
          firstName: newFirstName,
          lastName: newLastName,
          dateOfBirth: newDOB,
          lastUpdated: Date.now(),
          bigFive: result.bigFive,
          mbti: result.mbti,
          enneagram: result.enneagram,
          attachmentStyle: result.attachmentStyle,
          summary: result.summary,
          keyTraits: result.keyTraits,
          bodyLanguageNotes: newBodyLanguage,
          toneVoiceNotes: newToneNotes,
          history: [...current.history, newHistoryItem]
        };

        return {
            ...prev,
            [activeProfileId!]: updatedProfile
        };
      });

    } catch (err: any) {
      console.error(err);
      setError("Analysis failed. If uploading large videos, ensure they are under the API size limit or try shorter clips.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // --- Export Logic ---
  const generateTextReport = (p: PsychologicalProfile) => {
    return `
PSYCHOLOGICAL PROFILE REPORT
============================
SUBJECT: ${p.firstName} ${p.lastName}
DOB: ${p.dateOfBirth || "Unknown"}
LAST UPDATED: ${new Date(p.lastUpdated).toLocaleString()}

EXECUTIVE SUMMARY
-----------------
${p.summary}

PERSONALITY ARCHETYPE
---------------------
MBTI: ${p.mbti}
Enneagram: ${p.enneagram}
Attachment Style: ${p.attachmentStyle}

BIG FIVE METRICS (0-100)
------------------------
Openness: ${p.bigFive.openness}
Conscientiousness: ${p.bigFive.conscientiousness}
Extraversion: ${p.bigFive.extraversion}
Agreeableness: ${p.bigFive.agreeableness}
Neuroticism: ${p.bigFive.neuroticism}

KEY OBSERVED TRAITS
-------------------
${p.keyTraits.map(t => `- ${t}`).join('\n')}

DETAILED ANALYSIS
-----------------
[Body Language & Kinesics]
${p.bodyLanguageNotes.length ? p.bodyLanguageNotes.map(n => `- ${n}`).join('\n') : "No specific body language data."}

[Voice & Tone]
${p.toneVoiceNotes.length ? p.toneVoiceNotes.map(n => `- ${n}`).join('\n') : "No specific voice data."}

ANALYSIS HISTORY
----------------
${p.history.slice().reverse().map(h => `[${new Date(h.timestamp).toLocaleDateString()}] ${h.type}: ${h.summary.slice(0, 100)}...`).join('\n')}
    `.trim();
  };

  const generateHTMLReport = (p: PsychologicalProfile) => `
    <!DOCTYPE html>
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
    <meta charset="utf-8">
    <title>Psychological Profile - ${p.firstName} ${p.lastName}</title>
    <style>
      body { font-family: 'Calibri', 'Arial', sans-serif; line-height: 1.5; color: #1a1a1a; max-width: 800px; margin: 0 auto; padding: 20px; }
      h1 { color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px; font-size: 24px; margin-bottom: 20px; }
      h2 { color: #0f172a; background: #f1f5f9; padding: 8px; margin-top: 25px; font-size: 18px; border-left: 4px solid #2563eb; }
      h3 { color: #475569; margin-top: 15px; font-size: 16px; text-transform: uppercase; letter-spacing: 0.05em; }
      .meta { background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 30px; }
      .metric-row { display: flex; justify-content: space-between; margin-bottom: 5px; border-bottom: 1px dotted #cbd5e1; padding-bottom: 2px; }
      .tag { background: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 12px; font-size: 0.9em; margin-right: 5px; display: inline-block; border: 1px solid #bae6fd; }
      ul { margin-top: 5px; padding-left: 20px; }
      li { margin-bottom: 4px; }
      p { text-align: justify; }
    </style>
    </head>
    <body>
      <h1>CONFIDENTIAL PSYCHOLOGICAL PROFILE</h1>
      
      <div class="meta">
        <p><strong>Subject:</strong> ${p.firstName} ${p.lastName}</p>
        <p><strong>Date of Birth:</strong> ${p.dateOfBirth || "Unknown"}</p>
        <p><strong>Report Generated:</strong> ${new Date().toLocaleString()}</p>
      </div>

      <h2>EXECUTIVE SUMMARY</h2>
      <p>${p.summary}</p>

      <h2>PERSONALITY ARCHETYPE</h2>
      <p>
        <strong>MBTI:</strong> ${p.mbti}<br/>
        <strong>Enneagram:</strong> ${p.enneagram}<br/>
        <strong>Attachment Style:</strong> ${p.attachmentStyle}
      </p>

      <h2>BIG FIVE METRICS</h2>
      <div class="metric-row"><span>Openness</span> <strong>${p.bigFive.openness}/100</strong></div>
      <div class="metric-row"><span>Conscientiousness</span> <strong>${p.bigFive.conscientiousness}/100</strong></div>
      <div class="metric-row"><span>Extraversion</span> <strong>${p.bigFive.extraversion}/100</strong></div>
      <div class="metric-row"><span>Agreeableness</span> <strong>${p.bigFive.agreeableness}/100</strong></div>
      <div class="metric-row"><span>Neuroticism</span> <strong>${p.bigFive.neuroticism}/100</strong></div>

      <h2>OBSERVED TRAITS</h2>
      <p>${p.keyTraits.map(t => `<span class="tag">${t}</span>`).join(' ')}</p>

      <h2>DETAILED ANALYSIS</h2>
      
      <h3>Body Language & Kinesics</h3>
      <ul>${p.bodyLanguageNotes.length > 0 ? p.bodyLanguageNotes.map(n => `<li>${n}</li>`).join('') : "<li>No specific body language data analyzed yet.</li>"}</ul>

      <h3>Tone & Voice</h3>
      <ul>${p.toneVoiceNotes.length > 0 ? p.toneVoiceNotes.map(n => `<li>${n}</li>`).join('') : "<li>No specific vocal data analyzed yet.</li>"}</ul>

      <h2>EVIDENCE LOG</h2>
      <ul>
        ${p.history.slice().reverse().map(h => `<li><strong>${new Date(h.timestamp).toLocaleDateString()}:</strong> (${h.type}) ${h.summary}</li>`).join('')}
      </ul>
    </body>
    </html>
  `;

  const handleExport = (format: 'json' | 'txt' | 'doc') => {
    const fileNameBase = `PsychProfile_${activeProfile.firstName.replace(/\s+/g, '')}_${activeProfile.lastName.replace(/\s+/g, '')}_${new Date().toISOString().slice(0,10)}`;
    let content = '';
    let mimeType = '';
    let extension = '';

    if (format === 'json') {
        content = JSON.stringify(activeProfile, null, 2);
        mimeType = 'application/json';
        extension = 'json';
    } else if (format === 'txt') {
        content = generateTextReport(activeProfile);
        mimeType = 'text/plain';
        extension = 'txt';
    } else if (format === 'doc') {
        content = generateHTMLReport(activeProfile);
        mimeType = 'application/msword';
        extension = 'doc';
    }

    const blob = new Blob([content], { type: mimeType });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = `${fileNameBase}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(href);
    setShowExportMenu(false);
  };

  return (
    <div className="min-h-screen bg-obsidian text-slate-200 p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-6 gap-4 z-50 relative">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent flex items-center gap-3">
            <SparklesIcon className="w-8 h-8 text-cyan-400" />
            PsychoAnalyze AI
          </h1>
          <p className="text-slate-500 mt-2">Advanced Multimodal Behavioral Profiling Unit</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
            
            {/* Profile Switcher */}
            <div className="relative" ref={profileMenuRef}>
                 <button 
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                    className="flex items-center gap-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 px-4 py-2 rounded transition-all shadow-sm"
                >
                    <UserGroupIcon className="w-4 h-4 text-accent" />
                    <span className="max-w-[100px] truncate">{activeProfile.firstName} {activeProfile.lastName}</span>
                    <ChevronDownIcon className="w-3 h-3 ml-1 text-slate-500" />
                </button>

                {showProfileMenu && (
                    <div className="absolute right-0 mt-2 w-64 bg-charcoal border border-slate-700 rounded-lg shadow-2xl overflow-hidden z-50">
                        <div className="max-h-60 overflow-y-auto custom-scrollbar">
                            <div className="px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-900/50">Switch Profile</div>
                            {/* Fix: Explicitly cast Object.values(profiles) to PsychologicalProfile[] to avoid 'unknown' type errors */}
                            {(Object.values(profiles) as PsychologicalProfile[]).map(p => (
                                <button 
                                    key={p.id}
                                    onClick={() => handleSwitchProfile(p.id)}
                                    className={`flex items-center justify-between w-full text-left px-4 py-3 text-xs transition-colors border-b border-slate-800 ${
                                        activeProfileId === p.id 
                                        ? 'bg-accent/10 text-accent' 
                                        : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                                    }`}
                                >
                                    <div className="flex items-center gap-2 truncate">
                                        <UserIcon className="w-4 h-4 opacity-70" />
                                        <span className="truncate font-medium">{p.firstName} {p.lastName}</span>
                                    </div>
                                    {activeProfileId === p.id && <CheckIcon className="w-4 h-4" />}
                                </button>
                            ))}
                        </div>
                        <button 
                            onClick={handleCreateProfile}
                            className="flex items-center justify-center gap-2 w-full px-4 py-3 text-xs font-bold text-white bg-accent hover:bg-accent-hover transition-colors"
                        >
                            <PlusCircleIcon className="w-4 h-4" />
                            Create New Profile
                        </button>
                    </div>
                )}
            </div>

            {/* Export Dropdown */}
            <div className="relative" ref={exportMenuRef}>
                <button 
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    className="flex items-center gap-2 text-xs font-semibold text-accent hover:text-white border border-accent/30 hover:bg-accent/20 px-4 py-2 rounded transition-all"
                >
                    <ArrowDownTrayIcon className="w-4 h-4" />
                    Export
                    <ChevronDownIcon className="w-3 h-3 ml-1" />
                </button>
                
                {showExportMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-charcoal border border-slate-700 rounded-lg shadow-xl overflow-hidden z-50">
                        <button 
                            onClick={() => handleExport('json')}
                            className="flex items-center gap-3 w-full text-left px-4 py-3 text-xs text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                        >
                            <CodeBracketIcon className="w-4 h-4 text-emerald-400" />
                            JSON Data (Backup)
                        </button>
                        <button 
                            onClick={() => handleExport('txt')}
                            className="flex items-center gap-3 w-full text-left px-4 py-3 text-xs text-slate-300 hover:bg-slate-700 hover:text-white transition-colors border-t border-slate-700"
                        >
                            <DocumentTextIcon className="w-4 h-4 text-slate-400" />
                            Text Report (.txt)
                        </button>
                        <button 
                            onClick={() => handleExport('doc')}
                            className="flex items-center gap-3 w-full text-left px-4 py-3 text-xs text-slate-300 hover:bg-slate-700 hover:text-white transition-colors border-t border-slate-700"
                        >
                            <DocumentIcon className="w-4 h-4 text-blue-400" />
                            Word Document (.doc)
                        </button>
                    </div>
                )}
            </div>

            <button 
                onClick={handleDeleteProfile}
                className="flex items-center gap-2 text-xs text-slate-500 hover:text-red-400 border border-slate-700 hover:border-red-900 px-4 py-2 rounded transition-colors"
                title="Delete Current Profile"
            >
                <TrashIcon className="w-4 h-4" />
            </button>
        </div>
      </header>

      <main>
        {error && (
          <div className="bg-red-900/20 border border-red-500/50 text-red-200 p-4 rounded-lg mb-6 text-sm flex items-center gap-2">
            <span className="font-bold">Error:</span> {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-4">
                <div className="lg:sticky lg:top-8 space-y-6">
                    <InputConsole onAnalyze={handleAnalysis} isAnalyzing={isAnalyzing} />
                    
                    <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                        <h4 className="text-sm font-semibold text-slate-400 mb-2">Pro Tips for Accuracy</h4>
                        <ul className="text-xs text-slate-500 space-y-2 list-disc list-inside">
                            <li><strong>Context is Key:</strong> Use the description box to clarify who is who in screenshots (e.g., "I am in blue").</li>
                            <li><strong>Batch Uploads:</strong> Select multiple photos at once to give the AI more context.</li>
                            <li><strong>Text Logs:</strong> Use <em>Screen Capture</em> to scroll through long iMessage/WhatsApp threads. The AI reads the video frames.</li>
                            <li><strong>HTML Files:</strong> Upload exported chat logs or social media data dumps (.html) directly.</li>
                        </ul>
                    </div>
                </div>
            </div>

            <div className="lg:col-span-8">
                <AnalysisDashboard profile={activeProfile} onUpdateProfile={handleUpdateProfile} />
            </div>
        </div>
      </main>
    </div>
  );
}

export default App;