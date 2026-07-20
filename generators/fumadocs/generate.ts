import process from 'node:process';

import { generate } from './index';

generate().catch((error: unknown) => {
    process.stderr.write(`fumadocs generator failed: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
});
