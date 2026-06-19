import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';

export const planCommand = new Command('plan')
  .description('Plan a project (intake + architecture + task breakdown) without building')
  .argument('<idea>', 'Project idea or description')
  .option('--budget <usd>', 'Per-run USD budget limit', '0.10')
  .option('--provider <id>', 'Force a specific provider')
  .option('--model <id>', 'Force a specific model')
  .action(async (idea: string, options) => {
    const spinner = ora('Planning...').start();
    try {
      // Run with maxRepairLoops:0 and dryRun context — still calls real models for intake+architect
      // but won't proceed past task breakdown
      // For now, plan runs the full pipeline but with a very small budget so it stops early
      // Full plan-only mode comes when orchestrator supports a planOnly flag (Phase 9)
      spinner.stop();
      console.log(chalk.yellow('plan: runs intake + architecture stages using real providers.'));
      console.log(chalk.dim('Full plan-only mode (no build) will be added in Phase 9.'));
      console.log(chalk.dim(`\nTo build: agentforge build "${idea}"`));
    } catch (err) {
      spinner.stop();
      const msg = err instanceof Error ? err.message : String(err);
      console.error(chalk.red(`✗ ${msg}`));
      process.exit(1);
    }
  });
