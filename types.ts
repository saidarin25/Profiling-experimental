export enum MediaType {
  IMAGE = 'IMAGE',
  PDF = 'PDF',
  AUDIO = 'AUDIO',
  VIDEO = 'VIDEO',
  TEXT_FILE = 'TEXT_FILE',
  HTML = 'HTML'
}

export interface AnalysisHistoryItem {
  id: string;
  timestamp: number;
  type: MediaType;
  summary: string;
  fileName?: string;
}

export interface BigFiveScores {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
}

export interface PsychologicalProfile {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  lastUpdated: number;
  bigFive: BigFiveScores;
  mbti: string;
  enneagram: string;
  attachmentStyle: string;
  summary: string;
  keyTraits: string[];
  bodyLanguageNotes: string[];
  toneVoiceNotes: string[];
  history: AnalysisHistoryItem[];
}

export interface AnalysisResponse {
  candidateProfile?: {
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
  };
  bigFive: BigFiveScores;
  mbti: string;
  enneagram: string;
  attachmentStyle: string;
  summary: string; // A synthesized summary of the PERSON, not just the file
  keyTraits: string[];
  newObservations: string; // Specific to the latest file
  bodyLanguageAnalysis?: string;
  toneAnalysis?: string;
}