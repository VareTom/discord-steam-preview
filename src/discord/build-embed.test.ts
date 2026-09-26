import { describe, expect, it } from 'vitest'
import type { SteamAppDetails } from '../steam/types.js'
import { buildSteamEmbed } from './build-embed.js'

const baseDetails: SteamAppDetails = {
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
    expect(data.fields).toContainEqual({ name: 'Sortie', value: '21 août 2012', inline: true })
  })

  it('should show the discount percentage and crossed-out initial price when the game is on sale', () => {
    const embed = buildSteamEmbed(
      '730',
      { ...baseDetails, discountPercent: 50, initialPriceDisplay: '49,99€', finalPriceDisplay: '24,99€' },
      null,
    )
    const data = embed.data

    expect(data.fields).toContainEqual({
      name: 'Prix',
      value: '~~49,99€~~ 24,99€ (-50%)',
      inline: true,
    })
  })

  it('should show the Metacritic score when present', () => {
    const embed = buildSteamEmbed('730', { ...baseDetails, metacriticScore: 93 }, null)
    const data = embed.data

    expect(data.fields).toContainEqual({ name: 'Metacritic', value: '93/100', inline: true })
  })

  it('should omit the Metacritic field when absent', () => {
    const embed = buildSteamEmbed('730', baseDetails, null)
    const data = embed.data

    expect(data.fields?.some((field) => field.name === 'Metacritic')).toBe(false)
  })

  it('should omit the release date field when it is not available', () => {
    const embed = buildSteamEmbed('730', { ...baseDetails, releaseDate: null }, null)
    const data = embed.data

    expect(data.fields?.some((field) => field.name === 'Sortie')).toBe(false)
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

  it('should show a Statut field when the game is in early access', () => {
    const embed = buildSteamEmbed('730', { ...baseDetails, isEarlyAccess: true }, null)
    const data = embed.data

    expect(data.fields).toContainEqual({ name: 'Statut', value: '🚧 Accès anticipé', inline: true })
  })

  it('should omit the Statut field when the game is not in early access', () => {
    const embed = buildSteamEmbed('730', baseDetails, null)
    const data = embed.data

    expect(data.fields?.some((field) => field.name === 'Statut')).toBe(false)
  })
})
