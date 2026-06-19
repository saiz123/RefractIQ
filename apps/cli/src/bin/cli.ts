#!/usr/bin/env node
import 'dotenv/config';
import { program } from '../program.js';

await program.parseAsync(process.argv);
