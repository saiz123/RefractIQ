import { Command } from 'commander';
import chalk from 'chalk';
import { select, input } from '@inquirer/prompts';
import { getRefractIQDir, loadConfig, saveConfig, InitError } from '@refractiq/shared';
import type { ProviderConfig } from '@refractiq/providers';

const providersAddCommand = new Command('add')
  .description('Add an AI provider')
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

    console.log(chalk.bold('\nAdd AI Provider\n'));

    const type = (await select({
      message: 'Provider type:',
      choices: [
        { name: 'Anthropic (Claude)', value: 'anthropic' },
        { name: 'OpenAI (GPT / o-series)', value: 'openai' },
        { name: 'Google Gemini', value: 'gemini' },
        { name: 'Ollama (local)', value: 'ollama' },
        { name: 'OpenRouter (multi-provider gateway)', value: 'openrouter' },
      ],
    })) as ProviderConfig['type'];

    const name = await input({
      message: 'Display name:',
      default: type,
    });

    let endpoint: string | undefined;
    if (type === 'openai' || type === 'ollama' || type === 'openrouter') {
      const defaultEndpoint = type === 'ollama' ? 'http://localhost:11434' : '';
      const endpointInput = await input({
        message: `Custom endpoint URL (leave blank for default${defaultEndpoint ? ` "${defaultEndpoint}"` : ''}):`,
        default: defaultEndpoint || undefined,
      });
      endpoint = endpointInput || undefined;
    }

    const newProvider: ProviderConfig = { id: type, type, name, ...(endpoint ? { endpoint } : {}) };

    const existing = config.providers.find((p) => p.id === type);
    if (existing) {
      console.log(chalk.yellow(`\nProvider "${type}" already registered. Updating it.`));
      config.providers = config.providers.map((p) => (p.id === type ? newProvider : p));
    } else {
      config.providers.push(newProvider);
    }

    saveConfig(refractiqDir, config);

    const envVarMap: Record<string, string> = {
      anthropic: 'ANTHROPIC_API_KEY',
      openai: 'OPENAI_API_KEY',
      gemini: 'GEMINI_API_KEY',
      ollama: '',
      openrouter: 'OPENROUTER_API_KEY',
    };

    console.log(chalk.green(`\n✓ Provider "${name}" saved to ${refractiqDir}/config.json`));

    const envVar = envVarMap[type];
    if (envVar) {
      console.log(chalk.bold(`\nNext: set your API key in .env or your shell:`));
      console.log(chalk.cyan(`  ${envVar}=your-key-here`));
    } else {
      console.log(
        chalk.dim(
          `\nOllama needs no API key — just make sure Ollama is running at ${endpoint ?? 'http://localhost:11434'}`
        )
      );
    }

    console.log(chalk.dim('\nRun "refractiq doctor" to verify connectivity.'));
  });

const providersListCommand = new Command('list')
  .description('List configured AI providers')
  .action(() => {
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

    if (config.providers.length === 0) {
      console.log(
        chalk.yellow('No providers configured. Run "refractiq providers add" to add one.')
      );
      return;
    }

    const colW = [16, 14, 40];
    const header = ['ID'.padEnd(colW[0]), 'TYPE'.padEnd(colW[1]), 'ENDPOINT'].join('  ');
    console.log(chalk.bold('\nConfigured Providers\n'));
    console.log(chalk.dim(header));
    console.log(chalk.dim('─'.repeat(header.length)));

    for (const p of config.providers) {
      console.log(
        [
          p.id.padEnd(colW[0]),
          p.type.padEnd(colW[1]),
          (p.endpoint ?? chalk.dim('(default)')).padEnd(colW[2]),
        ].join('  ')
      );
    }
  });

export const providersCommand = new Command('providers')
  .description('Manage AI providers')
  .addCommand(providersAddCommand)
  .addCommand(providersListCommand);
