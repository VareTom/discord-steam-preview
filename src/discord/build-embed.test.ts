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
