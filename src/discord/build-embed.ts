import { EmbedBuilder } from 'discord.js'
import type { SteamAppDetails, SteamReviewSummary } from '../steam/types.js'

const RELEVANT_CATEGORIES = new Set([
  'Solo',
  'Multijoueur',
  'Coopération en ligne',
  'MMO',
  'Succès Steam',
  'Classements',
])

const EARLY_ACCESS_GENRE = 'Accès anticipé'

const buildPriceDisplay = (details: SteamAppDetails): string => {
  if (details.isFree) return 'Gratuit'
  if (!details.finalPriceDisplay) return 'Non disponible'

  if (details.discountPercent > 0 && details.initialPriceDisplay) {
    return `~~${details.initialPriceDisplay}~~ ${details.finalPriceDisplay} (-${details.discountPercent}%)`
  }

  return details.finalPriceDisplay
}

const buildRatingDisplay = (reviewSummary: SteamReviewSummary): string | null => {
  if (!reviewSummary) return null
  const percentage = Math.round((reviewSummary.totalPositive / reviewSummary.totalReviews) * 100)
  return `${percentage}% positif (${reviewSummary.totalReviews} avis)`
}

export const buildSteamEmbed = (
  appId: string,
  details: SteamAppDetails,
  reviewSummary: SteamReviewSummary,
  steamTags: string[] = [],
): EmbedBuilder => {
  const embed = new EmbedBuilder()
    .setTitle(details.name)
    .setDescription(details.shortDescription)
    .setImage(details.headerImage)
    .setURL(`https://store.steampowered.com/app/${appId}`)
    .addFields({ name: 'Prix', value: buildPriceDisplay(details), inline: true })

  if (details.isEarlyAccess) {
    embed.addFields({ name: 'Statut', value: '🚧 Accès anticipé', inline: true })
  }

  const ratingDisplay = buildRatingDisplay(reviewSummary)
  if (ratingDisplay) {
    embed.addFields({ name: 'Évaluation', value: ratingDisplay, inline: true })
  }

  if (details.metacriticScore !== null) {
    embed.addFields({ name: 'Metacritic', value: `${details.metacriticScore}/100`, inline: true })
  }

  if (details.releaseDate) {
    embed.addFields({ name: 'Sortie', value: details.releaseDate, inline: true })
  }

  const MAX_TAGS_DISPLAYED = 6
  const relevantCategories = details.categories.filter((category) => RELEVANT_CATEGORIES.has(category))
  const relevantGenres = details.genres.filter((genre) => genre !== EARLY_ACCESS_GENRE)
  const tags = [...relevantCategories, ...relevantGenres].slice(0, MAX_TAGS_DISPLAYED)
  if (tags.length > 0) {
    embed.addFields({ name: 'Catégories', value: tags.join(', '), inline: false })
  }

  if (steamTags.length > 0) {
    embed.addFields({ name: 'Tags', value: steamTags.join(', '), inline: false })
  }

  return embed
}
