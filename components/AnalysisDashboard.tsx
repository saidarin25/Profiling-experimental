import React from 'react';
import { PsychologicalProfile } from '../types';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer 
} from 'recharts';
import { UserCircleIcon, FingerPrintIcon, ChatBubbleLeftRightIcon, CalendarIcon } from '@heroicons/react/24/solid';
import { PencilSquareIcon } from '@heroicons/react/24/outline';

interface Props {
  profile: PsychologicalProfile;
  onUpdateProfile: (updates: Partial<PsychologicalProfile>) => void;
}

export const AnalysisDashboard: React.FC<Props> = ({ profile, onUpdateProfile }) => {
  const chartData = [
    { subject: 'Openness', A: profile.bigFive.openness, fullMark: 100 },
    { subject: 'Conscientiousness', A: profile.bigFive.conscientiousness, fullMark: 100 },
    { subject: 'Extraversion', A: profile.bigFive.extraversion, fullMark: 100 },
    { subject: 'Agreeableness', A: profile.bigFive.agreeableness, fullMark: 100 },
    { subject: 'Neuroticism', A: profile.bigFive.neuroticism, fullMark: 100 },
  ];

  return (
    <div className="space-y-6">
      {/* Header Summary with Editable Fields */}
      <div className="bg-charcoal p-6 rounded-xl border border-slate-700 shadow-lg">
        <div className="flex flex-col md:flex-row items-start justify-between mb-6 gap-4">
            <div className="w-full">
                <div className="flex items-start gap-4 mb-2">
                     <UserCircleIcon className="w-12 h-12 text-accent flex-shrink-0" />
                     <div className="flex-grow">
                         <label className="text-xs text-slate-500 font-semibold uppercase">Full Name</label>
                         <div className="flex items-center gap-2 group">
                            <input 
                                type="text" 
                                value={profile.firstName}
                                onChange={(e) => onUpdateProfile({ firstName: e.target.value })}
                                placeholder="First Name"
                                className="bg-transparent text-2xl md:text-3xl font-bold text-white placeholder-slate-600 focus:outline-none focus:border-b border-accent w-full md:w-auto"
                            />
                            <input 
                                type="text" 
                                value={profile.lastName}
                                onChange={(e) => onUpdateProfile({ lastName: e.target.value })}
                                placeholder="Last Name"
                                className="bg-transparent text-2xl md:text-3xl font-bold text-white placeholder-slate-600 focus:outline-none focus:border-b border-accent w-full md:w-auto"
                            />
                            <PencilSquareIcon className="w-4 h-4 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                         </div>
                         
                         <div className="flex items-center gap-2 mt-1 group">
                             <CalendarIcon className="w-4 h-4 text-slate-400" />
                             <input 
                                type="text" 
                                value={profile.dateOfBirth}
                                onChange={(e) => onUpdateProfile({ dateOfBirth: e.target.value })}
                                placeholder="Date of Birth (Unknown)"
                                className="bg-transparent text-sm text-slate-400 placeholder-slate-600 focus:outline-none focus:border-b border-accent"
                             />
                             <PencilSquareIcon className="w-3 h-3 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                         </div>
                     </div>
                </div>
                <p className="text-slate-500 text-xs mt-1">Last Updated: {new Date(profile.lastUpdated).toLocaleString()}</p>
            </div>
            
            <div className="flex flex-wrap gap-2 justify-end w-full md:w-auto">
                <span className="px-3 py-1 rounded-full bg-indigo-900/50 border border-indigo-500 text-indigo-200 text-xs font-bold whitespace-nowrap">
                    MBTI: {profile.mbti}
                </span>
                <span className="px-3 py-1 rounded-full bg-purple-900/50 border border-purple-500 text-purple-200 text-xs font-bold whitespace-nowrap">
                    Enneagram: {profile.enneagram}
                </span>
                <span className="px-3 py-1 rounded-full bg-emerald-900/50 border border-emerald-500 text-emerald-200 text-xs font-bold whitespace-nowrap">
                    Attachment: {profile.attachmentStyle}
                </span>
            </div>
        </div>
        <div className="border-t border-slate-700 pt-4">
            <h4 className="text-sm font-semibold text-slate-400 mb-2">Executive Summary</h4>
            <p className="text-slate-300 leading-relaxed text-sm md:text-base whitespace-pre-wrap">
                {profile.summary}
            </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Big Five Chart */}
        <div className="bg-charcoal p-4 rounded-xl border border-slate-700 shadow-lg flex flex-col items-center justify-center min-h-[300px]">
            <h3 className="text-lg font-semibold text-slate-200 mb-2 flex items-center gap-2">
                <FingerPrintIcon className="w-5 h-5 text-accent" /> Big Five Model
            </h3>
            <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
                        <PolarGrid stroke="#334155" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar
                            name="Subject"
                            dataKey="A"
                            stroke="#06b6d4"
                            strokeWidth={2}
                            fill="#06b6d4"
                            fillOpacity={0.3}
                        />
                    </RadarChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* Key Traits & Analysis */}
        <div className="md:col-span-2 space-y-6">
             {/* Key Traits */}
            <div className="bg-charcoal p-6 rounded-xl border border-slate-700 shadow-lg">
                <h3 className="text-lg font-semibold text-slate-200 mb-4">Dominant Traits</h3>
                <div className="flex flex-wrap gap-2">
                    {profile.keyTraits.map((trait, i) => (
                        <span key={i} className="px-3 py-1 bg-slate-800 text-slate-300 rounded-md border border-slate-600 text-sm">
                            {trait}
                        </span>
                    ))}
                </div>
            </div>

             {/* Deep Dives */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(profile.bodyLanguageNotes.length > 0) && (
                    <div className="bg-charcoal p-5 rounded-xl border border-slate-700 shadow-lg">
                        <h4 className="text-emerald-400 font-semibold mb-2 text-sm uppercase tracking-wider">Body Language Signals</h4>
                        <ul className="list-disc list-inside text-slate-300 text-sm space-y-1 max-h-40 overflow-y-auto pr-2 scrollbar-thin">
                            {profile.bodyLanguageNotes.slice().reverse().slice(0, 6).map((note, i) => (
                                <li key={i}>{note}</li>
                            ))}
                        </ul>
                    </div>
                )}
                 {(profile.toneVoiceNotes.length > 0) && (
                    <div className="bg-charcoal p-5 rounded-xl border border-slate-700 shadow-lg">
                        <h4 className="text-orange-400 font-semibold mb-2 text-sm uppercase tracking-wider">Tone & Vocal Analysis</h4>
                        <ul className="list-disc list-inside text-slate-300 text-sm space-y-1 max-h-40 overflow-y-auto pr-2 scrollbar-thin">
                            {profile.toneVoiceNotes.slice().reverse().slice(0, 6).map((note, i) => (
                                <li key={i}>{note}</li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* History Log */}
      <div className="bg-charcoal p-6 rounded-xl border border-slate-700 shadow-lg mt-6">
        <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <ChatBubbleLeftRightIcon className="w-5 h-5 text-accent" /> Analysis Log
        </h3>
        <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
            {profile.history.slice().reverse().map((item) => (
                <div key={item.id} className="border-l-2 border-slate-600 pl-4 pb-1">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-mono text-slate-500 uppercase">{item.type}</span>
                        <span className="text-xs text-slate-600">{new Date(item.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-sm text-slate-300">{item.summary}</p>
                    {item.fileName && <p className="text-[10px] text-slate-600 mt-1 italic">{item.fileName}</p>}
                </div>
            ))}
            {profile.history.length === 0 && (
                <p className="text-slate-500 text-center italic py-4">No inputs analyzed yet.</p>
            )}
        </div>
      </div>
    </div>
  );
};