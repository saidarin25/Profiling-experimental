import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResponse, PsychologicalProfile } from "../types";

// Initialize the client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    candidateProfile: {
      type: Type.OBJECT,
      properties: {
        firstName: { type: Type.STRING, description: "First name if clearly identified in evidence." },
        lastName: { type: Type.STRING, description: "Last name if clearly identified in evidence." },
        dateOfBirth: { type: Type.STRING, description: "Date of birth if found (YYYY-MM-DD or text)." },
      }
    },
    bigFive: {
      type: Type.OBJECT,
      properties: {
        openness: { type: Type.NUMBER, description: "0-100 score. Openness to experience." },
        conscientiousness: { type: Type.NUMBER, description: "0-100 score. Self-discipline and goal-directed behavior." },
        extraversion: { type: Type.NUMBER, description: "0-100 score. Energy creation from external means." },
        agreeableness: { type: Type.NUMBER, description: "0-100 score. General concern for social harmony." },
        neuroticism: { type: Type.NUMBER, description: "0-100 score. Tendency to experience negative emotions." },
      },
      required: ["openness", "conscientiousness", "extraversion", "agreeableness", "neuroticism"],
    },
    mbti: { type: Type.STRING, description: "Myers-Briggs Type Indicator (e.g., INTJ, ENFP). Provide the most likely type." },
    enneagram: { type: Type.STRING, description: "Enneagram Type and Wing (e.g., 4w5, 8w7)." },
    attachmentStyle: { type: Type.STRING, description: "Detailed attachment style (e.g., Anxious-Preoccupied, Dismissive-Avoidant, Secure)." },
    summary: { type: Type.STRING, description: "An extremely detailed, evolving psychological profile of the person. This must merge previous knowledge with new insights. Discuss core motivations, fears, defense mechanisms, and cognitive patterns." },
    keyTraits: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of distinct personality traits observed." },
    newObservations: { type: Type.STRING, description: "Specific insights derived ONLY from this latest batch of evidence. What did this specific upload reveal?" },
    bodyLanguageAnalysis: { type: Type.STRING, description: "If video/image, provide deep analysis of posture, micro-expressions, eye contact, and hand gestures. If text-only, leave empty." },
    toneAnalysis: { type: Type.STRING, description: "If audio/video, analyze pitch, prosody, cadence, hesitation markers, and emotional leakage in voice. If text-only, leave empty." },
  },
  required: ["bigFive", "mbti", "enneagram", "attachmentStyle", "summary", "keyTraits", "newObservations"],
};

export interface MediaInput {
  mimeType: string;
  data: string;
}

export const analyzeMedia = async (
  inputs: MediaInput[],
  currentProfile: PsychologicalProfile | null,
  userDescription: string = ""
): Promise<AnalysisResponse> => {
  
  const modelId = "gemini-2.5-flash"; 

  const systemInstruction = `
    You are an expert Forensic Psychologist and Behavioral Analyst. 
    Your objective is to build and continuously refine an extremely detailed psychological profile of a subject based on multimodal inputs.
    
    You will receive:
    1. The SUBJECT'S CURRENT PROFILE (if it exists).
    2. NEW EVIDENCE (Images, PDFs, Audio, Video, HTML, Texts).
    3. USER CONTEXT describing the files.
    
    YOUR TASK:
    1. **Analyze the New Evidence:**
       - **Context:** Use the provided USER CONTEXT to identify speakers (e.g. "Blue bubbles are the subject") or understand the situation.
       - **Bio Data:** Scan documents/chats for First Name, Last Name, and Date of Birth.
       - **Images (Multiple):** Look for environmental clues (messy/organized room), fashion choices (status signaling vs. comfort), facial micro-expressions.
       - **Videos/Screen Recordings:** If the video is a screen capture of text scrolling, READ THE TEXT deeply. Analyze the conversation flow, response times, and emojis. If it is a video of the person, analyze body language (kinesics) and tone (paralinguistics).
       - **Audio:** Listen for vocal fry, upspeak, tremors, or rapid speech indicating anxiety or mania.
       - **Documents (PDF/HTML/Text):** Analyze syntax, vocabulary complexity, and sentiment.
    
    2. **Update the Profile (Incremental Integration):**
       - Do NOT discard old information unless the new evidence strongly contradicts it.
       - Refine the Big Five scores based on the aggregate data.
       - Refine the MBTI and Enneagram types as more data becomes available.
       - **Attachment Style:** Look for signs of "push-pull" dynamics, hypersensitivity to rejection (Anxious), or excessive independence (Avoidant).
    
    3. **Output:**
       - Provide a deep, professional psychological report in JSON format.
       - The "summary" field should read like a clinical report or a character study.
  `;

  const contextPrompt = currentProfile 
    ? `
    === CURRENT ESTABLISHED PROFILE ===
    NAME: ${currentProfile.firstName} ${currentProfile.lastName}
    DOB: ${currentProfile.dateOfBirth}
    SUMMARY: ${JSON.stringify(currentProfile.summary)}
    EXISTING BIG FIVE SCORES: ${JSON.stringify(currentProfile.bigFive)}
    MBTI HYPOTHESIS: ${currentProfile.mbti}
    ENNEAGRAM HYPOTHESIS: ${currentProfile.enneagram}
    ATTACHMENT STYLE: ${currentProfile.attachmentStyle}
    KEY TRAITS: ${JSON.stringify(currentProfile.keyTraits)}
    `
    : "=== STATUS: NEW SUBJECT ===\nNo prior data. Establish a baseline profile from the provided evidence.";

  try {
    // Construct the parts array for Gemini
    const parts: any[] = [
        { text: contextPrompt },
        { text: `=== USER CONTEXT DESCRIPTION ===\n${userDescription ? userDescription : "No specific context provided."}` },
        { text: "=== INSTRUCTIONS ===\nAnalyze the following new evidence (files) and generate an UPDATED profile JSON. Integrate these findings with the current profile context. If you find bio data (Name, DOB) in the new evidence, return it in candidateProfile." }
    ];

    // Add all media inputs
    inputs.forEach(input => {
        parts.push({
            inlineData: {
                mimeType: input.mimeType,
                data: input.data
            }
        });
    });

    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: parts
      },
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
      },
    });

    if (!response.text) {
      throw new Error("No response from AI");
    }

    return JSON.parse(response.text) as AnalysisResponse;

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};