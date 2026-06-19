import { Command } from 'commander';
import chalk from 'chalk';
import { getAgentForgeDir, loadConfig, InitError } from '@agentforge/shared';
import { createAdapter, ProviderRegistry } from '@agentforge/providers';

export const doctorCommand = new Command('doctor')
  .description('Check health and reachability of all configured providers')
  .action(async () => {
    const agentForgeDir = getAgentForgeDir();

    let config;
    try {
      config = loadConfig(agentForgeDir);
    } catch (err) {
      if (err instanceof InitError) {
        console.error(chalk.red(`✗ ${err.message}`));
        process.exit(1);
      }
      throw err;
    }

    if (config.providers.length === 0) {
      console.log(
        chalk.yellow('No providers configured. Run "agentforge providers add" to add one.')
      );
      return;
    }

    const registry = new ProviderRegistry();
    for (const providerConfig of config.providers) {
      registry.register(createAdapter(providerConfig));
    }

    console.log(chalk.bold('\nAgentForge Doctor\n'));

    const rows: Array<{ id: string; status: string; latency: string; models: string }> = [];

    for (const adapter of registry.listAll()) {
      const start = Date.now();
      let available = false;
      let modelCount = 0;
      let latency = '-';

      try {
        available = await adapter.isAvailable();
        if (available) {
          const models = await adapter.listModels();
          modelCount = models.length;
          latency = `${Date.now() - start}ms`;
        }
      } catch {
        available = false;
      }

      rows.push({
        id: adapter.id,
        status: available ? chalk.green('✓ available') : chalk.red('✗ unavailable'),
        latency,
        models: available ? String(modelCount) : '-',
      });
    }

    const colW = [20, 18, 10, 8];
    const header = [
      'PROVIDER'.padEnd(colW[0]),
      'STATUS'.padEnd(colW[1]),
      'LATENCY'.padEnd(colW[2]),
      'MODELS',
    ].join('  ');
    console.log(chalk.dim(header));
    console.log(chalk.dim('─'.repeat(header.length)));

    for (const row of rows) {
      console.log(
        [
          row.id.padEnd(colW[0]),
          row.status.padEnd(colW[1] + 10), // extra for chalk escape codes
          row.latency.padEnd(colW[2]),
          row.models,
        ].join('  ')
      );
    }

    const anyFailed = rows.some((r) => r.status.includes('unavailable'));
    if (anyFailed) {
      console.log(
        chalk.yellow('\nTip: set the required API key env vars and retry. See .env.example')
      );
      process.exit(1);
    } else {
      console.log(chalk.green('\nAll providers healthy.'));
    }
  });
