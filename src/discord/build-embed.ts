import { EmbedBuilder } from 'discord.js'
import type { SteamAppDetails, SteamReviewSummary } from '../steam/types.js'

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

  const tags = [...details.categories, ...details.genres]
  if (tags.length > 0) {
    embed.addFields({ name: 'Catégories', value: tags.join(', '), inline: false })
  }

  return embed
}
