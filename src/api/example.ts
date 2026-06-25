/**
 * Example factory — produces frozen `ExampleSpec` values for a node's
 * `examples` array.
 *
 * `NodeSpec.examples` is typed `unknown[]` because its shape is defined per
 * spec major version; `ExampleSpec` is the v1 shape. The docs generator
 * narrows entries via `isExample` before rendering, so stray values are
 * ignored rather than crashing generation.
 */

/** A single documented example: a code snippet with optional framing prose. */
export interface ExampleSpec {
    /** Short heading for the example (e.g. "A fixed-size account"). */
    readonly title?: string;
    /** Prose shown above the snippet. */
    readonly description?: string;
    /** The snippet source. */
    readonly code: string;
    /** Fenced-code language hint; defaults to `ts` at render time. */
    readonly lang?: string;
}

export function example(input: ExampleSpec): ExampleSpec {
    if (input.code.trim() === '') {
        throw new Error('example: `code` must be non-empty');
    }
    return Object.freeze({
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        code: input.code,
        ...(input.lang !== undefined ? { lang: input.lang } : {}),
    });
}

/** Runtime guard narrowing an unknown `examples[]` entry to `ExampleSpec`. */
export function isExample(value: unknown): value is ExampleSpec {
    return typeof value === 'object' && value !== null && typeof (value as { code?: unknown }).code === 'string';
}
