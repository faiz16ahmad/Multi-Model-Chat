# 🤖 Multi-Model AI Chat

A beautiful, modern multi-model AI chat application built with Next.js 15, TypeScript, and Tailwind CSS. Compare responses from multiple AI models in real-time with a professional interface inspired by platforms like Poe.com and Claude.

## ✨ Features

- **🎨 Modern UI**: Clean, minimalist design with dark mode and professional styling
- **📱 Responsive**: Works seamlessly on desktop, tablet, and mobile devices
- **🔄 Real-time Streaming**: See AI responses appear token by token in real-time
- **📊 Multi-Model Comparison**: Compare responses from multiple AI models side-by-side
- **⚡ Rate Limiting**: Intelligent staggered requests to prevent API rate limits
- **🎯 Model Selection**: Easy-to-use sidebar with collapsible model selection
- **📋 Copy to Clipboard**: One-click copying of AI responses
- **🔍 Error Handling**: Clear error messages and graceful failure handling

## 🚀 Tech Stack

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS
- **State Management**: Jotai for lightweight, atomic state management
- **Styling**: Tailwind CSS with custom design system
- **AI Provider**: OpenRouter API with multiple free models
- **Real-time**: Server-Sent Events (SSE) for streaming responses

## 🎯 Supported Models

The application supports these OpenRouter models:

- **Google Gemini 2.5 Flash** - Fast, efficient responses
- **DeepSeek Chat v3.1** - Advanced reasoning capabilities  
- **OpenAI GPT-OSS 20B** - Open-source GPT alternative
- **Mistral Small 3.2** - High-quality instruction following
- **Google Gemma 3N E2B** - Efficient text generation

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd fiesta-ai-chat
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file in the root directory:
   ```env
   OPENROUTER_API_KEY=your_openrouter_api_key_here
   ```

4. **Get your OpenRouter API key**
   - Visit [OpenRouter](https://openrouter.ai/)
   - Sign up for a free account
   - Copy your API key from the dashboard

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:3000`

## 🎨 UI Features

### Desktop Experience
- **Collapsible Sidebar**: Toggle model selection panel
- **Grid Layout**: Responsive grid showing multiple model responses
- **Fixed Input**: Always-accessible prompt input at the bottom
- **Professional Styling**: Dark theme with subtle animations

### Mobile Experience  
- **Tab Navigation**: Switch between model responses with tabs
- **Touch-Friendly**: Optimized for mobile interaction
- **Responsive Design**: Adapts to any screen size

### Interactive Elements
- **Model Selection**: Checkbox-based model selection with visual feedback
- **Loading States**: Skeleton loaders and progress indicators
- **Copy Buttons**: Hover-to-reveal copy functionality
- **Error Handling**: Clear error messages with helpful context

## 🔧 Configuration

### Adding New Models
To add new models, update the `openRouterModels` array in `app/lib/atoms.ts`:

```typescript
export const openRouterModels = [
  {
    id: 'new-model-id',
    name: 'New Model Name',
    // ... other properties
  },
  // ... existing models
];
```

### Customizing Styling
The application uses Tailwind CSS with a custom design system. Key color variables:

- **Background**: `bg-slate-900` (main background)
- **Surface**: `bg-slate-800` (cards, sidebar)
- **Borders**: `border-slate-700` (dividers)
- **Text**: `text-slate-200` (primary), `text-slate-400` (secondary)
- **Accent**: `bg-indigo-600` (buttons, highlights)

## 🚀 Deployment

### Vercel (Recommended)
1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add your `OPENROUTER_API_KEY` environment variable
4. Deploy!

### Other Platforms
The application can be deployed to any platform that supports Next.js:
- Netlify
- Railway
- DigitalOcean App Platform
- AWS Amplify

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **OpenRouter** for providing access to multiple AI models
- **Next.js** team for the amazing framework
- **Tailwind CSS** for the utility-first CSS framework
- **Jotai** for lightweight state management

---

**Built with ❤️ using Next.js, TypeScript, and Tailwind CSS**
