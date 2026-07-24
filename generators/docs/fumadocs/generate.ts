import process from 'node:process';

import { generate } from '../index';

try {
    generate();
} catch (error: unknown) {
    const detail = error instanceof Error ? (error.stack ?? error.message) : String(error);
    process.stderr.write(`Fumadocs contents generation failed: ${detail}\n`);
    // Set exitCode instead of process.exit so the event loop drains stderr before the process ends.
    process.exitCode = 1;
}
