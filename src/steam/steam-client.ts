import type { SteamAppDetails, SteamReviewSummary } from './types.js'

const STEAM_LOCALE = { cc: 'FR', l: 'french' }

export const fetchAppDetails = async (appId: string): Promise<SteamAppDetails | null> => {
  try {
    const url = `https://store.steampowered.com/api/appdetails?appids=${appId}&cc=${STEAM_LOCALE.cc}&l=${STEAM_LOCALE.l}`
    const response = await fetch(url)

    if (!response.ok) {
      return null
    }

    const payload = await response.json()
    const entry = payload[appId] ?? Object.values(payload)[0]

    if (!entry?.success) {
      return null
    }

    const data = entry.data

    return {
      name: data.name,
      shortDescription: data.short_description,
      headerImage: data.header_image,
      isFree: Boolean(data.is_free),
      finalPriceDisplay: data.price_overview?.final_formatted ?? null,
      categories: (data.categories ?? []).map((category: { description: string }) => category.description),
      genres: (data.genres ?? []).map((genre: { description: string }) => genre.description),
    }
  } catch (error) {
    console.error(`Failed to fetch app details for appId ${appId}:`, error)
    return null
  }
}

export const searchAppIdByTerm = async (term: string): Promise<string | null> => {
  try {
    const url = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(term)}&cc=${STEAM_LOCALE.cc}&l=${STEAM_LOCALE.l}`
    const response = await fetch(url)

    if (!response.ok) {
      return null
    }

    const payload = await response.json()
    const firstResult = payload.items?.[0]

    if (!firstResult) {
      return null
    }

    return String(firstResult.id)
  } catch (error) {
    console.error(`Failed to search steam store for term "${term}":`, error)
    return null
  }
}

export const fetchAppReviewSummary = async (appId: string): Promise<SteamReviewSummary> => {
  try {
    const url = `https://store.steampowered.com/appreviews/${appId}?json=1`
    const response = await fetch(url)

    if (!response.ok) {
      return null
    }

    const payload = await response.json()
    const totalReviews = payload.query_summary?.total_reviews ?? 0

    if (totalReviews === 0) {
      return null
    }

    return {
      totalPositive: payload.query_summary.total_positive,
      totalReviews,
    }
  } catch (error) {
    console.error(`Failed to fetch review summary for appId ${appId}:`, error)
    return null
  }
}
