import sanitizeHtml from 'sanitize-html';
import type { NextFunction, Request, Response } from 'express';

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [],
  allowedAttributes: {},
  disallowedTagsMode: 'recursiveEscape',
};

/**
 * Recursively strip **all** HTML / script tags from every string value in an object.
 * Non-string primitives and arrays are traversed; other objects are shallow-cloned.
 */
function deepSanitize(value: unknown): unknown {
  if (typeof value === 'string') {
    return sanitizeHtml(value, SANITIZE_OPTIONS);
  }
  if (Array.isArray(value)) {
    return value.map(deepSanitize);
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = deepSanitize(v);
    }
    return out;
  }
  return value;
}

/**
 * Express middleware — sanitizes `req.body`, `req.query`, and `req.params`
 * by stripping all HTML and script tags from every string field.
 * Must be mounted **before** Zod validation runs.
 */
export function inputSanitizer(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === 'object') {
    req.body = deepSanitize(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = deepSanitize(req.query) as typeof req.query;
  }
  if (req.params && typeof req.params === 'object') {
    req.params = deepSanitize(req.params) as typeof req.params;
  }
  next();
}
