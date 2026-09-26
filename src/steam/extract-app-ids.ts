const STEAM_APP_LINK_PATTERN = /store\.steampowered\.com\/app\/(\d+)(?:\/([^/?\s]+))?/g

export type SteamLink = {
  appId: string
  slug: string | null
}

export const extractSteamLinks = (content: string): SteamLink[] => {
  const links: SteamLink[] = []
  const seenAppIds = new Set<string>()

  for (const match of content.matchAll(STEAM_APP_LINK_PATTERN)) {
    const appId = match[1]
    if (seenAppIds.has(appId)) continue

    seenAppIds.add(appId)
    links.push({ appId, slug: match[2] ?? null })
  }

  return links
}
