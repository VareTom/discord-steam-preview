export type SteamAppDetails = {
  name: string
  shortDescription: string
  headerImage: string
  isFree: boolean
  finalPriceDisplay: string | null
  categories: string[]
  genres: string[]
}

export type SteamReviewSummary = {
  totalPositive: number
  totalReviews: number
} | null
