# Discord Steam Preview Bot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Node.js/TypeScript Discord bot that watches a channel for Steam store links and replies with an embed showing the game's image, name, description, price, review score, and categories.

**Architecture:** Single long-running Node.js process using discord.js (Gateway connection, no framework). Pure functions for link extraction and embed building are unit-tested in isolation; the Steam HTTP client and the discord.js wiring are integration glue with no dedicated automated tests (network/Gateway boundaries).

**Tech Stack:** TypeScript, discord.js v14, zod (env validation), dotenv, vitest (tests), tsx (dev runtime), native `fetch` (Node 18+ has it built in — no HTTP client dependency needed).

**Spec:** `docs/superpowers/specs/2026-09-26-discord-steam-preview-design.md`

## Global Constraints

- No framework (no NestJS) — plain TypeScript, per spec.
- Config via environment variables only: `DISCORD_TOKEN`, `DISCORD_CHANNEL_ID`. Validated with Zod at startup; process exits with a clear error if missing.
- Steam API locale fixed to `cc=FR&l=french`.
- No cache layer.
- No visible Discord error messages on failure — errors are logged server-side only (`console.error`) and the bot otherwise stays silent for that link.
- One embed per valid Steam appID found in a message; multiple links → multiple embeds.
- Kebab-case file names (per user's global TypeScript conventions).
- Use `const` arrow functions, not the `function` keyword, for all functions.

## Review Focus

- Message containing a Steam link with extra query params or a trailing slash (e.g. `.../app/730/CounterStrike2/?curator_clanid=1`) — appID must still be extracted correctly.
- Message containing the same appID twice (copy-pasted link twice, or link + widget URL) — must produce exactly one embed, not two.
- Game with `is_free: true` — price field must read "Gratuit", not crash on a missing `price_overview`.
- Game where `appreviews` call fails or returns no reviews (e.g. brand-new title with zero reviews) — embed must still post, just without the rating field.
- Message with a non-Steam link or plain text and no Steam link at all — bot must not reply or throw.

---

## File Structure

```
package.json
tsconfig.json
vitest.config.ts
.env.example
.gitignore
src/
  config.ts                     # env parsing + Zod validation
  index.ts                      # bootstrap: discord.js client, messageCreate listener
  steam/
    extract-app-ids.ts          # message content -> unique appId[]
    extract-app-ids.test.ts
    steam-client.ts             # fetchAppDetails, fetchAppReviewSummary
    steam-client.test.ts
    types.ts                    # SteamAppDetails, SteamReviewSummary types
  discord/
    build-embed.ts              # SteamAppDetails + review summary -> EmbedBuilder
    build-embed.test.ts
```

### Task File Layout

- Task 1: project scaffolding (package.json, tsconfig, vitest config, .env.example, .gitignore)
- Task 2: config.ts (env validation)
- Task 3: steam/extract-app-ids.ts + tests
- Task 4: steam/types.ts + steam/steam-client.ts + tests (mocked fetch)
- Task 5: discord/build-embed.ts + tests
- Task 6: src/index.ts — wire everything together

---

### Task 1: Project scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `.env.example`
- Create: `.gitignore`

**Interfaces:**
- Produces: npm scripts `dev`, `build`, `start`, `test` that later tasks and the final bot rely on.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "discord-steam-preview",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/index.js",
    "test": "vitest run"
  },
  "dependencies": {
    "discord.js": "^14.16.3",
    "dotenv": "^16.4.5",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/node": "^20.14.0",
    "tsx": "^4.19.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create `vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
  },
})
```

- [ ] **Step 4: Create `.env.example`**

```
DISCORD_TOKEN=
DISCORD_CHANNEL_ID=
```

- [ ] **Step 5: Create `.gitignore`**

```
node_modules
dist
.env
```

- [ ] **Step 6: Install dependencies**

Run: `npm install`
Expected: `node_modules` created, `package-lock.json` created, no errors.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json tsconfig.json vitest.config.ts .env.example .gitignore
git commit -m "chore: scaffold discord-steam-preview project"
```

---

### Task 2: Config module

**Files:**
- Create: `src/config.ts`

**Interfaces:**
- Produces: `loadConfig(): { discordToken: string; discordChannelId: string }` — throws with a readable message if env vars are missing/invalid. Task 6 (`index.ts`) calls this at startup.

- [ ] **Step 1: Write `src/config.ts`**

```typescript
import { config as loadEnv } from 'dotenv'
import { z } from 'zod'

loadEnv()

const envSchema = z.object({
  DISCORD_TOKEN: z.string().min(1, 'DISCORD_TOKEN is required'),
  DISCORD_CHANNEL_ID: z.string().min(1, 'DISCORD_CHANNEL_ID is required'),
})

export type AppConfig = {
  discordToken: string
  discordChannelId: string
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
  }
}
```

There is no dedicated test file for this task: it is a thin wrapper around `process.env` and Zod, both already well-tested by their own suites, and it will be exercised implicitly by Task 6's manual run-through.

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/config.ts
git commit -m "feat: add env config loader with zod validation"
```

---

### Task 3: Extract Steam app IDs from message content

**Files:**
- Create: `src/steam/extract-app-ids.ts`
- Test: `src/steam/extract-app-ids.test.ts`

**Interfaces:**
- Produces: `extractAppIds(content: string): string[]` — returns unique appIDs in order of first appearance. Task 6 calls this on every incoming message.

- [ ] **Step 1: Write the failing tests**

```typescript
import { describe, expect, it } from 'vitest'
import { extractAppIds } from './extract-app-ids.js'

describe('extractAppIds', () => {
  it('should return the appId when the message contains a single steam link', () => {
    const content = 'check this out https://store.steampowered.com/app/730/CounterStrike_2/'
    expect(extractAppIds(content)).toEqual(['730'])
  })

  it('should return multiple appIds when the message contains several distinct links', () => {
    const content = [
      'https://store.steampowered.com/app/730/CounterStrike_2/',
      'https://store.steampowered.com/app/570/Dota_2/',
    ].join(' ')
    expect(extractAppIds(content)).toEqual(['730', '570'])
  })

  it('should deduplicate the same appId when it appears twice in the message', () => {
    const content = [
      'https://store.steampowered.com/app/730/CounterStrike_2/',
      'https://store.steampowered.com/app/730/CounterStrike_2/?curator_clanid=1',
    ].join(' ')
    expect(extractAppIds(content)).toEqual(['730'])
  })

  it('should extract the appId when the link has query params and no trailing name segment', () => {
    const content = 'https://store.steampowered.com/app/730?snr=1_7_7_230_150_1'
    expect(extractAppIds(content)).toEqual(['730'])
  })

  it('should return an empty array when the message has no steam link', () => {
    const content = 'just chatting about lunch, no links here https://example.com/app/730'
    expect(extractAppIds(content)).toEqual([])
  })

  it('should return an empty array when the message is empty', () => {
    expect(extractAppIds('')).toEqual([])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/steam/extract-app-ids.test.ts`
Expected: FAIL — `extract-app-ids.ts` does not exist yet.

- [ ] **Step 3: Write the implementation**

```typescript
const STEAM_APP_LINK_PATTERN = /store\.steampowered\.com\/app\/(\d+)/g

export const extractAppIds = (content: string): string[] => {
  const appIds: string[] = []

  for (const match of content.matchAll(STEAM_APP_LINK_PATTERN)) {
    const appId = match[1]
    if (!appIds.includes(appId)) {
      appIds.push(appId)
    }
  }

  return appIds
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/steam/extract-app-ids.test.ts`
Expected: PASS, all 6 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/steam/extract-app-ids.ts src/steam/extract-app-ids.test.ts
git commit -m "feat: extract steam appIds from message content"
```

---

### Task 4: Steam API client

**Files:**
- Create: `src/steam/types.ts`
- Create: `src/steam/steam-client.ts`
- Test: `src/steam/steam-client.test.ts`

**Interfaces:**
- Consumes: global `fetch` (Node 18+ built-in), mocked in tests via `vi.stubGlobal('fetch', ...)`.
- Produces:
  - `type SteamAppDetails = { name: string; shortDescription: string; headerImage: string; isFree: boolean; finalPriceDisplay: string | null; categories: string[]; genres: string[] }`
  - `type SteamReviewSummary = { totalPositive: number; totalReviews: number } | null`
  - `fetchAppDetails(appId: string): Promise<SteamAppDetails | null>` — returns `null` if the API reports `success: false` or the response is malformed.
  - `fetchAppReviewSummary(appId: string): Promise<SteamReviewSummary>` — returns `null` on any failure (best-effort).
  Task 5 (`build-embed.ts`) and Task 6 (`index.ts`) consume these exact shapes.

- [ ] **Step 1: Write `src/steam/types.ts`**

```typescript
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
```

- [ ] **Step 2: Write the failing tests**

```typescript
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchAppDetails, fetchAppReviewSummary } from './steam-client.js'

afterEach(() => {
  vi.unstubAllGlobals()
})

const appDetailsResponse = (overrides: Record<string, unknown> = {}) => ({
  '730': {
    success: true,
    data: {
      name: 'Counter-Strike 2',
      short_description: 'A tactical shooter.',
      header_image: 'https://cdn.example.com/730/header.jpg',
      is_free: false,
      price_overview: { final_formatted: '0,00€' },
      categories: [{ description: 'Multi-joueur' }],
      genres: [{ description: 'Action' }],
      ...overrides,
    },
  },
})

describe('fetchAppDetails', () => {
  it('should return mapped app details when the API call succeeds', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => appDetailsResponse(),
      }),
    )

    const result = await fetchAppDetails('730')

    expect(result).toEqual({
      name: 'Counter-Strike 2',
      shortDescription: 'A tactical shooter.',
      headerImage: 'https://cdn.example.com/730/header.jpg',
      isFree: false,
      finalPriceDisplay: '0,00€',
      categories: ['Multi-joueur'],
      genres: ['Action'],
    })
  })

  it('should return null finalPriceDisplay when the game is free and has no price_overview', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () =>
          appDetailsResponse({ is_free: true, price_overview: undefined }),
      }),
    )

    const result = await fetchAppDetails('730')

    expect(result?.isFree).toBe(true)
    expect(result?.finalPriceDisplay).toBeNull()
  })

  it('should return null when the API reports success false', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ '999999': { success: false } }),
      }),
    )

    const result = await fetchAppDetails('999999')

    expect(result).toBeNull()
  })

  it('should return null when the fetch call throws', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('network down')),
    )

    const result = await fetchAppDetails('730')

    expect(result).toBeNull()
  })
})

describe('fetchAppReviewSummary', () => {
  it('should return totals when the API call succeeds', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: 1,
          query_summary: { total_positive: 9200, total_reviews: 10000 },
        }),
      }),
    )

    const result = await fetchAppReviewSummary('730')

    expect(result).toEqual({ totalPositive: 9200, totalReviews: 10000 })
  })

  it('should return null when there are no reviews yet', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: 1,
          query_summary: { total_positive: 0, total_reviews: 0 },
        }),
      }),
    )

    const result = await fetchAppReviewSummary('730')

    expect(result).toBeNull()
  })

  it('should return null when the fetch call throws', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('network down')),
    )

    const result = await fetchAppReviewSummary('730')

    expect(result).toBeNull()
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run src/steam/steam-client.test.ts`
Expected: FAIL — `steam-client.ts` does not exist yet.

- [ ] **Step 4: Write the implementation**

```typescript
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
    const entry = payload[appId]

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
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/steam/steam-client.test.ts`
Expected: PASS, all 7 tests green.

- [ ] **Step 6: Commit**

```bash
git add src/steam/types.ts src/steam/steam-client.ts src/steam/steam-client.test.ts
git commit -m "feat: add steam api client for app details and reviews"
```

---

### Task 5: Build Discord embed

**Files:**
- Create: `src/discord/build-embed.ts`
- Test: `src/discord/build-embed.test.ts`

**Interfaces:**
- Consumes: `SteamAppDetails` and `SteamReviewSummary` from `src/steam/types.ts` (Task 4).
- Produces: `buildSteamEmbed(appId: string, details: SteamAppDetails, reviewSummary: SteamReviewSummary): EmbedBuilder`. Task 6 calls this to build the payload for `message.reply`.

- [ ] **Step 1: Write the failing tests**

```typescript
import { describe, expect, it } from 'vitest'
import type { SteamAppDetails } from '../steam/types.js'
import { buildSteamEmbed } from './build-embed.js'

const baseDetails: SteamAppDetails = {
  name: 'Counter-Strike 2',
  shortDescription: 'A tactical shooter.',
  headerImage: 'https://cdn.example.com/730/header.jpg',
  isFree: false,
  finalPriceDisplay: '0,00€',
  categories: ['Multi-joueur', 'Coop'],
  genres: ['Action'],
}

describe('buildSteamEmbed', () => {
  it('should set title, image, description, price and categories when all data is present', () => {
    const embed = buildSteamEmbed('730', baseDetails, { totalPositive: 9200, totalReviews: 10000 })
    const data = embed.data

    expect(data.title).toBe('Counter-Strike 2')
    expect(data.description).toBe('A tactical shooter.')
    expect(data.image?.url).toBe('https://cdn.example.com/730/header.jpg')
    expect(data.url).toBe('https://store.steampowered.com/app/730')
    expect(data.fields).toContainEqual({ name: 'Prix', value: '0,00€', inline: true })
    expect(data.fields).toContainEqual({ name: 'Évaluation', value: '92% positif (10000 avis)', inline: true })
    expect(data.fields).toContainEqual({ name: 'Catégories', value: 'Multi-joueur, Coop, Action', inline: false })
  })

  it('should show Gratuit as the price when the game is free', () => {
    const embed = buildSteamEmbed('730', { ...baseDetails, isFree: true, finalPriceDisplay: null }, null)
    const data = embed.data

    expect(data.fields).toContainEqual({ name: 'Prix', value: 'Gratuit', inline: true })
  })

  it('should show Non disponible as the price when there is no price and the game is not free', () => {
    const embed = buildSteamEmbed('730', { ...baseDetails, isFree: false, finalPriceDisplay: null }, null)
    const data = embed.data

    expect(data.fields).toContainEqual({ name: 'Prix', value: 'Non disponible', inline: true })
  })

  it('should omit the rating field when there is no review summary', () => {
    const embed = buildSteamEmbed('730', baseDetails, null)
    const data = embed.data

    expect(data.fields?.some((field) => field.name === 'Évaluation')).toBe(false)
  })

  it('should omit the categories field when there are no categories or genres', () => {
    const embed = buildSteamEmbed('730', { ...baseDetails, categories: [], genres: [] }, null)
    const data = embed.data

    expect(data.fields?.some((field) => field.name === 'Catégories')).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/discord/build-embed.test.ts`
Expected: FAIL — `build-embed.ts` does not exist yet.

- [ ] **Step 3: Write the implementation**

```typescript
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/discord/build-embed.test.ts`
Expected: PASS, all 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/discord/build-embed.ts src/discord/build-embed.test.ts
git commit -m "feat: build discord embed from steam app data"
```

---

### Task 6: Bootstrap the bot

**Files:**
- Create: `src/index.ts`

**Interfaces:**
- Consumes: `loadConfig` (Task 2), `extractAppIds` (Task 3), `fetchAppDetails`/`fetchAppReviewSummary` (Task 4), `buildSteamEmbed` (Task 5).

- [ ] **Step 1: Write `src/index.ts`**

```typescript
import { Client, GatewayIntentBits, type Message } from 'discord.js'
import { loadConfig } from './config.js'
import { buildSteamEmbed } from './discord/build-embed.js'
import { extractAppIds } from './steam/extract-app-ids.js'
import { fetchAppDetails, fetchAppReviewSummary } from './steam/steam-client.js'

const config = loadConfig()

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
})

const handleAppId = async (message: Message, appId: string): Promise<void> => {
  const details = await fetchAppDetails(appId)
  if (!details) return

  const reviewSummary = await fetchAppReviewSummary(appId)
  const embed = buildSteamEmbed(appId, details, reviewSummary)

  await message.reply({ embeds: [embed] })
}

client.on('messageCreate', (message) => {
  if (message.channelId !== config.discordChannelId) return
  if (message.author.bot) return

  const appIds = extractAppIds(message.content)

  for (const appId of appIds) {
    handleAppId(message, appId).catch((error) => {
      console.error(`Failed to handle appId ${appId}:`, error)
    })
  }
})

client.once('ready', (readyClient) => {
  console.log(`Logged in as ${readyClient.user.tag}`)
})

client.login(config.discordToken)
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual smoke test**

Create a real `.env` with a valid bot token and channel id (not committed), then run:

Run: `npm run dev`
Expected: console prints `Logged in as <bot tag>`. Paste a Steam store link (e.g. `https://store.steampowered.com/app/730/CounterStrike_2/`) in the configured channel and confirm the bot replies with an embed showing image, title, description, price, rating, and categories.

- [ ] **Step 4: Commit**

```bash
git add src/index.ts
git commit -m "feat: wire discord bot to steam preview pipeline"
```
