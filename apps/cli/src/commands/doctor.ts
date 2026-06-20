import { Command } from 'commander';
import chalk from 'chalk';
import { getRefractIQDir, loadConfig, InitError } from '@refractiq/shared';
import { createAdapter, ProviderRegistry } from '@refractiq/providers';
import type { OllamaAdapter } from '@refractiq/providers';

export const doctorCommand = new Command('doctor')
  .description('Check health and reachability of all configured providers')
  .action(async () => {
    const refractiqDir = getRefractIQDir();

    let config;
    try {
      config = loadConfig(refractiqDir);
    } catch (err) {
      if (err instanceof InitError) {
        console.error(chalk.red(`✗ ${err.message}`));
        process.exit(1);
      }
      throw err;
    }

    // Check Docker availability
    let dockerAvailable = false;
    try {
      const { execSync } = await import('node:child_process');
      execSync('docker info', { stdio: 'pipe', timeout: 5000 });
      dockerAvailable = true;
    } catch {
      dockerAvailable = false;
    }
    console.log(chalk.bold('\nSystem\n'));
    console.log(
      `  Docker: ${dockerAvailable ? chalk.green('✓ available') : chalk.dim('✗ not available (--sandbox flag requires Docker)')}`
    );
    console.log();

    if (config.providers.length === 0) {
      console.log(
        chalk.yellow('No providers configured. Run "refractiq providers add" to add one.')
      );
      return;
    }

    const registry = new ProviderRegistry();
    for (const providerConfig of config.providers) {
      registry.register(createAdapter(providerConfig));
    }

    console.log(chalk.bold('\nRefractIQ Doctor\n'));

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

    // Show Ollama pull status
    for (const adapter of registry.listAll()) {
      if (adapter.id === 'ollama' && 'listPulledModels' in adapter) {
        const ollamaAdapter = adapter as OllamaAdapter;
        const pulled = await ollamaAdapter.listPulledModels();
        if (pulled.length > 0) {
          console.log(chalk.dim(`  Ollama pulled: ${pulled.join(', ')}`));
        } else {
          console.log(chalk.yellow(`  No Ollama models pulled. Run: ollama pull llama3.2`));
        }
      }
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
