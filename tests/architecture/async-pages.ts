import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const PAGE_FILE = /^page\.(tsx|ts|jsx|js)$/;

/** Every Next.js `page` file under `dir`, as absolute paths. */
export function findPageFiles(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules") continue;
      found.push(...findPageFiles(path));
    } else if (PAGE_FILE.test(entry.name)) {
      found.push(path);
    }
  }
  return found.sort();
}

/** Drops comments and string contents so they can't trigger false matches. */
function stripCommentsAndStrings(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1")
    .replace(/`(?:\\[\s\S]|[^\\`])*`/g, "``")
    .replace(/"(?:\\.|[^\\"\n])*"/g, '""')
    .replace(/'(?:\\.|[^\\'\n])*'/g, "''");
}

const escapeRegExp = (name: string) => name.replace(/[$]/g, "\\$");

/**
 * True when the module's default export is an async function, in any of
 * the forms Next.js accepts:
 *
 *   export default async function Page() {}
 *   export default async () => {}
 *   async function Page() {} … export default Page
 *   const Page = async () => {} … export default Page
 *   export { Page as default }
 */
export function hasAsyncDefaultExport(source: string): boolean {
  const code = stripCommentsAndStrings(source);

  if (/export\s+default\s+async\b/.test(code)) return true;

  const named =
    code.match(/export\s+default\s+([A-Za-z_$][\w$]*)\s*;?\s*$/m)?.[1] ??
    code.match(/export\s*\{[^}]*\b([A-Za-z_$][\w$]*)\s+as\s+default\b/)?.[1];
  if (!named || named === "function" || named === "class") return false;

  const name = escapeRegExp(named);
  return (
    new RegExp(`async\\s+function\\s*\\*?\\s*${name}\\b`).test(code) ||
    new RegExp(
      `(?:const|let|var)\\s+${name}\\b[^=]*=\\s*(?:[\\w$.]+\\s*\\(\\s*)?async\\b`,
    ).test(code)
  );
}

/** Paths (relative to `root`) of page files whose default export is async. */
export function findAsyncPages(appDir: string, root: string): string[] {
  return findPageFiles(appDir)
    .filter((file) => hasAsyncDefaultExport(readFileSync(file, "utf8")))
    .map((file) => relative(root, file));
}
