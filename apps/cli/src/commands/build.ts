import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { openDbAsync } from '../db/client.js';
import { saveRun } from '../db/runs.js';
import { runBuild } from '../runner.js';
import { printCostTable, printContextStats, printPreviewFile } from '../display.js';

export const buildCommand = new Command('build')
  .description('Run the full AI pipeline to build a project from an idea')
  .argument('<idea>', 'Project idea or description')
  .option('--budget <usd>', 'Per-run USD budget limit', '0.50')
  .option('--provider <id>', 'Force a specific provider for all stages')
  .option('--model <id>', 'Force a specific model for all stages')
  .option('--max-repair-loops <n>', 'Maximum repair loop iterations', '3')
  .option('--output <dir>', 'Output directory for generated files', './output')
  .option('--dry-run', 'Plan only — runs intake + architecture, no file writes or commands', false)
  .option(
    '--preview',
    'Preview files that would be generated without writing to disk (runs intake + architect + build stages, will spend tokens)',
    false
  )
  .option(
    '--preview-full',
    'Show complete file content in preview (default shows first 30 lines)',
    false
  )
  .option('--test-command <cmd>', 'Command to run tests (e.g. "npx vitest run")')
  .option(
    '--target-dir <path>',
    'Existing project directory to read as context and apply changes to'
  )
  .option('--patch', 'Apply changes to the current directory (shorthand for --target-dir .)', false)
  .option(
    '--sandbox',
    'Run generated test commands inside an isolated Docker container (requires Docker)',
    false
  )
  .action(async (idea: string, options) => {
    const spinner = ora('Starting RefractIQ pipeline...').start();

    try {
      const isPreview = options.preview as boolean;

      const targetDir = options.patch ? process.cwd() : (options.targetDir as string | undefined);

      const result = await runBuild(idea, {
        budgetUsd: parseFloat(options.budget as string),
        maxRepairLoops: parseInt(options.maxRepairLoops as string, 10),
        outputDir: options.output as string,
        preferredProvider: options.provider as string | undefined,
        preferredModel: options.model as string | undefined,
        testCommand: options.testCommand as string | undefined,
        dryRun: isPreview || (options.dryRun as boolean),
        showPreview: isPreview,
        targetDir,
        sandbox: options.sandbox as boolean,
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
      printContextStats(result);

      // Print planned writes if available (from --preview mode)
      if (result.plannedWrites && result.plannedWrites.length > 0) {
        console.log(
          chalk.bold(`\nFiles that would be generated (${result.plannedWrites.length} files):\n`)
        );
        for (const w of result.plannedWrites) {
          printPreviewFile(w, !!(options.previewFull as boolean));
        }
        console.log(chalk.dim(`\nRun without --preview to apply these changes.`));
      }
    } catch (err) {
      spinner.stop();
      const msg = err instanceof Error ? err.message : String(err);
      console.error(chalk.red(`\n✗ ${msg}`));
      process.exit(1);
    }
  });
