// Deep structural equality. Used by the storage operator to skip a persist
// when a write doesn't actually change the stored value (cheap guard in
// front of the hash table). Recursive but bounded by the input shape;
// Maps/Sets and class instances are compared by reference, which matches
// our usage — only plain JSON-ish values pass through Storage.

export function isEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;

    if (typeof a !== typeof b || a === null || b === null) return false;
    if (typeof a !== 'object') return false;

    if (Array.isArray(a) !== Array.isArray(b)) return false;

    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) return false;
        return a.every((val, i) => isEqual(val, b[i]));
    }

    const aObj = a as Record<string, unknown>;
    const bObj = b as Record<string, unknown>;
    const keysA = Object.keys(aObj);
    const keysB = Object.keys(bObj);

    if (keysA.length !== keysB.length) return false;

    return keysA.every((key) => keysB.includes(key) && isEqual(aObj[key], bObj[key]));
}
