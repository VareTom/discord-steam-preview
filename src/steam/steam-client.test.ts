import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchAppDetails, fetchAppReviewSummary, searchAppIdByTerm } from './steam-client.js'

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
      price_overview: {
        final_formatted: '0,00€',
        initial_formatted: '',
        discount_percent: 0,
      },
      release_date: { coming_soon: false, date: '21 août 2012' },
      metacritic: undefined,
      categories: [{ description: 'Multi-joueur' }],
      genres: [{ id: '1', description: 'Action' }],
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
      isEarlyAccess: false,
      finalPriceDisplay: '0,00€',
      initialPriceDisplay: null,
      discountPercent: 0,
      releaseDate: '21 août 2012',
      metacriticScore: null,
      categories: ['Multi-joueur'],
      genres: ['Action'],
    })
  })

  it('should return discount details when the game is on sale', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () =>
          appDetailsResponse({
            price_overview: {
              final_formatted: '24,99€',
              initial_formatted: '49,99€',
              discount_percent: 50,
            },
          }),
      }),
    )

    const result = await fetchAppDetails('730')

    expect(result?.discountPercent).toBe(50)
    expect(result?.initialPriceDisplay).toBe('49,99€')
    expect(result?.finalPriceDisplay).toBe('24,99€')
  })

  it('should return a null metacriticScore when metacritic data is absent', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => appDetailsResponse(),
      }),
    )

    const result = await fetchAppDetails('730')

    expect(result?.metacriticScore).toBeNull()
  })

  it('should return the metacriticScore when metacritic data is present', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () =>
          appDetailsResponse({ metacritic: { score: 93, url: 'https://metacritic.com/x' } }),
      }),
    )

    const result = await fetchAppDetails('730')

    expect(result?.metacriticScore).toBe(93)
  })

  it('should return a null releaseDate when the game is coming soon with no date', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () =>
          appDetailsResponse({ release_date: { coming_soon: true, date: '' } }),
      }),
    )

    const result = await fetchAppDetails('730')

    expect(result?.releaseDate).toBeNull()
  })

  it('should return isEarlyAccess true when the genres include the Early Access genre id', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () =>
          appDetailsResponse({
            genres: [
              { id: '1', description: 'Action' },
              { id: '70', description: 'Accès anticipé' },
            ],
          }),
      }),
    )

    const result = await fetchAppDetails('730')

    expect(result?.isEarlyAccess).toBe(true)
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

  it('should return mapped app details when steam replies under a different key than the requested appId', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ '4129390': appDetailsResponse()['730'] }),
      }),
    )

    const result = await fetchAppDetails('2085540')

    expect(result?.name).toBe('Counter-Strike 2')
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

describe('searchAppIdByTerm', () => {
  it('should return the appId of the first search result when the search succeeds', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          total: 1,
          items: [{ id: 2085540, name: 'Stick It to the Stickman' }],
        }),
      }),
    )

    const result = await searchAppIdByTerm('Stick It to the Stickman')

    expect(result).toBe('2085540')
  })

  it('should return null when the search has no results', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ total: 0, items: [] }),
      }),
    )

    const result = await searchAppIdByTerm('does not exist')

    expect(result).toBeNull()
  })

  it('should return null when the fetch call throws', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('network down')),
    )

    const result = await searchAppIdByTerm('Stick It to the Stickman')

    expect(result).toBeNull()
  })
})
