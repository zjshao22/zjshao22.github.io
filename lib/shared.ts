export const appName = "人工智能课程";
export const docsRoute = "/docs";

export function shortHash(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i++)
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  return Math.abs(hash).toString(36).slice(0, 8);
}
