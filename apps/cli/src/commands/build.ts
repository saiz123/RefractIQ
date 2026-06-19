import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { openDbAsync } from '../db/client.js';
import { saveRun } from '../db/runs.js';
import { runBuild } from '../runner.js';
import { printCostTable } from '../display.js';

export const buildCommand = new Command('build')
  .description('Run the full AI pipeline to build a project from an idea')
  .argument('<idea>', 'Project idea or description')
  .option('--budget <usd>', 'Per-run USD budget limit', '0.50')
  .option('--provider <id>', 'Force a specific provider for all stages')
  .option('--model <id>', 'Force a specific model for all stages')
  .option('--max-repair-loops <n>', 'Maximum repair loop iterations', '3')
  .option('--output <dir>', 'Output directory for generated files', './output')
  .option('--dry-run', 'Plan only — no model calls', false)
  .option('--test-command <cmd>', 'Command to run tests (e.g. "npx vitest run")')
  .action(async (idea: string, options) => {
    const spinner = ora('Starting AgentForge pipeline...').start();

    try {
      const result = await runBuild(idea, {
        budgetUsd: parseFloat(options.budget as string),
        maxRepairLoops: parseInt(options.maxRepairLoops as string, 10),
        outputDir: options.output as string,
        preferredProvider: options.provider as string | undefined,
        preferredModel: options.model as string | undefined,
        testCommand: options.testCommand as string | undefined,
        dryRun: options.dryRun as boolean,
      });

      spinner.stop();

      // Save to SQLite
      try {
        const db = await openDbAsync();
        await saveRun(db, result);
      } catch {
        // DB save failure should not fail the build
      }

      if (result.status === 'complete') {
        console.log(chalk.green(`\n✓ Build complete — run ID: ${result.id}`));
      } else if (result.status === 'aborted') {
        console.log(chalk.yellow(`\n⚠ Build aborted (budget exceeded) — run ID: ${result.id}`));
      } else {
        console.log(chalk.red(`\n✗ Build failed — run ID: ${result.id}`));
      }

      console.log(chalk.dim(`  Output: ${result.outputPath}`));
      printCostTable(result);
    } catch (err) {
      spinner.stop();
      const msg = err instanceof Error ? err.message : String(err);
      console.error(chalk.red(`\n✗ ${msg}`));
      process.exit(1);
    }
  });
