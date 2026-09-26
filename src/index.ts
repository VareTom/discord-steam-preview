import { Client, GatewayIntentBits, type Message } from 'discord.js'
import { loadConfig } from './config.js'
import { buildSteamEmbed } from './discord/build-embed.js'
import { extractSteamLinks, type SteamLink } from './steam/extract-app-ids.js'
import { fetchAppDetails, fetchAppReviewSummary, searchAppIdByTerm } from './steam/steam-client.js'
import { fetchTopTags } from './steam/steamspy-client.js'
import type { SteamAppDetails } from './steam/types.js'

const config = loadConfig()

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
})

const slugToSearchTerm = (slug: string): string => slug.replace(/[_-]+/g, ' ').trim()

type ResolvedApp = {
  appId: string
  details: SteamAppDetails
}

const resolveAppDetails = async (link: SteamLink): Promise<ResolvedApp | null> => {
  const details = await fetchAppDetails(link.appId)
  if (details) return { appId: link.appId, details }

  if (!link.slug) return null

  console.log(`No direct match for appId ${link.appId}, falling back to search with slug "${link.slug}"`)
  const searchTerm = slugToSearchTerm(link.slug)
  const fallbackAppId = await searchAppIdByTerm(searchTerm)

  if (!fallbackAppId) {
    console.log(`Fallback search found nothing for term "${searchTerm}"`)
    return null
  }

  console.log(`Fallback search resolved appId ${link.appId} -> ${fallbackAppId}`)
  const fallbackDetails = await fetchAppDetails(fallbackAppId)
  if (!fallbackDetails) return null

  return { appId: fallbackAppId, details: fallbackDetails }
}

const postToArchiveChannel = async (embed: ReturnType<typeof buildSteamEmbed>): Promise<void> => {
  if (!config.discordArchiveChannelId) return

  try {
    const archiveChannel = await client.channels.fetch(config.discordArchiveChannelId)
    if (!archiveChannel?.isSendable()) {
      console.error(`Archive channel ${config.discordArchiveChannelId} does not support sending messages`)
      return
    }

    await archiveChannel.send({ embeds: [embed] })
  } catch (error) {
    console.error(`Failed to post to archive channel ${config.discordArchiveChannelId}:`, error)
  }
}

const postSteamPreview = async (message: Message, link: SteamLink): Promise<boolean> => {
  console.log(`Fetching Steam details for appId ${link.appId}`)

  const resolved = await resolveAppDetails(link)
  if (!resolved) {
    console.log(`No Steam data found for appId ${link.appId}, skipping`)
    return false
  }

  if (!message.channel.isSendable()) {
    console.error(`Channel ${message.channelId} does not support sending messages`)
    return false
  }

  const { appId, details } = resolved
  const [reviewSummary, steamTags] = await Promise.all([
    fetchAppReviewSummary(appId),
    fetchTopTags(appId),
  ])
  const embed = buildSteamEmbed(appId, details, reviewSummary, steamTags)

  await message.channel.send({ embeds: [embed] })
  console.log(`Posted preview for "${details.name}" (appId ${appId})`)

  await postToArchiveChannel(embed)

  return true
}

const deleteSourceMessage = async (message: Message): Promise<void> => {
  try {
    await message.delete()
  } catch (error) {
    console.error(`Failed to delete source message ${message.id}:`, error)
  }
}

client.on('messageCreate', (message) => {
  if (message.channelId !== config.discordChannelId) return
  if (message.author.bot) return

  const links = extractSteamLinks(message.content)
  if (links.length === 0) return

  console.log(`Found ${links.length} Steam link(s) in message from ${message.author.tag}`)

  Promise.allSettled(
    links.map((link) =>
      postSteamPreview(message, link).catch((error) => {
        console.error(`Failed to handle appId ${link.appId}:`, error)
        return false
      }),
    ),
  ).then((results) => {
    const atLeastOnePosted = results.some((result) => result.status === 'fulfilled' && result.value)
    if (atLeastOnePosted) {
      return deleteSourceMessage(message)
    }
  })
})

client.once('ready', (readyClient) => {
  console.log(`Logged in as ${readyClient.user.tag}`)
})

client.login(config.discordToken)
