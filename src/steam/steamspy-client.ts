export const fetchTopTags = async (appId: string, limit = 3): Promise<string[]> => {
  try {
    const url = `https://steamspy.com/api.php?request=appdetails&appid=${appId}`
    const response = await fetch(url)

    if (!response.ok) {
      return []
    }

    const payload = await response.json()
    const tags = payload.tags

    if (!tags || Array.isArray(tags)) {
      return []
    }

    return Object.entries(tags as Record<string, number>)
      .sort(([, voteCountA], [, voteCountB]) => voteCountB - voteCountA)
      .slice(0, limit)
      .map(([tagName]) => tagName)
  } catch (error) {
    console.error(`Failed to fetch SteamSpy tags for appId ${appId}:`, error)
    return []
  }
}
