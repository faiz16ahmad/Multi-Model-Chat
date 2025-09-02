# Design Document

## Overview

This design document outlines the architecture for a multi-model AI chat comparison platform inspired by Fiesta AI. The application allows users to send a single prompt to multiple AI models simultaneously and view their responses in real-time side-by-side comparison.

## Architecture

### Technology Stack
- **Frontend Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS with custom dark theme
- **State Management**: Jotai with atomic state management
- **API Integration**: OpenRouter API via serverless proxy
- **Streaming**: Server-Sent Events (SSE) for real-time responses
- **TypeScript**: Full type safety throughout the application

### High-Level Architecture
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │  Next.js API     │    │   OpenRouter    │
│   (React/Jotai)│◄──►│   Proxy          │◄──►│   API           │
│                 │    │  (SSE Streaming) │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Components and Interfaces

### Core Components

#### 1. ChatApp (Main Container)
- **Purpose**: Root component managing overall layout and state coordination
- **Layout Structure**: 
  ```
  ┌─────────────────────────────────────────┐
  │ ChatApp (h-screen flex)                 │
  │ ┌─────────┐ ┌─────────────────────────┐ │
  │ │Sidebar  │ │ Main Content (flex-1)   │ │
  │ │         │ │ ┌─────────────────────┐ │ │
  │ │         │ │ │ Header              │ │ │
  │ │         │ │ ├─────────────────────┤ │ │
  │ │         │ │ │ MultiResponseDisplay│ │ │
  │ │         │ │ │ (flex-1)            │ │ │
  │ │         │ │ ├─────────────────────┤ │ │
  │ │         │ │ │ PromptInput         │ │ │
  │ │         │ │ └─────────────────────┘ │ │
  │ └─────────┘ └─────────────────────────┘ │
  └─────────────────────────────────────────┘
  ```

#### 2. Sidebar
- **Purpose**: Model selection and navigation
- **Features**: 
  - Collapsible design (64px collapsed, 256px expanded)
  - Model selection with custom checkboxes
  - New chat functionality
  - Responsive behavior

#### 3. MultiResponseDisplay
- **Purpose**: Display responses from multiple models
- **Responsive Design**:
  - Desktop: Multi-column grid layout
  - Mobile: Tabbed interface
- **Features**: Real-time streaming updates, independent scrolling

#### 4. PromptInput
- **Purpose**: User input interface
- **Features**: Auto-resizing textarea, submit handling, disabled state

#### 5. ResponseColumn
- **Purpose**: Individual model response display
- **Features**: Copy functionality, loading states, error handling

### State Management Architecture

#### Jotai Atoms Structure
```typescript
// Central state atom - scalable Map-based approach
const modelsStateAtom = atom<Map<ModelId, ModelState>>(new Map());

// Model configuration
const openRouterModels: Model[] = [
  // Configured models with id, name, and API details
];

// State interfaces
interface ModelState {
  response: string;
  isLoading: boolean;
  error: string | null;
}
```

#### State Flow
1. **Initialization**: Empty Map for all models
2. **Selection**: Local state in ChatApp for selected models
3. **Submission**: Set loading state for selected models
4. **Streaming**: Update individual model states via SSE events
5. **Completion**: Clear loading states, maintain responses

## Data Models

### Core Interfaces

```typescript
interface Model {
  id: ModelId;
  name: string;
  provider: string;
  contextLength?: number;
}

interface ModelState {
  response: string;
  isLoading: boolean;
  error: string | null;
}

interface ChatRequest {
  prompt: string;
  models: ModelId[];
}

interface StreamEvent {
  event: string; // modelId_chunk | modelId_error | modelId_end
  data: string; // JSON stringified payload
}
```

### API Response Format

#### SSE Event Types
- **`{modelId}_chunk`**: Streaming response tokens
- **`{modelId}_error`**: Error messages
- **`{modelId}_end`**: Stream completion signal

#### Event Data Payloads
```typescript
// Chunk event
{ token: string }

// Error event  
{ message: string }

// End event
{ } // Empty payload
```

## Error Handling

### Frontend Error Handling
1. **Network Errors**: Connection failures, timeout handling
2. **API Errors**: HTTP status errors, malformed responses
3. **Streaming Errors**: SSE connection drops, parsing failures
4. **State Errors**: Invalid model states, concurrent updates

### Error Recovery Strategies
- **Graceful Degradation**: Continue with successful models if some fail
- **User Feedback**: Clear error messages per model
- **Retry Logic**: Automatic reconnection for network issues
- **Fallback States**: Default error states for UI consistency

## Testing Strategy

### Unit Testing
- **Component Testing**: React Testing Library for UI components
- **State Testing**: Jotai atom behavior and updates
- **Utility Testing**: Helper functions and data transformations

### Integration Testing
- **API Integration**: Mock OpenRouter responses
- **SSE Testing**: Simulated streaming scenarios
- **State Flow Testing**: End-to-end state management

### E2E Testing
- **User Workflows**: Complete prompt-to-response flows
- **Multi-Model Scenarios**: Concurrent model testing
- **Responsive Testing**: Mobile and desktop layouts

## Current Implementation Status

### Completed Features ✅
- ✅ Core component architecture
- ✅ Jotai state management with Map atom
- ✅ SSE streaming implementation
- ✅ Responsive design (desktop grid, mobile tabs)
- ✅ Model selection and management
- ✅ Real-time response streaming
- ✅ Error handling per model
- ✅ Copy functionality
- ✅ Serverless API proxy with staggered requests

### Critical Issue to Fix 🚨

#### Layout Bug: Sidebar and Main Content Stacking Vertically

**Problem**: Despite correct Flexbox implementation in ChatApp.tsx, the sidebar and main content are stacking vertically instead of side-by-side.

**Root Cause**: Missing height constraints on parent elements (html/body) causing the `h-screen` class to not work properly.

**Solution**: Add proper height styling to global CSS:

```css
html,
body {
  height: 100%;
  max-width: 100vw;
  overflow-x: hidden;
}

#__next {
  height: 100%;
}
```

**Current Layout Structure** (Working):
```jsx
<div className="h-screen bg-slate-900 flex overflow-hidden">
  <Sidebar /> {/* Fixed width: w-16 or w-64 */}
  <div className="flex-1 flex flex-col min-w-0"> {/* Takes remaining space */}
    <header /> {/* Fixed height */}
    <MultiResponseDisplay /> {/* flex-1 - takes remaining space */}
    <PromptInput /> {/* Fixed height */}
  </div>
</div>
```

### Performance Optimizations
- **Streaming Efficiency**: Chunked response processing
- **State Updates**: Minimal re-renders with Jotai
- **Memory Management**: Proper cleanup of SSE connections
- **Bundle Optimization**: Code splitting and lazy loading

## Security Considerations

### API Security
- **Key Management**: Server-side API key storage
- **Rate Limiting**: Staggered requests to prevent abuse
- **Input Validation**: Prompt sanitization and length limits
- **CORS Configuration**: Proper origin restrictions

### Client Security
- **XSS Prevention**: Proper content sanitization
- **State Protection**: Secure state management
- **Error Information**: Limited error exposure to users