import { NextRequest } from 'next/server';

interface ChatRequest {
  prompt?: string; // For backward compatibility
  messages?: { role: string; content: string }[]; // New conversation history format
  models: string[];
}

// Rate limiting helper
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Enhanced error types for better error handling
interface APIError extends Error {
  status?: number;
  retryable?: boolean;
}

// A single, reusable function for all OpenRouter calls with enhanced error handling and retry logic
async function callOpenRouter(messages: { role: string; content: string }[], modelName: string, delayMs: number = 0, retryCount: number = 0): Promise<ReadableStream<Uint8Array> | null> {
  const maxRetries = 3; // Increased retry attempts
  
  // Add delay to prevent rate limiting
  if (delayMs > 0) {
    await delay(delayMs);
  }

  try {
    // Check for API key before making request
    if (!process.env.OPENROUTER_API_KEY) {
      const error = new Error('API key is not configured. Please check your environment variables.') as APIError;
      error.retryable = false;
      throw error;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
        "X-Title": "Multi-Model Chat Comparison"
      },
      body: JSON.stringify({
        "model": modelName,
        "messages": messages,
        "stream": true,
        "max_tokens": 4000, // Reasonable limit
        "temperature": 0.7
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      
      // Handle rate limiting with exponential backoff retry
      if (response.status === 429 && retryCount < maxRetries) {
        const retryDelay = Math.pow(2, retryCount) * 2000 + Math.random() * 1000; // Add jitter
        console.log(`Rate limit hit for ${modelName}, retrying in ${Math.round(retryDelay)}ms (attempt ${retryCount + 1}/${maxRetries + 1})`);
        await delay(retryDelay);
        return callOpenRouter(messages, modelName, 0, retryCount + 1);
      }
      
      // Create detailed error messages based on status codes
      const error = new Error() as APIError;
      error.status = response.status;
      
      switch (response.status) {
        case 400:
          error.message = `Invalid request for ${modelName}. The prompt may be too long or contain unsupported content.`;
          error.retryable = false;
          break;
        case 401:
          error.message = `Authentication failed. Please check your API key configuration.`;
          error.retryable = false;
          break;
        case 403:
          error.message = `Access denied for ${modelName}. This model may not be available or you may not have permission.`;
          error.retryable = false;
          break;
        case 404:
          error.message = `Model ${modelName} not found. This model may have been removed or renamed.`;
          error.retryable = false;
          break;
        case 429:
          error.message = `Rate limit exceeded for ${modelName}. OpenRouter allows 20 requests/min for free models. Please try again in a few minutes.`;
          error.retryable = true;
          console.error(`🚫 Rate limit hit for ${modelName}. Retry count: ${retryCount}/${maxRetries}`);
          break;
        case 500:
        case 502:
        case 503:
        case 504:
          error.message = `Server error for ${modelName}. The service may be temporarily unavailable.`;
          error.retryable = true;
          break;
        default:
          error.message = `Request failed for ${modelName} (${response.status}): ${errorText}`;
          error.retryable = response.status >= 500;
      }
      
      throw error;
    }

    return response.body;
  } catch (error) {
    // Handle different types of errors
    if (error instanceof Error) {
      const apiError = error as APIError;
      
      // Handle timeout errors
      if (error.name === 'AbortError') {
        apiError.message = `Request timeout for ${modelName}. The model is taking too long to respond.`;
        apiError.retryable = true;
      }
      
      // Handle network errors with retry
      if (retryCount < maxRetries && (
        error instanceof TypeError || 
        error.message.includes('fetch') ||
        error.message.includes('network') ||
        error.message.includes('timeout') ||
        apiError.retryable
      )) {
        const retryDelay = Math.pow(2, retryCount) * 1000 + Math.random() * 500; // 1s, 2s, 4s with jitter
        console.log(`Network/retryable error for ${modelName}, retrying in ${Math.round(retryDelay)}ms (attempt ${retryCount + 1}/${maxRetries + 1}): ${error.message}`);
        await delay(retryDelay);
        return callOpenRouter(messages, modelName, 0, retryCount + 1);
      }
      
      // If not retryable or max retries reached, enhance the error message
      if (!apiError.message.includes(modelName)) {
        apiError.message = `${modelName}: ${apiError.message}`;
      }
    }
    
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { prompt, messages, models }: ChatRequest = await request.json();

    // Support both legacy prompt format and new messages format
    let conversationMessages: { role: string; content: string }[];
    
    if (messages && Array.isArray(messages)) {
      conversationMessages = messages;
    } else if (prompt) {
      // Backward compatibility: convert single prompt to messages format
      conversationMessages = [{ role: "user", content: prompt }];
    } else {
      return new Response('Invalid request body: must include either prompt or messages', { status: 400 });
    }

    if (!models || !Array.isArray(models)) {
      return new Response('Invalid request body: models array is required', { status: 400 });
    }

    // Create a ReadableStream for SSE
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        let connectionActive = true;
        let lastActivity = Date.now();

        // Function to send SSE message with error handling
        const sendSSEMessage = (event: string, data: string) => {
          try {
            if (!connectionActive) return;
            const message = `event: ${event}\ndata: ${data}\n\n`;
            console.log('Sending SSE:', event, data);
            controller.enqueue(encoder.encode(message));
          } catch (error) {
            console.error('Error sending SSE message:', error);
            connectionActive = false;
          }
        };

        // Send initial heartbeat
        sendSSEMessage('heartbeat', JSON.stringify({ 
          timestamp: Date.now(),
          models: models.length 
        }));

        // Setup heartbeat interval with connection monitoring
        const heartbeatInterval = setInterval(() => {
          if (!connectionActive) {
            clearInterval(heartbeatInterval);
            return;
          }
          
          // Check for stale connections
          const timeSinceActivity = Date.now() - lastActivity;
          if (timeSinceActivity > 120000) { // 2 minutes
            console.warn('Connection appears stale, closing');
            connectionActive = false;
            cleanup();
            return;
          }
          
          sendSSEMessage('heartbeat', JSON.stringify({ 
            timestamp: Date.now(),
            active: true,
            timeSinceActivity 
          }));
        }, 10000); // Every 10 seconds

        // Enhanced cleanup function
        const cleanup = () => {
          connectionActive = false;
          if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
          }
        };

        // Function to make API call to OpenRouter with enhanced error handling
        const makeAIRequest = async (modelName: string, index: number): Promise<void> => {
          try {
            // Send initial progress indicator
            sendSSEMessage(`${modelName}_progress`, JSON.stringify({ 
              status: 'connecting',
              message: 'Connecting to model...'
            }));

            // Stagger requests by 2 seconds - individual tests show all models work
            const delayMs = index * 2000;
            const responseBody = await callOpenRouter(conversationMessages, modelName, delayMs);
            
            if (!responseBody) {
              throw new Error('No response stream received from the model');
            }

            // Send streaming progress indicator
            sendSSEMessage(`${modelName}_progress`, JSON.stringify({ 
              status: 'streaming',
              message: 'Receiving response...'
            }));

            const reader = responseBody.getReader();
            const decoder = new TextDecoder();
            let hasReceivedContent = false;

            try {
              let buffer = '';
              let chunkCount = 0;
              const startTime = Date.now();
              
              while (connectionActive) {
                const { done, value } = await reader.read();
                if (done) break;

                lastActivity = Date.now();
                chunkCount++;
                
                // Decode chunk with streaming support
                const chunk = decoder.decode(value, { stream: true });
                buffer += chunk;
                
                // Process complete lines with improved parsing
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                  if (!connectionActive) break;
                  
                  if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') {
                      const duration = Date.now() - startTime;
                      sendSSEMessage(`${modelName}_end`, JSON.stringify({ 
                        message: hasReceivedContent ? 'Response completed' : 'Response completed (empty)',
                        stats: { duration, chunks: chunkCount }
                      }));
                      return;
                    }

                    try {
                      const parsed = JSON.parse(data);
                      
                      // Handle different response formats
                      if (parsed.choices && parsed.choices[0]?.delta?.content) {
                        const token = parsed.choices[0].delta.content;
                        hasReceivedContent = true;
                        
                        // Batch small tokens for better performance
                        sendSSEMessage(`${modelName}_chunk`, JSON.stringify({ 
                          token,
                          timestamp: Date.now()
                        }));
                      } else if (parsed.error) {
                        throw new Error(parsed.error.message || 'API returned an error');
                      }
                    } catch (parseError) {
                      // Enhanced error handling for parsing issues
                      if (data.trim() && !data.includes('[DONE]')) {
                        console.warn(`Parse error for ${modelName}:`, parseError, 'Data:', data.substring(0, 100));
                        // Don't fail the entire stream for parsing errors
                      }
                    }
                  }
                }
                
                // Prevent buffer from growing too large
                if (buffer.length > 10000) {
                  console.warn(`Large buffer detected for ${modelName}, truncating`);
                  buffer = buffer.slice(-1000);
                }
              }

              // If we reach here without [DONE], the stream ended unexpectedly
              if (hasReceivedContent) {
                sendSSEMessage(`${modelName}_end`, JSON.stringify({ 
                  message: 'Response completed (stream ended)'
                }));
              } else {
                throw new Error('Stream ended without receiving any content');
              }

            } finally {
              reader.releaseLock();
            }

          } catch (error) {
            console.error(`Error for model ${modelName}:`, error);
            
            let errorMessage = 'An unexpected error occurred';
            let retryable = false;
            
            if (error instanceof Error) {
              const apiError = error as APIError;
              errorMessage = apiError.message;
              retryable = apiError.retryable || false;
              
              // Provide user-friendly error messages
              if (errorMessage.includes('fetch')) {
                errorMessage = 'Network connection failed. Please check your internet connection.';
                retryable = true;
              } else if (errorMessage.includes('timeout')) {
                errorMessage = 'Request timed out. The model may be overloaded.';
                retryable = true;
              } else if (errorMessage.includes('rate limit')) {
                errorMessage = 'Too many requests. Please wait a moment before trying again.';
                retryable = true;
              }
            }
            
            sendSSEMessage(`${modelName}_error`, JSON.stringify({ 
              message: errorMessage,
              retryable,
              timestamp: new Date().toISOString()
            }));
          }
        };

        // Execute all requests with enhanced error handling and cleanup
        Promise.allSettled(models.map((modelName, index) => makeAIRequest(modelName, index)))
          .then((results) => {
            console.log('All model requests completed:', results.map((result, index) => ({
              model: models[index],
              status: result.status,
              value: result.status === 'fulfilled' ? 'success' : result.reason?.message
            })));
            
            // Send final heartbeat before closing
            sendSSEMessage('heartbeat', JSON.stringify({ 
              timestamp: Date.now(),
              completed: true,
              results: results.length
            }));
            
            cleanup();
            controller.close();
          })
          .catch((error) => {
            console.error('Stream error:', error);
            cleanup();
            controller.close();
          });
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache, no-transform',
      },
    });

  } catch (error) {
    console.error('Request error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
