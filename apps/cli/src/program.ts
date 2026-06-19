import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { doctorCommand } from './commands/doctor.js';
import { providersCommand } from './commands/providers.js';
import { planCommand } from './commands/plan.js';
import { buildCommand } from './commands/build.js';
import { reportCommand } from './commands/report.js';
import { serveCommand } from './commands/serve.js';

export const program = new Command();

program.name('agentforge').version('0.1.0').description('Open-source self-hosted AI software team');

program.addCommand(initCommand);
program.addCommand(doctorCommand);
program.addCommand(providersCommand);
program.addCommand(planCommand);
program.addCommand(buildCommand);
program.addCommand(reportCommand);
program.addCommand(serveCommand);
