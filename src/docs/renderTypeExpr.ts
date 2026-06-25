/**
 * Render a `TypeExpr` to a markdown fragment for docs tables (e.g.
 * `` `Array<` ``…`` `>` ``, `` `u64` ``, `` `"accountNode"` ``).
 *
 * Node/union/enumeration references render in PascalCase. When a
 * `DocLinkResolver` is supplied and returns an href, the reference becomes a
 * markdown link (matching the cross-linked style of the canonical docs);
 * otherwise it renders as a plain code span.
 */

import type { TypeExpr } from '../api';

/** Resolve a spec reference to an href, or `null` to render it un-linked. */
export type DocLinkResolver = (ref: {
    readonly kind: 'enumeration' | 'node' | 'union';
    readonly name: string;
}) => string | null;

/** `accountNode` → `AccountNode`. */
export function pascal(name: string): string {
    return name.length === 0 ? name : name[0].toUpperCase() + name.slice(1);
}

function code(text: string): string {
    return `\`${text}\``;
}

function ref(kind: 'enumeration' | 'node' | 'union', name: string, link?: DocLinkResolver): string {
    const label = pascal(name);
    const href = link?.({ kind, name });
    return href ? `[${code(label)}](${href})` : code(label);
}

export function renderTypeExpr(type: TypeExpr, link?: DocLinkResolver): string {
    switch (type.kind) {
        case 'address':
            return code('Address');
        case 'anyNode':
            return code('Node');
        case 'array':
            return `${renderTypeExpr(type.of, link)}${code('[]')}`;
        case 'boolean':
            return code('boolean');
        case 'codamaVersion':
            return code('CodamaVersion');
        case 'docs':
            return code('string[]');
        case 'enumeration':
            return ref('enumeration', type.name, link);
        case 'float':
            return code(type.width);
        case 'integer':
            return code(type.width);
        case 'literal':
            return code(JSON.stringify(type.value));
        case 'literalUnion':
            return type.values.map(v => code(JSON.stringify(v))).join(' | ');
        case 'nestedUnion':
            return `${code(`${pascal(type.alias)}<`)}${ref('node', type.name, link)}${code('>')}`;
        case 'node':
            return ref('node', type.name, link);
        case 'string':
            return code(
                type.constraint === 'identifier'
                    ? 'CamelCaseString'
                    : type.constraint === 'version'
                      ? 'VersionString'
                      : 'string',
            );
        case 'tuple':
            return `${code('[')}${type.items.map(t => renderTypeExpr(t, link)).join(', ')}${code(']')}`;
        case 'union':
            return ref('union', type.name, link);
    }
}
