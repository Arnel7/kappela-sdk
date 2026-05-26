export function toWsUrl(httpUrl: string, path: string): string {
  const u = new URL(path, httpUrl)
  u.protocol = httpUrl.startsWith('https') ? 'wss:' : 'ws:'
  return u.href
}
