import { describe, expect, it } from 'vitest'
import { extractSteamLinks } from './extract-app-ids.js'

describe('extractSteamLinks', () => {
  it('should return the appId and slug when the message contains a single steam link', () => {
    const content = 'check this out https://store.steampowered.com/app/730/CounterStrike_2/'
    expect(extractSteamLinks(content)).toEqual([{ appId: '730', slug: 'CounterStrike_2' }])
  })

  it('should return multiple entries when the message contains several distinct links', () => {
    const content = [
      'https://store.steampowered.com/app/730/CounterStrike_2/',
      'https://store.steampowered.com/app/570/Dota_2/',
    ].join(' ')
    expect(extractSteamLinks(content)).toEqual([
      { appId: '730', slug: 'CounterStrike_2' },
      { appId: '570', slug: 'Dota_2' },
    ])
  })

  it('should deduplicate the same appId when it appears twice in the message', () => {
    const content = [
      'https://store.steampowered.com/app/730/CounterStrike_2/',
      'https://store.steampowered.com/app/730/CounterStrike_2/?curator_clanid=1',
    ].join(' ')
    expect(extractSteamLinks(content)).toEqual([{ appId: '730', slug: 'CounterStrike_2' }])
  })

  it('should return a null slug when the link has query params and no trailing name segment', () => {
    const content = 'https://store.steampowered.com/app/730?snr=1_7_7_230_150_1'
    expect(extractSteamLinks(content)).toEqual([{ appId: '730', slug: null }])
  })

  it('should return an empty array when the message has no steam link', () => {
    const content = 'just chatting about lunch, no links here https://example.com/app/730'
    expect(extractSteamLinks(content)).toEqual([])
  })

  it('should return an empty array when the message is empty', () => {
    expect(extractSteamLinks('')).toEqual([])
  })
})
