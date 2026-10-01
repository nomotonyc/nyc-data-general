import { describe, expect, it } from 'vitest'
import { LAYERS, getLayer } from '../layers'
import { layerFileText } from '../test/layerFiles'
import { DatasetStore, getDataset, layerFileUrl } from './load'

const fileFor = layerFileText
const fakeFetch = (overrides: Record<string, Response> = {}) => {
  const asked: string[] = []
  const fetcher = async (url: string) => {
    asked.push(url)
    const id = url.split('/').pop()!.replace('.json', '')
    return overrides[id] ?? new Response(fileFor(id))
  }
  return { fetcher, asked }
}

describe('DatasetStore', () => {
  it('fetches every built layer once, and nothing for sample layers', async () => {
    const { fetcher, asked } = fakeFetch()
    const store = new DatasetStore(fetcher)
    expect(store.ready()).toBe(false)
    await store.load()
    await store.load()
    expect(asked).toEqual(LAYERS.filter((l) => l.build).map((l) => layerFileUrl(l.id)))
    expect(store.ready()).toBe(true)
  })

  it('serves real data for built layers and sample data for the rest', async () => {
    const store = new DatasetStore(fakeFetch().fetcher)
    await store.load()
    expect(store.get('structural-fires').isSample).toBe(false)
    expect(store.get('ambulance-calls').isSample).toBe(true)
    expect(store.get('ambulance-calls')).toBe(store.get('ambulance-calls'))
  })

  it('refuses a built layer before it has loaded', () => {
    expect(() => new DatasetStore(fakeFetch().fetcher).get('structural-fires')).toThrow(/structural-fires is not loaded/)
  })

  it('names the layer when its file cannot be fetched', async () => {
    const store = new DatasetStore(fakeFetch({ 'structural-fires': new Response('', { status: 404 }) }).fetcher)
    await expect(store.load()).rejects.toThrow(/Structural fires data \(404\)/)
  })

  it('names the layer when its file is incomplete', async () => {
    const broken = JSON.parse(fileFor('structural-fires'))
    delete broken.values['44']
    const store = new DatasetStore(fakeFetch({ 'structural-fires': new Response(JSON.stringify(broken)) }).fetcher)
    await expect(store.load()).rejects.toThrow(/structural-fires.*area 44/)
  })

  it('can try again after a failure', async () => {
    let fail = true
    const store = new DatasetStore(async (url) => (fail ? new Response('', { status: 500 }) : new Response(fileFor(url.split('/').pop()!.replace('.json', '')))))
    await expect(store.load()).rejects.toThrow()
    fail = false
    await store.load()
    expect(store.ready()).toBe(true)
  })

  it('refuses a layer that does not exist', () => {
    expect(() => new DatasetStore(fakeFetch().fetcher).get('nope')).toThrow(/nope/)
  })
})

describe('getDataset', () => {
  it('serves the app’s store, which the test setup loads from disk', () => {
    expect(getDataset('structural-fires').layerId).toBe('structural-fires')
    expect(getDataset('structural-fires').isSample).toBe(false)
    expect(getLayer('structural-fires').build).toBeDefined()
  })
})

describe('every built layer', () => {
  it.each(LAYERS.filter((l) => l.build).map((l) => [l.id]))('%s has its file in public/data/layers', (id) => {
    expect(() => fileFor(id)).not.toThrow()
  })
})
