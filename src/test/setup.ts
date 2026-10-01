import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
import { datasetFromFile, type LayerFile } from '../data/file'
import { datasets } from '../data/load'
import { LAYERS } from '../layers'
import { hasLayerFile, layerFileText } from './layerFiles'

// Vitest runs without globals, so Testing Library cannot register this itself.
afterEach(cleanup)

// The app loads built layers over the network (DataGate); tests read the same files from disk.
// A layer whose file isn't built yet fails only the tests that use it, and load.test.ts says which.
for (const layer of LAYERS.filter((l) => l.build && hasLayerFile(l.id))) {
  const file = JSON.parse(layerFileText(layer.id)) as LayerFile
  datasets.add(datasetFromFile(layer, file))
}
