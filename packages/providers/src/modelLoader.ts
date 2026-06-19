import { createRequire } from 'module';
import type { ModelInfo } from '@agentforge/shared';

interface ModelFile {
  models: ModelInfo[];
}

// createRequire allows loading JSON in ESM + NodeNext without tsconfig changes
const _require = createRequire(import.meta.url);

function loadModelFile(filename: string): ModelInfo[] {
  const data = _require(filename) as ModelFile;
  return data.models;
}

export function loadAnthropicModels(): ModelInfo[] {
  return loadModelFile('./models/anthropic.json');
}

export function loadOpenAIModels(): ModelInfo[] {
  return loadModelFile('./models/openai.json');
}

export function loadGeminiModels(): ModelInfo[] {
  return loadModelFile('./models/gemini.json');
}

export function loadOllamaModels(): ModelInfo[] {
  return loadModelFile('./models/ollama.json');
}

export function loadOpenRouterModels(): ModelInfo[] {
  return loadModelFile('./models/openrouter.json');
}
