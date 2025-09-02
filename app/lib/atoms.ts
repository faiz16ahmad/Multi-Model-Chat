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
    id: 'google/gemini-2.5-flash-image-preview:free', 
    name: 'Gemini 2.5',
    fullName: 'Google Gemini 2.5 Flash',
    provider: 'Google',
    contextLength: 1000000,
    description: 'Fast, multimodal AI model with image understanding capabilities',
    strengths: ['Image analysis', 'Fast responses', 'Large context'],
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
    id: 'google/gemma-3n-e2b-it:free', 
    name: 'Gemma 3N',
    fullName: 'Google Gemma 3N E2B',
    provider: 'Google',
    contextLength: 8192,
    description: 'Lightweight model with good performance for general tasks',
    strengths: ['General purpose', 'Fast inference', 'Lightweight'],
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
    id: 'qwen/qwen3-coder:free',
    name: 'Qwen 3 Coder',
    fullName: 'Qwen 3 Coder',
    provider: 'Alibaba',
    contextLength: 32768,
    description: 'A specialized coding model with excellent programming capabilities and code generation',
    strengths: ['Code generation', 'Programming help', 'Technical documentation'],
    pricing: 'free',
    status: 'available'
  },
  {
    id: 'moonshotai/kimi-k2:free',
    name: 'Kimi K2',
    fullName: 'Moonshot AI Kimi K2',
    provider: 'Moonshot AI',
    contextLength: 128000,
    description: 'Advanced conversational AI model with strong reasoning and large context capabilities',
    strengths: ['Large context window', 'Conversational AI', 'Reasoning tasks'],
    pricing: 'free',
    status: 'available'
  },
] as const;

export type ModelId = (typeof openRouterModels)[number]['id'];

// Single state atom using Map for efficient updates
export const modelsStateAtom = atom<Map<ModelId, ModelState>>(new Map());

// Helper function to get model state
export const getModelState = (modelId: ModelId, state: Map<ModelId, ModelState>): ModelState => {
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
