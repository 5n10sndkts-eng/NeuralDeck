/**
 * Mock LLM Helper
 * 
 * Provides utilities for mocking LLM API responses in tests
 * for deterministic autonomous workflow testing.
 */

import fs from 'fs';
import path from 'path';

export interface MockLLMResponse {
  response: string;
  files?: Array<{ path: string; content: string }>;
}

export interface MockLLMResponses {
  analyst?: MockLLMResponse;
  pm?: MockLLMResponse;
  architect?: MockLLMResponse;
  scrumMaster?: MockLLMResponse;
  developer?: MockLLMResponse;
}

/**
 * Load mock LLM responses from fixture file
 */
export function loadMockLLMResponses(): MockLLMResponses {
  const fixturePath = path.join(__dirname, '../../fixtures/mock-llm-responses-autonomy.json');
  const content = fs.readFileSync(fixturePath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Setup LLM API mocking in Playwright context
 */
export async function setupLLMMocking(context: any, responses?: MockLLMResponses): Promise<void> {
  const mockResponses = responses || loadMockLLMResponses();
  
  await context.route('**/api/chat', async (route) => {
    const request = route.request();
    const postData = request.postData();
    
    let response: MockLLMResponse = mockResponses.developer || { response: 'Default response' };
    
    if (postData) {
      const data = JSON.parse(postData);
      const prompt = data.prompt || data.messages?.[0]?.content || '';
      
      if (prompt.includes('analyst') || prompt.includes('analyze')) {
        response = mockResponses.analyst || response;
      } else if (prompt.includes('PM') || prompt.includes('product manager')) {
        response = mockResponses.pm || response;
      } else if (prompt.includes('architect') || prompt.includes('architecture')) {
        response = mockResponses.architect || response;
      } else if (prompt.includes('scrum') || prompt.includes('stories')) {
        response = mockResponses.scrumMaster || response;
      }
    }
    
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ response: response.response }),
    });
  });
}
