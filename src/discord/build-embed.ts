import { EmbedBuilder } from 'discord.js'
import type { SteamAppDetails, SteamReviewSummary } from '../steam/types.js'

const buildPriceDisplay = (details: SteamAppDetails): string => {
  if (details.isFree) return 'Gratuit'
  return details.finalPriceDisplay ?? 'Non disponible'
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
): EmbedBuilder => {
  const embed = new EmbedBuilder()
    .setTitle(details.name)
    .setDescription(details.shortDescription)
    .setImage(details.headerImage)
    .setURL(`https://store.steampowered.com/app/${appId}`)
    .addFields({ name: 'Prix', value: buildPriceDisplay(details), inline: true })

  const ratingDisplay = buildRatingDisplay(reviewSummary)
  if (ratingDisplay) {
    embed.addFields({ name: 'Évaluation', value: ratingDisplay, inline: true })
  }

  const tags = [...details.categories, ...details.genres]
  if (tags.length > 0) {
    embed.addFields({ name: 'Catégories', value: tags.join(', '), inline: false })
  }

  return embed
}
