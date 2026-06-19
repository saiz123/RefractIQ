import type { FileWrite } from './artifacts.js';
import type { TestArtifact } from './artifacts.js';

/** Implemented by workspace-engine. Injected into Orchestrator. */
export interface FileWriter {
  applyWrites(writes: FileWrite[]): Promise<void>;
  getDiff(from?: string, to?: string): Promise<string>;
  commitStage(message: string): Promise<void>;
  listFiles?(): Promise<Array<{ path: string; content: string; sizeBytes: number; lastModifiedMs?: number }>>;
}

/** Implemented by evaluator. Injected into Orchestrator. */
export interface TestRunner {
  run(command: string): Promise<TestArtifact>;
}
