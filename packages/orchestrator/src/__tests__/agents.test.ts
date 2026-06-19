import { describe, it, expect } from 'vitest';
import { intakeAgent } from '../agents/intake.js';
import { architectAgent } from '../agents/architect.js';
import { builderAgent } from '../agents/builder.js';
import { reviewerAgent } from '../agents/reviewer.js';
import { docAgent } from '../agents/doc.js';
import type { BuildTask } from '@agentforge/shared';

const MOCK_REQUIREMENTS = JSON.stringify({
  clarifiedGoal: 'A CLI that reverses a string',
  targetLanguage: 'TypeScript',
  techStack: ['Node.js'],
  constraints: [],
  outOfScope: [],
  suggestedTestCommand: 'npx vitest run',
});

const MOCK_ARCHITECTURE = JSON.stringify({
  fileTree: [{ path: 'src/index.ts', role: 'entry point' }],
  modules: [{ name: 'CLI', responsibility: 'reverse string and print' }],
  interfaces: [],
  architectureDecisions: ['keep it simple'],
  buildOrder: ['src/index.ts'],
});

const MOCK_BUILD = JSON.stringify({
  files: [{ path: 'src/index.ts', content: 'console.log("hello")', action: 'create' }],
  explanation: 'Created entry point',
  assumptions: [],
});

const MOCK_REVIEW = JSON.stringify({
  issues: [],
  verdict: 'pass',
  suggestions: ['add tests'],
});

const MOCK_DOC = JSON.stringify({
  readme: '# Reverse CLI\nReverses a string.',
  changelog: '## v0.1.0\n- Initial release',
  inlineDocs: [],
});

const mockTask: BuildTask = {
  id: 'task-1',
  description: 'Create src/index.ts',
  files: ['src/index.ts'],
  dependsOn: [],
};

describe('intakeAgent', () => {
  it('buildUserMessage contains userPrompt', () => {
    const msg = intakeAgent.buildUserMessage({ userPrompt: 'hello' });
    expect(msg).toContain('hello');
  });

  it('parseResponse returns object with clarifiedGoal', () => {
    const result = intakeAgent.parseResponse(MOCK_REQUIREMENTS);
    expect(result.clarifiedGoal).toBe('A CLI that reverses a string');
    expect(result.targetLanguage).toBe('TypeScript');
  });
});

describe('architectAgent', () => {
  it('buildUserMessage wraps requirements in <requirements> tags', () => {
    const parsed = JSON.parse(MOCK_REQUIREMENTS);
    const msg = architectAgent.buildUserMessage(parsed);
    expect(msg).toContain('<requirements>');
    expect(msg).toContain('clarifiedGoal');
  });

  it('parseResponse returns artifact with fileTree and buildOrder', () => {
    const result = architectAgent.parseResponse(MOCK_ARCHITECTURE);
    expect(result.fileTree).toHaveLength(1);
    expect(result.buildOrder).toContain('src/index.ts');
  });
});

describe('builderAgent', () => {
  it('parseResponse returns artifact with files', () => {
    const result = builderAgent.parseResponse(MOCK_BUILD);
    expect(result.files[0].path).toBe('src/index.ts');
    expect(result.files[0].action).toBe('create');
  });

  it('buildUserMessage in normal mode contains task description', () => {
    const msg = builderAgent.buildUserMessage({ task: mockTask, contextSummary: 'ctx' });
    expect(msg).toContain(mockTask.description);
    expect(msg).toContain('ctx');
  });

  it('buildUserMessage in repair mode contains repairContext', () => {
    const msg = builderAgent.buildUserMessage({
      task: mockTask,
      contextSummary: 'ctx',
      repairContext: 'err: test failed',
    });
    expect(msg).toContain('err: test failed');
    expect(msg).toContain('<repair_context>');
  });
});

describe('reviewerAgent', () => {
  it('parseResponse returns artifact with verdict', () => {
    const result = reviewerAgent.parseResponse(MOCK_REVIEW);
    expect(result.verdict).toBe('pass');
    expect(result.issues).toHaveLength(0);
  });

  it('buildUserMessage wraps diff and test_results', () => {
    const requirements = JSON.parse(MOCK_REQUIREMENTS);
    const testResult = {
      passed: 5,
      failed: 0,
      errors: 0,
      compressedLog: '',
      rawExitCode: 0,
      testCommand: 'npx vitest run',
    };
    const msg = reviewerAgent.buildUserMessage({
      diff: 'diff content here',
      requirements,
      testResult,
    });
    expect(msg).toContain('<diff>');
    expect(msg).toContain('<test_results>');
    expect(msg).toContain('diff content here');
  });
});

describe('docAgent', () => {
  it('parseResponse returns artifact with readme containing Reverse', () => {
    const result = docAgent.parseResponse(MOCK_DOC);
    expect(result.readme).toContain('Reverse');
    expect(result.changelog).toBeTruthy();
  });
});
