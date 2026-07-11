export type LocationQueryPrimitive = string | number | boolean | null | undefined;
export type LocationQueryValue = LocationQueryPrimitive | readonly LocationQueryPrimitive[];
export type LocationQueryRaw = Readonly<Record<string, LocationQueryValue>>;
export type LocationQuery = Readonly<Record<string, string | null | readonly (string | null)[]>>;

export function parseQuery(search: string): LocationQuery {
  const query: Record<string, string | null | Array<string | null>> = Object.create(null);
  const source = search.startsWith('?') ? search.slice(1) : search;
  if (!source) return Object.freeze(query);

  for (const entry of source.split('&')) {
    if (!entry) continue;
    const separator = entry.indexOf('=');
    const rawKey = separator < 0 ? entry : entry.slice(0, separator);
    const rawValue = separator < 0 ? null : entry.slice(separator + 1);
    const key = decodeQuery(rawKey);
    const value = rawValue === null ? null : decodeQuery(rawValue);
    const current = query[key];
    if (current === undefined) query[key] = value;
    else if (Array.isArray(current)) current.push(value);
    else query[key] = [current, value];
  }

  const normalized: Record<string, string | null | readonly (string | null)[]> = Object.create(null);
  for (const [key, value] of Object.entries(query)) {
    normalized[key] = Array.isArray(value) ? Object.freeze([...value]) : value;
  }
  return Object.freeze({ ...normalized });
}

export function stringifyQuery(query: LocationQueryRaw = {}): string {
  const entries: string[] = [];
  for (const key of Object.keys(query).sort()) {
    const value = query[key];
    const values = Array.isArray(value) ? value : [value];
    for (const item of values) {
      if (item === undefined) continue;
      const encodedKey = encodeQuery(String(key));
      entries.push(item === null
        ? encodedKey
        : `${encodedKey}=${encodeQuery(String(item))}`);
    }
  }
  return entries.length > 0 ? `?${entries.join('&')}` : '';
}

function encodeQuery(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (character) => (
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`
  ));
}

function decodeQuery(value: string): string {
  try {
    return decodeURIComponent(value.replace(/\+/g, ' '));
  } catch {
    return value;
  }
}
