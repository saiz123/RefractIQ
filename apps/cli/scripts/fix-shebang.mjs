// Post-build script: prepend #!/usr/bin/env node to dist/bin/cli.js
// TypeScript strips shebangs during compilation, so we re-add it here.
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const cliPath = join(__dirname, '..', 'dist', 'bin', 'cli.js');

const content = readFileSync(cliPath, 'utf8');
const shebang = '#!/usr/bin/env node\n';

if (!content.startsWith(shebang)) {
  writeFileSync(cliPath, shebang + content, 'utf8');
  console.log('Shebang prepended to dist/bin/cli.js');
}
