import type { SteamAppDetails, SteamReviewSummary } from "./types.js";

const STEAM_LOCALE = { cc: "FR", l: "french" };

export const fetchAppDetails = async (
  appId: string,
): Promise<SteamAppDetails | null> => {
  try {
    const url = `https://store.steampowered.com/api/appdetails?appids=${appId}&cc=${STEAM_LOCALE.cc}&l=${STEAM_LOCALE.l}`;
    const response = await fetch(url);

    if (!response.ok) {
      return null;
    }

    const payload = await response.json();
    const entry = payload[appId] ?? Object.values(payload)[0];

    if (!entry?.success) {
      return null;
    }

    const data = entry.data;
    const genres: { id: string; description: string }[] = data.genres ?? [];
    const EARLY_ACCESS_GENRE_ID = "70";

    return {
      name: data.name,
      shortDescription: data.short_description,
      headerImage: data.header_image,
      isFree: Boolean(data.is_free),
      isEarlyAccess: genres.some((genre) => genre.id === EARLY_ACCESS_GENRE_ID),
      finalPriceDisplay: data.price_overview?.final_formatted ?? null,
      initialPriceDisplay: data.price_overview?.initial_formatted || null,
      discountPercent: data.price_overview?.discount_percent ?? 0,
      releaseDate: data.release_date?.date || null,
      metacriticScore: data.metacritic?.score ?? null,
      categories: (data.categories ?? []).map(
        (category: { description: string }) => category.description,
      ),
      genres: genres.map((genre) => genre.description),
    };
  } catch (error) {
    console.error(`Failed to fetch app details for appId ${appId}:`, error);
    return null;
  }
};

export const searchAppIdByTerm = async (
  term: string,
): Promise<string | null> => {
  try {
    const url = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(term)}&cc=${STEAM_LOCALE.cc}&l=${STEAM_LOCALE.l}`;
    const response = await fetch(url);

    if (!response.ok) {
      return null;
    }

    const payload = await response.json();
    const firstResult = payload.items?.[0];

    if (!firstResult) {
      return null;
    }

    return String(firstResult.id);
  } catch (error) {
    console.error(`Failed to search steam store for term "${term}":`, error);
    return null;
  }
};

export const fetchAppReviewSummary = async (
  appId: string,
): Promise<SteamReviewSummary> => {
  try {
    const url = `https://store.steampowered.com/appreviews/${appId}?json=1`;
    const response = await fetch(url);

    if (!response.ok) {
      return null;
    }

    const payload = await response.json();
    const totalReviews = payload.query_summary?.total_reviews ?? 0;

    if (totalReviews === 0) {
      return null;
    }

    return {
      totalPositive: payload.query_summary.total_positive,
      totalReviews,
    };
  } catch (error) {
    console.error(`Failed to fetch review summary for appId ${appId}:`, error);
    return null;
  }
};
