import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { createProviderRegistry } from 'ai';

// Provider configurations
export const registry = createProviderRegistry({
  // OpenAI models
  openai: openai,
  
  // Anthropic models  
  anthropic: anthropic,
  
  // Google models
  google: google,
});

// Model aliases for easy switching
export const models = {
  // Fast models for development/testing
  fast: registry.languageModel('openai:gpt-4o-mini'),
  
  // Balanced models for general use
  balanced: registry.languageModel('anthropic:claude-3-5-haiku-20241022'),
  
  // Advanced models for complex tasks
  advanced: registry.languageModel('openai:gpt-4o'),
  reasoning: registry.languageModel('anthropic:claude-3-5-sonnet-20241022'),
  
  // Google models
  gemini: registry.languageModel('google:gemini-1.5-pro'),
  
  // Default model (overridden below if GPT-5 is available)
  default: registry.languageModel('openai:gpt-5'),
} as const;

// Model configurations with provider-specific settings
export const modelConfigs = {
  'openai:gpt-5': {
    name: 'GPT-5',
    provider: 'OpenAI',
    description: 'Latest OpenAI general model',
    maxTokens: 128000,
    costPer1kTokens: { input: 0.01, output: 0.03 },
  },
  'openai:gpt-4o': {
    name: 'GPT-4o',
    provider: 'OpenAI',
    description: 'Most capable OpenAI model for complex tasks',
    maxTokens: 128000,
    costPer1kTokens: { input: 0.005, output: 0.015 },
  },
  'openai:gpt-4o-mini': {
    name: 'GPT-4o Mini',
    provider: 'OpenAI', 
    description: 'Fast and cost-effective OpenAI model',
    maxTokens: 128000,
    costPer1kTokens: { input: 0.00015, output: 0.0006 },
  },
  'anthropic:claude-3-5-sonnet-20241022': {
    name: 'Claude 3.5 Sonnet',
    provider: 'Anthropic',
    description: 'Excellent reasoning and analysis capabilities',
    maxTokens: 200000,
    costPer1kTokens: { input: 0.003, output: 0.015 },
  },
  'anthropic:claude-3-5-haiku-20241022': {
    name: 'Claude 3.5 Haiku', 
    provider: 'Anthropic',
    description: 'Fast and efficient for most tasks',
    maxTokens: 200000,
    costPer1kTokens: { input: 0.001, output: 0.005 },
  },
  'google:gemini-1.5-pro': {
    name: 'Gemini 1.5 Pro',
    provider: 'Google',
    description: 'Advanced multimodal capabilities',
    maxTokens: 2000000,
    costPer1kTokens: { input: 0.001, output: 0.002 },
  },
} as const;

// Type for model identifiers
export type ModelId = keyof typeof modelConfigs;

// Helper function to get model by ID
export function getModelById(modelId: ModelId) {
  return registry.languageModel(modelId);
}

// Helper function to get model configuration
export function getModelConfig(modelId: ModelId) {
  return modelConfigs[modelId];
}

// Environment variable for default model
export function getDefaultModel() {
  const envModel = process.env.NEXT_PUBLIC_DEFAULT_MODEL as ModelId;
  if (envModel && modelConfigs[envModel]) {
    return getModelById(envModel);
  }
  // Prefer GPT-5 if available, else fallback to existing balanced default
  return modelConfigs['openai:gpt-5'] ? getModelById('openai:gpt-5') : models.balanced;
} 