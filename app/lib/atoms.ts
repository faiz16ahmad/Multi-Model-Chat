import { atom } from 'jotai';

// Message Interface for conversation history
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  modelId?: string; // Only for assistant messages
}

// Model State Interface - Updated for conversation history
export interface ModelState {
  history: Message[];
  isLoading: boolean;
  error: string | null;
  progress?: string | null;
  retryable?: boolean;
  // Timing information for speed analysis
  requestStartTime?: number;
  firstTokenTime?: number;
  lastTokenTime?: number;
  responseEndTime?: number;
}

// Model Interface
export interface Model {
  id: string;
  name: string;
  fullName: string;
  provider: string;
  contextLength: number;
  description: string;
  strengths: string[];
  pricing: 'free' | 'paid';
  status: 'available' | 'rate-limited' | 'unavailable';
}

// OpenRouter Models Configuration
export const openRouterModels: Model[] = [
  { 
    id: 'x-ai/grok-4-fast:free', 
    name: 'Grok 4 Fast',
    fullName: 'xAI Grok 4 Fast',
    provider: 'xAI',
    contextLength: 128000,
    description: 'Fast and efficient AI model with strong reasoning capabilities',
    strengths: ['Fast responses', 'Reasoning', 'Efficiency'],
    pricing: 'free',
    status: 'available'
  },
  { 
    id: 'deepseek/deepseek-chat-v3.1:free', 
    name: 'DeepSeek v3.1',
    fullName: 'DeepSeek Chat v3.1',
    provider: 'DeepSeek',
    contextLength: 64000,
    description: 'Advanced reasoning model with strong coding and math capabilities',
    strengths: ['Code generation', 'Mathematical reasoning', 'Problem solving'],
    pricing: 'free',
    status: 'available'
  },
  { 
    id: 'mistralai/mistral-small-3.2-24b-instruct:free', 
    name: 'Mistral 3.2',
    fullName: 'Mistral Small 3.2 24B',
    provider: 'Mistral AI',
    contextLength: 128000,
    description: 'Efficient model optimized for instruction following and chat',
    strengths: ['Instruction following', 'Multilingual', 'Efficient'],
    pricing: 'free',
    status: 'available'
  },
  { 
    id: 'nvidia/nemotron-nano-9b-v2:free', 
    name: 'Nemotron Nano 9B',
    fullName: 'NVIDIA Nemotron Nano 9B v2',
    provider: 'NVIDIA',
    contextLength: 4096,
    description: 'Efficient NVIDIA model optimized for speed and performance',
    strengths: ['Speed', 'Efficiency', 'NVIDIA optimized'],
    pricing: 'free',
    status: 'available'
  },
  {
    id: 'meta-llama/llama-3-8b-instruct',
    name: 'Llama 3 8B',
    fullName: 'Llama 3 8B Instruct',
    provider: 'Meta',
    contextLength: 8192,
    description: 'A state-of-the-art model from Meta, known for its strong general reasoning, instruction following, and overall performance',
    strengths: ['General reasoning', 'Instruction following', 'Strong performance'],
    pricing: 'free',
    status: 'available'
  },
  {
    id: 'openai/gpt-oss-20b:free',
    name: 'GPT OSS 20B',
    fullName: 'OpenAI GPT OSS 20B',
    provider: 'OpenAI',
    contextLength: 8192,
    description: 'An open-source version of GPT technology with strong general capabilities and reasoning',
    strengths: ['General reasoning', 'Text generation', 'Versatile tasks'],
    pricing: 'free',
    status: 'available'
  },
  {
    id: 'z-ai/glm-4.5-air:free',
    name: 'GLM 4.5 Air',
    fullName: 'GLM 4.5 Air',
    provider: 'Zhipu AI',
    contextLength: 32768,
    description: 'A lightweight and efficient language model with strong performance across various tasks',
    strengths: ['Efficiency', 'Multilingual', 'Fast inference'],
    pricing: 'free',
    status: 'available'
  },
  {
    id: 'cognitivecomputations/dolphin-mistral-24b-venice-edition:free',
    name: 'Dolphin Mistral 24B',
    fullName: 'Dolphin Mistral 24B Venice Edition',
    provider: 'Cognitive',
    contextLength: 32768,
    description: 'Advanced model with enhanced capabilities for complex reasoning and analysis',
    strengths: ['Advanced reasoning', 'Complex analysis', 'High performance'],
    pricing: 'free',
    status: 'available'
  },
] as const;

export type ModelId = (typeof openRouterModels)[number]['id'];

// Evaluator Agent ID - Special identifier for the AI evaluation agent
export const EVALUATOR_AGENT_ID = 'evaluator/gemini-2.5-flash' as const;

// Extended ModelId type to include the evaluator
export type ExtendedModelId = ModelId | typeof EVALUATOR_AGENT_ID;

// Single state atom using Map for efficient updates - now supports evaluator
export const modelsStateAtom = atom<Map<ExtendedModelId, ModelState>>(new Map());

// Helper function to get model state - now supports evaluator
export const getModelState = (modelId: ExtendedModelId, state: Map<ExtendedModelId, ModelState>): ModelState => {
  return state.get(modelId) || { history: [], isLoading: false, error: null, progress: null, retryable: false };
};

// Helper to add message to history
export const addMessageToHistory = (
  history: Message[], 
  content: string, 
  role: 'user' | 'assistant', 
  modelId?: string
): Message[] => {
  const message: Message = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    role,
    content,
    timestamp: Date.now(),
    modelId
  };
  return [...history, message];
};

// Helper to get conversation context for API
export const getConversationContext = (history: Message[]): { role: string; content: string }[] => {
  return history.map(msg => ({
    role: msg.role,
    content: msg.content
  }));
};
