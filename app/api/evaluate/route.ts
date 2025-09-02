import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Request interface
interface EvaluateRequest {
  userPrompt: string;
  modelResponses: Array<{
    modelId: string;
    modelName: string;
    response: string;
    timing?: {
      timeToFirstToken: number | null;
      totalResponseTime: number | null;
      streamingDuration: number | null;
      requestStartTime?: number;
      firstTokenTime?: number;
      responseEndTime?: number;
    };
  }>;
}

// Expected response structure from the evaluator
interface EvaluationResult {
  summary: string;
  verdict: {
    winner: string;
    modelId: string;
  };
  reasoning: string;
  scorecard: Array<{
    modelId: string;
    modelName: string;
    relevance: number;
    clarity: number;
    depth: number;
    speed: number;
    overall: number;
  }>;
  speedAnalysis: {
    fastest: {
      modelName: string;
      modelId: string;
      timeToFirstToken: number;
      totalResponseTime: number;
    };
    slowest: {
      modelName: string;
      modelId: string;
      timeToFirstToken: number;
      totalResponseTime: number;
    };
    averageFirstTokenTime: number;
    averageTotalTime: number;
  };
  timestamp: number;
}

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body: EvaluateRequest = await request.json();
    const { userPrompt, modelResponses } = body;

    // Validate input
    if (!userPrompt || !modelResponses || modelResponses.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request: userPrompt and modelResponses are required' },
        { status: 400 }
      );
    }

    // Check for Google API key
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Google API key not configured. Please add GOOGLE_API_KEY to your .env.local file' },
        { status: 500 }
      );
    }

    // Initialize Google Generative AI
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.3, // Lower temperature for more consistent analysis
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json'
      }
    });

    // Format the model responses for the prompt with timing data
    const formattedResponses = modelResponses
      .map((resp, index) => {
        let timingInfo = '';
        if (resp.timing && resp.timing.timeToFirstToken && resp.timing.totalResponseTime) {
          timingInfo = `\n**Performance:** First token in ${resp.timing.timeToFirstToken}ms, Total time: ${resp.timing.totalResponseTime}ms`;
        }
        return `**Model ${index + 1}: ${resp.modelName}** (${resp.modelId})${timingInfo}\n${resp.response}`;
      })
      .join('\n\n---\n\n');

    // Prepare timing summary for the evaluator
    const timingData = modelResponses
      .filter(resp => resp.timing && resp.timing.timeToFirstToken && resp.timing.totalResponseTime)
      .map(resp => ({
        modelName: resp.modelName,
        modelId: resp.modelId,
        timeToFirstToken: resp.timing!.timeToFirstToken!,
        totalResponseTime: resp.timing!.totalResponseTime!
      }));

    const timingSummary = timingData.length > 0 ? `

**PERFORMANCE METRICS:**
${timingData.map(t => 
  `- ${t.modelName}: ${t.timeToFirstToken}ms to first token, ${t.totalResponseTime}ms total`
).join('\n')}

**SPEED RANKING (Fastest to Slowest by First Token):**
${timingData
  .sort((a, b) => a.timeToFirstToken - b.timeToFirstToken)
  .map((t, i) => `${i + 1}. ${t.modelName} (${t.timeToFirstToken}ms)`)
  .join('\n')}
` : '';

    // Create the evaluation prompt
    const evaluationPrompt = `You are an expert AI analyst tasked with evaluating and comparing multiple AI model responses to a user's prompt. Your analysis should be thorough, objective, and insightful.

**User's Original Prompt:**
${userPrompt}

**Model Responses to Evaluate:**
${formattedResponses}${timingSummary}

**Instructions:**
Analyze each response and provide a comprehensive evaluation. You must return your analysis as a single, valid JSON object with the exact structure specified below. Do not include any text before or after the JSON.

**Required JSON Structure:**
{
  "summary": "A brief 2-3 sentence overview of the overall quality and variety of responses",
  "verdict": {
    "winner": "The name of the best performing model",
    "modelId": "The exact model ID of the winner"
  },
  "reasoning": "A detailed 3-4 sentence explanation of why the winning response was chosen, highlighting its specific strengths and advantages over others",
  "scorecard": [
    {
      "modelId": "exact_model_id_1",
      "modelName": "Model Name 1", 
      "relevance": 8.5,
      "clarity": 9.0,
      "depth": 7.5,
      "speed": 8.0,
      "overall": 8.2
    }
    // ... continue for each model
  ],
  "speedAnalysis": {
    "fastest": {
      "modelName": "Fastest Model Name",
      "modelId": "fastest_model_id",
      "timeToFirstToken": 500,
      "totalResponseTime": 3200
    },
    "slowest": {
      "modelName": "Slowest Model Name", 
      "modelId": "slowest_model_id",
      "timeToFirstToken": 2100,
      "totalResponseTime": 8500
    },
    "averageFirstTokenTime": 1200,
    "averageTotalTime": 5400
  },
  "timestamp": ${Date.now()}
}

**Scoring Criteria (0-10 scale):**
- **Relevance**: How well does the response address the user's specific question/request?
- **Clarity**: How clear, well-structured, and easy to understand is the response?
- **Depth**: How comprehensive and thorough is the analysis or information provided?
- **Speed**: Response speed performance (10 = fastest, 0 = slowest). Consider both time to first token and total response time.
- **Overall**: Weighted average considering all factors plus creativity, accuracy, and helpfulness

**Important Guidelines:**
- Be objective and fair in your analysis
- Consider the specific context and requirements of the user's prompt
- Look for accuracy, completeness, creativity, and practical value
- For speed scoring: faster models get higher scores, but balance speed with quality
- Speed analysis should include both latency (first token) and total response time
- The overall score should reflect the true quality relative to the user's needs including speed
- Provide specific, actionable reasoning for your verdict
- Ensure all scores are realistic and well-justified
- Always include the speedAnalysis section with fastest/slowest models and timing averages`;

    // Generate the evaluation using Google Gemini
    const result = await model.generateContent(evaluationPrompt);
    const response = await result.response;
    const evaluationText = response.text();

    // Parse the JSON response
    let evaluationResult: EvaluationResult;
    try {
      evaluationResult = JSON.parse(evaluationText);
    } catch (parseError) {
      console.error('Failed to parse Gemini response as JSON:', evaluationText);
      throw new Error('Invalid JSON response from Gemini model');
    }

    // Validate the result structure
    if (!evaluationResult || typeof evaluationResult !== 'object') {
      throw new Error('Invalid response format from Gemini model');
    }

    // Return the evaluation result
    return NextResponse.json(evaluationResult);

  } catch (error) {
    console.error('Error in evaluator API:', error);
    
    // Return a structured error response
    return NextResponse.json(
      { 
        error: 'Failed to evaluate responses',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
