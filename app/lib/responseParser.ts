// Utility functions for parsing model responses, especially for models that show internal thinking

export interface ParsedResponse {
  thinking?: string;
  finalAnswer: string;
  hasThinking: boolean;
}

/**
 * Parse OpenAI GPT-OSS 20B responses to separate internal thinking from final answer
 * This model often shows its reasoning process before giving the final answer
 */
export function parseOpenAIGPTOSSResponse(response: string): ParsedResponse {
  if (!response.trim()) {
    return {
      finalAnswer: response,
      hasThinking: false
    };
  }

  // Debug logging to understand the response structure
  console.log('OpenAI GPT-OSS 20B Response Analysis:');
  console.log('Length:', response.length);
  console.log('First 200 chars:', response.substring(0, 200));
  console.log('Last 200 chars:', response.substring(Math.max(0, response.length - 200)));
  console.log('Paragraphs count:', response.split(/\n\s*\n/).length);

  // Pattern specific to this model's verbose analysis style
  // Look for the pattern where it analyzes multiple options and then gives a final answer
  const analysisPattern = /^(.*?)(?:Let's produce|Let me give|I'll give|Here's|My response|Final answer|The answer|So)\s*[:\-]?\s*(.*)$/is;
  const match = response.match(analysisPattern);
  
  if (match) {
    const [, thinking, finalAnswer] = match;
    const cleanThinking = thinking.trim();
    const cleanFinalAnswer = finalAnswer.trim();
    
    // Check if the thinking section contains analysis keywords
    const hasAnalysisKeywords = /(?:probably|maybe|but|however|let's think|analysis|consider|should be|requirement|means)/i.test(cleanThinking);
    
    if (hasAnalysisKeywords && cleanThinking.length > 50 && cleanFinalAnswer.length > 5) {
      console.log('Pattern matched - Analysis style detected');
      return {
        thinking: cleanThinking,
        finalAnswer: cleanFinalAnswer,
        hasThinking: true
      };
    }
  }

  // Look for explicit thinking/reasoning sections that are common in this model
  // This model often shows verbose analysis of options before giving final answers
  
  // Pattern for option analysis (common in this model)
  const optionAnalysisPattern = /^(.*?)(?:Let's produce|Let me give|I'll give|Here's|My response|Final answer|The answer|So|Therefore)\s*[:\-]?\s*["']?([^"']+)["']?\s*\.?\s*$/is;
  const optionMatch = response.match(optionAnalysisPattern);
  
  if (optionMatch) {
    const [, analysis, finalAnswer] = optionMatch;
    const cleanAnalysis = analysis.trim();
    const cleanFinalAnswer = finalAnswer.trim();
    
    // Look for analysis indicators in the first part
    const hasAnalysisIndicators = /(?:probably|maybe|but|however|should be|requirement|means|let's think|analysis|consider|options?|choices?)/i.test(cleanAnalysis);
    
    if (hasAnalysisIndicators && cleanAnalysis.length > 100 && cleanFinalAnswer.length > 3 && cleanFinalAnswer.length < cleanAnalysis.length * 0.3) {
      console.log('Option analysis pattern detected');
      return {
        thinking: cleanAnalysis,
        finalAnswer: cleanFinalAnswer,
        hasThinking: true
      };
    }
  }
  
  // Pattern 1: XML-style thinking tags (common in some models)
  const xmlThinkingMatch = response.match(/^(.*?)<thinking>(.*?)<\/thinking>(.*?)$/is);
  if (xmlThinkingMatch) {
    const [, prefix, thinking, finalAnswer] = xmlThinkingMatch;
    const cleanFinalAnswer = (prefix + finalAnswer).trim();
    if (thinking.trim().length > 10 && cleanFinalAnswer.length > 5) {
      return {
        thinking: thinking.trim(),
        finalAnswer: cleanFinalAnswer,
        hasThinking: true
      };
    }
  }

  // Pattern 2: Look for reasoning blocks followed by conclusions
  // Split by double newlines to get paragraphs
  const paragraphs = response.split(/\n\s*\n/).filter(p => p.trim());
  
  if (paragraphs.length >= 2) {
    // Look for conclusion indicators in the last few paragraphs
    const conclusionIndicators = [
      'therefore',
      'so the answer',
      'in conclusion',
      'final answer',
      'my answer',
      'the answer is',
      'to summarize',
      'in summary',
      'thus',
      'hence',
      'as a result'
    ];

    // Check the last 2 paragraphs for conclusion indicators
    for (let i = Math.max(0, paragraphs.length - 2); i < paragraphs.length; i++) {
      const paragraph = paragraphs[i].toLowerCase();
      const hasConclusion = conclusionIndicators.some(indicator => 
        paragraph.includes(indicator)
      );

      if (hasConclusion && i > 0) {
        const thinking = paragraphs.slice(0, i).join('\n\n').trim();
        const finalAnswer = paragraphs.slice(i).join('\n\n').trim();
        
        // Ensure both sections have reasonable content
        if (thinking.length > 30 && finalAnswer.length > 10) {
          return {
            thinking,
            finalAnswer,
            hasThinking: true
          };
        }
      }
    }
  }

  // Pattern 3: Look for step-by-step reasoning
  const lines = response.split('\n').filter(line => line.trim());
  if (lines.length > 4) {
    let reasoningEndIndex = -1;
    
    // Look for lines that indicate the end of reasoning
    for (let i = 1; i < lines.length - 1; i++) {
      const line = lines[i].toLowerCase().trim();
      
      // Check if this line starts a conclusion
      if (line.startsWith('therefore') || 
          line.startsWith('so ') ||
          line.startsWith('in conclusion') ||
          line.startsWith('final answer') ||
          line.startsWith('the answer is') ||
          line.includes('my final answer')) {
        reasoningEndIndex = i;
        break;
      }
    }

    if (reasoningEndIndex > 1) {
      const thinking = lines.slice(0, reasoningEndIndex).join('\n').trim();
      const finalAnswer = lines.slice(reasoningEndIndex).join('\n').trim();
      
      if (thinking.length > 30 && finalAnswer.length > 10) {
        return {
          thinking,
          finalAnswer,
          hasThinking: true
        };
      }
    }
  }

  // Pattern 4: Heuristic based on response length and structure
  // If the response is very long (>500 chars) and has clear structure,
  // try to separate reasoning from conclusion
  if (response.length > 500) {
    const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 10);
    
    if (sentences.length >= 4) {
      // Look for the last 1-2 sentences that might be the conclusion
      const lastSentence = sentences[sentences.length - 1].trim();
      const secondLastSentence = sentences.length > 1 ? sentences[sentences.length - 2].trim() : '';
      
      // Check if the last sentence(s) seem like a conclusion
      const conclusionPattern = /^(therefore|thus|so|in conclusion|the answer|my answer|final answer)/i;
      
      if (conclusionPattern.test(lastSentence) || conclusionPattern.test(secondLastSentence)) {
        const conclusionStart = conclusionPattern.test(lastSentence) ? 
          sentences.length - 1 : sentences.length - 2;
        
        const thinking = sentences.slice(0, conclusionStart).join('. ').trim() + '.';
        const finalAnswer = sentences.slice(conclusionStart).join('. ').trim() + '.';
        
        if (thinking.length > 50 && finalAnswer.length > 15) {
          return {
            thinking,
            finalAnswer,
            hasThinking: true
          };
        }
      }
    }
  }

  // Pattern 5: Look for short final answers after long analysis (common in GPT-OSS 20B)
  // This model often gives a very short answer at the end after verbose analysis
  const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 5);
  
  if (sentences.length >= 3 && response.length > 200) {
    // Look at the last 1-2 sentences
    const lastSentence = sentences[sentences.length - 1].trim();
    const secondLastSentence = sentences.length > 1 ? sentences[sentences.length - 2].trim() : '';
    
    // Check if the last sentence is very short and direct (likely the final answer)
    if (lastSentence.length < 100 && lastSentence.split(' ').length <= 10) {
      const restOfResponse = sentences.slice(0, -1).join('. ').trim() + '.';
      
      // Ensure the analysis part is much longer than the final answer
      if (restOfResponse.length > lastSentence.length * 3) {
        console.log('Short final answer pattern detected');
        return {
          thinking: restOfResponse,
          finalAnswer: lastSentence,
          hasThinking: true
        };
      }
    }
    
    // Also check if the last two sentences together form a short conclusion
    const lastTwoSentences = [secondLastSentence, lastSentence].filter(s => s).join('. ').trim();
    if (lastTwoSentences.length < 150 && lastTwoSentences.split(' ').length <= 20) {
      const restOfResponse = sentences.slice(0, -2).join('. ').trim() + '.';
      
      if (restOfResponse.length > lastTwoSentences.length * 2) {
        console.log('Short two-sentence conclusion detected');
        return {
          thinking: restOfResponse,
          finalAnswer: lastTwoSentences,
          hasThinking: true
        };
      }
    }
  }

  // Pattern 6: Simple fallback - if response has multiple paragraphs and is long,
  // treat the last paragraph as potentially the final answer
  if (paragraphs.length >= 3 && response.length > 300) {
    const lastParagraph = paragraphs[paragraphs.length - 1].trim();
    const restOfResponse = paragraphs.slice(0, -1).join('\n\n').trim();
    
    // If the last paragraph is much shorter and seems conclusive
    if (lastParagraph.length < response.length * 0.25 && 
        lastParagraph.length > 20 &&
        restOfResponse.length > 100) {
      
      // Check if it looks like a conclusion
      const looksLikeConclusion = /^(so|therefore|thus|in summary|to conclude|the answer|my response)/i.test(lastParagraph) ||
                                 lastParagraph.split(' ').length < 50; // Short and concise
      
      if (looksLikeConclusion) {
        return {
          thinking: restOfResponse,
          finalAnswer: lastParagraph,
          hasThinking: true
        };
      }
    }
  }

  // If no clear pattern is found, return the whole response as final answer
  return {
    finalAnswer: response,
    hasThinking: false
  };
}

/**
 * Main function to parse any model response
 * Can be extended to handle other models with specific patterns
 */
export function parseModelResponse(modelId: string, response: string): ParsedResponse {
  // Handle OpenAI GPT-OSS 20B specifically
  if (modelId === 'openai/gpt-oss-20b:free' || modelId.includes('gpt-oss-20b')) {
    return parseOpenAIGPTOSSResponse(response);
  }
  
  // For other models, return as-is
  return {
    finalAnswer: response,
    hasThinking: false
  };
}