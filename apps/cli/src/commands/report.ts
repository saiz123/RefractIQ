import { Command } from 'commander';
import chalk from 'chalk';
import { openDbAsync } from '../db/client.js';
import { listRuns, getRunWithStages } from '../db/runs.js';

export const reportCommand = new Command('report')
  .description('Show run history and cost breakdown')
  .option('--run <id>', 'Show detailed breakdown for a specific run')
  .option('--json', 'Output as JSON', false)
  .action(async (options) => {
    try {
      const db = await openDbAsync();

      if (options.run) {
        // Detailed view for a specific run
        const data = await getRunWithStages(db, options.run as string);
        if (!data) {
          console.error(chalk.red(`Run "${options.run as string}" not found.`));
          process.exit(1);
        }

        if (options.json) {
          console.log(JSON.stringify(data, null, 2));
          return;
        }

        const { run, stages } = data;
        console.log(chalk.bold(`\nRun ${run.id}`));
        console.log(`Status:  ${run.status}`);
        console.log(`Prompt:  ${run.userPrompt}`);
        console.log(`Cost:    $${run.totalCostUsd.toFixed(4)}`);
        console.log(`Tokens:  ${run.totalInputTokens} in / ${run.totalOutputTokens} out`);
        console.log(`Output:  ${run.outputPath}`);

        if (stages.length > 0) {
          console.log(chalk.bold('\nStages:'));
          const colW = [18, 16, 18, 10, 10];
          console.log(chalk.dim(['STAGE'.padEnd(colW[0]), 'PROVIDER'.padEnd(colW[1]), 'MODEL'.padEnd(colW[2]), 'IN TOK'.padEnd(colW[3]), 'COST'].join('  ')));
          for (const stage of stages) {
            if (!stage.provider) continue;
            const label = stage.iteration > 0 ? `${stage.stage}[${stage.iteration}]` : stage.stage;
            console.log([
              label.padEnd(colW[0]),
              stage.provider.padEnd(colW[1]),
              (stage.model ?? '').slice(0, 17).padEnd(colW[2]),
              String(stage.inputTokens).padEnd(colW[3]),
              `$${stage.costUsd.toFixed(4)}`,
            ].join('  '));
          }
        }
      } else {
        // List recent runs
        const recentRuns = await listRuns(db, 20);

        if (options.json) {
          console.log(JSON.stringify(recentRuns, null, 2));
          return;
        }

        if (recentRuns.length === 0) {
          console.log(chalk.yellow('No runs yet. Use "agentforge build" to start one.'));
          return;
        }

        console.log(chalk.bold('\nRecent Runs\n'));
        const colW = [38, 10, 8, 10];
        console.log(chalk.dim(['RUN ID'.padEnd(colW[0]), 'STATUS'.padEnd(colW[1]), 'STAGES'.padEnd(colW[2]), 'COST'].join('  ')));
        console.log(chalk.dim('─'.repeat(70)));

        for (const run of recentRuns.reverse()) {
          const statusColor = run.status === 'complete' ? chalk.green : run.status === 'aborted' ? chalk.yellow : chalk.red;
          console.log([
            run.id.padEnd(colW[0]),
            statusColor(run.status).padEnd(colW[1] + 10),
            ''.padEnd(colW[2]),
            `$${run.totalCostUsd.toFixed(4)}`,
          ].join('  '));
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(chalk.red(`✗ ${msg}`));
      process.exit(1);
    }
  });
