export type SteamAppDetails = {
  name: string
  shortDescription: string
  headerImage: string
  isFree: boolean
  isEarlyAccess: boolean
  finalPriceDisplay: string | null
  initialPriceDisplay: string | null
  discountPercent: number
  releaseDate: string | null
  metacriticScore: number | null
  categories: string[]
  genres: string[]
}

export type SteamReviewSummary = {
  totalPositive: number
  totalReviews: number
} | null
