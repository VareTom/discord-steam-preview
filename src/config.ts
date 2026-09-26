import { config as loadEnv } from 'dotenv'
import { z } from 'zod'

loadEnv()

const envSchema = z.object({
  DISCORD_TOKEN: z.string().min(1, 'DISCORD_TOKEN is required'),
  DISCORD_CHANNEL_ID: z.string().min(1, 'DISCORD_CHANNEL_ID is required'),
  DISCORD_ARCHIVE_CHANNEL_ID: z.string().min(1).optional(),
})

export type AppConfig = {
  discordToken: string
  discordChannelId: string
  discordArchiveChannelId: string | null
}

export const loadConfig = (): AppConfig => {
  const parsed = envSchema.safeParse(process.env)

  if (!parsed.success) {
    const messages = parsed.error.issues.map((issue) => issue.message).join(', ')
    throw new Error(`Invalid configuration: ${messages}`)
  }

  return {
    discordToken: parsed.data.DISCORD_TOKEN,
    discordChannelId: parsed.data.DISCORD_CHANNEL_ID,
    discordArchiveChannelId: parsed.data.DISCORD_ARCHIVE_CHANNEL_ID ?? null,
  }
}
