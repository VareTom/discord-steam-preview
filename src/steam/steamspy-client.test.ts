import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchTopTags } from './steamspy-client.js'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchTopTags', () => {
  it('should return the top 3 tags sorted by popularity', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          tags: {
            'Action Roguelike': 1330,
            'Rogue-lite': 954,
            'Hack and Slash': 936,
            Indie: 928,
          },
        }),
      }),
    )

    const result = await fetchTopTags('1145360')

    expect(result).toEqual(['Action Roguelike', 'Rogue-lite', 'Hack and Slash'])
  })

  it('should respect a custom limit', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          tags: { 'Action Roguelike': 1330, 'Rogue-lite': 954 },
        }),
      }),
    )

    const result = await fetchTopTags('1145360', 1)

    expect(result).toEqual(['Action Roguelike'])
  })

  it('should return an empty array when there are no tags', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ tags: [] }),
      }),
    )

    const result = await fetchTopTags('1145360')

    expect(result).toEqual([])
  })

  it('should return an empty array when the fetch call throws', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('network down')),
    )

    const result = await fetchTopTags('1145360')

    expect(result).toEqual([])
  })

  it('should return an empty array when the response is not ok', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false }),
    )

    const result = await fetchTopTags('1145360')

    expect(result).toEqual([])
  })
})
