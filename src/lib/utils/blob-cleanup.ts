import { del } from "@vercel/blob";

/**
 * Deletes stored files (Vercel Blob URLs) once their database rows are gone,
 * so images of a client's property don't outlive the site map or client they
 * belonged to. Best-effort: a storage failure is logged and never undoes or
 * fails the delete the user asked for.
 */
export async function deleteBlobsQuietly(
  urls: readonly (string | null | undefined)[],
): Promise<void> {
  const targets: string[] = [];
  for (const url of new Set(urls)) {
    if (url) targets.push(url);
  }
  if (targets.length === 0) return;

  try {
    await del(targets);
  } catch (error) {
    console.error(`Failed to delete ${targets.length} stored file(s):`, error);
  }
}
