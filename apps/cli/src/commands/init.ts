import { Command } from 'commander';
import chalk from 'chalk';
import { existsSync, mkdirSync, writeFileSync, readFileSync, appendFileSync } from 'fs';
import { join } from 'path';
import { createDb } from '../db/client.js';

const DEFAULT_CONFIG = {
  version: '0.1.0',
  providers: [],
  budget: { defaultRunUsd: 0.5 },
  tiers: {
    cheap: { tasks: ['intake', 'summarize', 'doc'] },
    mid: { tasks: ['architect', 'review'] },
    strong: { tasks: ['build', 'repair'] },
  },
  security: {
    allowedCommands: [
      'npm',
      'npx',
      'pnpm',
      'node',
      'python',
      'python3',
      'pytest',
      'go',
      'cargo',
      'make',
      'vitest',
      'jest',
    ],
  },
};

const GITIGNORE_ENTRIES = ['.refractiq/'];

export const initCommand = new Command('init')
  .description('Initialize RefractIQ in the current directory')
  .action(async () => {
    const cwd = process.cwd();
    const refractiqDir = join(cwd, '.refractiq');

    if (existsSync(refractiqDir)) {
      console.log(
        chalk.yellow(
          'Warning: .refractiq/ already exists. Skipping initialization to avoid overwriting.'
        )
      );
      process.exit(0);
    }

    // Create .refractiq/ directory
    mkdirSync(refractiqDir, { recursive: true });

    // Write config.json
    const configPath = join(refractiqDir, 'config.json');
    writeFileSync(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2) + '\n', 'utf8');

    // Create and initialize the SQLite database with schema
    try {
      await createDb(refractiqDir);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(chalk.red(`Failed to initialize database: ${msg}`));
      process.exit(1);
    }

    // Update .gitignore if it exists
    const gitignorePath = join(cwd, '.gitignore');
    if (existsSync(gitignorePath)) {
      const existing = readFileSync(gitignorePath, 'utf8');
      const toAdd = GITIGNORE_ENTRIES.filter((entry) => !existing.includes(entry));
      if (toAdd.length > 0) {
        const block = '\n# RefractIQ\n' + toAdd.join('\n') + '\n';
        appendFileSync(gitignorePath, block, 'utf8');
      }
    }

    console.log(chalk.green('RefractIQ initialized successfully!'));
    console.log('');
    console.log(chalk.bold('Created:'));
    console.log(`  ${chalk.cyan('.refractiq/config.json')}  — project configuration`);
    console.log(`  ${chalk.cyan('.refractiq/refractiq.db')} — local SQLite database`);
    console.log('');
    console.log(chalk.bold('Next steps:'));
    console.log(`  1. Add a provider:  ${chalk.cyan('refractiq providers add')}`);
    console.log(`  2. Check health:    ${chalk.cyan('refractiq doctor')}`);
    console.log(`  3. Plan a feature:  ${chalk.cyan('refractiq plan "your feature description"')}`);
    console.log(
      `  4. Build it:        ${chalk.cyan('refractiq build "your feature description"')}`
    );
  });
