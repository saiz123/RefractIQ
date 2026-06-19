import chalk from 'chalk';
import type { RunResult } from '@agentforge/shared';

export function printCostTable(result: RunResult): void {
  console.log(chalk.bold('\nCost breakdown:'));

  const colW = [18, 16, 18, 10, 10, 10];
  const header = [
    'STAGE'.padEnd(colW[0]),
    'PROVIDER'.padEnd(colW[1]),
    'MODEL'.padEnd(colW[2]),
    'IN TOK'.padEnd(colW[3]),
    'OUT TOK'.padEnd(colW[4]),
    'COST USD',
  ].join('  ');

  console.log(chalk.dim(header));
  console.log(chalk.dim('─'.repeat(header.length)));

  for (const stage of result.stages) {
    if (!stage.provider) continue; // skip stub stages (test with no provider)
    const label = stage.iteration > 0 ? `${stage.stage}[${stage.iteration}]` : stage.stage;
    console.log(
      [
        label.padEnd(colW[0]),
        stage.provider.padEnd(colW[1]),
        (stage.model ?? '').slice(0, 17).padEnd(colW[2]),
        String(stage.inputTokens).padEnd(colW[3]),
        String(stage.outputTokens).padEnd(colW[4]),
        `$${stage.costUsd.toFixed(4)}`,
      ].join('  ')
    );
  }

  console.log(chalk.dim('─'.repeat(header.length)));
  console.log(
    [
      'TOTAL'.padEnd(colW[0]),
      ''.padEnd(colW[1]),
      ''.padEnd(colW[2]),
      String(result.totalInputTokens).padEnd(colW[3]),
      String(result.totalOutputTokens).padEnd(colW[4]),
      chalk.bold(`$${result.totalCostUsd.toFixed(4)}`),
    ].join('  ')
  );

  const durationSec = (result.durationMs / 1000).toFixed(1);
  console.log(chalk.dim(`\nDuration: ${durationSec}s`));
}
