import { Command } from 'commander';
import chalk from 'chalk';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { getRefractIQDir } from '@refractiq/shared';

export const serveCommand = new Command('serve')
  .description('Start the RefractIQ web dashboard API server')
  .option('--port <port>', 'API server port', '3001')
  .option('--dir <dir>', 'Path to .refractiq directory (defaults to current directory)')
  .action((options) => {
    const cwd = process.cwd();
    const refractiqDir = options.dir ? resolve(options.dir) : getRefractIQDir(cwd);

    if (!existsSync(refractiqDir)) {
      console.error(chalk.red(`✗ No .refractiq directory found. Run "refractiq init" first.`));
      process.exit(1);
    }

    // Find the API server entry point
    const apiEntry = join(
      new URL(import.meta.url).pathname.replace(/\/dist\/commands\/serve\.js$/, ''),
      '..',
      '..',
      '..',
      '..',
      'services',
      'api',
      'dist',
      'index.js'
    );

    const resolvedApiEntry = resolve(apiEntry);

    if (!existsSync(resolvedApiEntry)) {
      console.log(chalk.yellow('API server not built yet.'));
      console.log(chalk.dim('Run: pnpm --filter @refractiq/api build'));
      console.log();
      console.log(chalk.bold('Or start the dev server manually:'));
      console.log(chalk.cyan('  pnpm --filter @refractiq/api dev'));
      console.log(chalk.cyan('  pnpm --filter @refractiq/web dev'));
      return;
    }

    console.log(chalk.bold('\nRefractIQ Dashboard\n'));
    console.log(chalk.dim(`API:       `) + chalk.cyan(`http://localhost:${options.port}`));
    console.log(chalk.dim(`Dashboard: `) + chalk.cyan(`http://localhost:3000`));
    console.log(chalk.dim(`Data dir:  `) + chalk.white(refractiqDir));
    console.log();
    console.log(chalk.dim('Start the web dashboard separately:'));
    console.log(chalk.dim('  pnpm --filter @refractiq/web dev'));
    console.log();
    console.log(chalk.dim('Press Ctrl+C to stop\n'));

    const proc = spawn('node', [resolvedApiEntry], {
      env: {
        ...process.env,
        PORT: options.port,
        REFRACTIQ_DIR: refractiqDir,
      },
      stdio: 'inherit',
    });

    proc.on('exit', (code) => {
      if (code !== 0) process.exit(code ?? 1);
    });

    process.on('SIGINT', () => {
      proc.kill('SIGINT');
      process.exit(0);
    });
  });
