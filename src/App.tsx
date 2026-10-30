import { useState } from 'react'
import BaseMap from './components/BaseMap'
import { DataGate } from './components/data/DataGate'
import { ExplorerLayout } from './components/ExplorerLayout'
import { MapShotContext, mapShooter } from './components/mapShot'
import { FocusPanel } from './components/panel/FocusPanel'
import { Rail } from './components/rail/Rail'
import { Toolbar } from './components/toolbar/Toolbar'
import { useExplorerState } from './explorer/context'
import { ExplorerProvider } from './explorer/ExplorerProvider'
import { useTheme } from './theme/context'

function Explorer() {
  const { storyId } = useExplorerState()
  const theme = useTheme()
  const [analysis, setAnalysis] = useState(false)
  // The map's picture, which BaseMap takes and the toolbar's Save view uses.
  const [shooter] = useState(mapShooter)
  return (
    <MapShotContext.Provider value={shooter}>
    <ExplorerLayout
      accent={analysis ? theme.color.analysisAccent : theme.story[storyId].accent}
      analysis={analysis}
      analysisBackground={theme.color.analysisBackground}
      toolbar={<Toolbar analysis={analysis} onAnalysis={() => setAnalysis(true)} onStory={() => setAnalysis(false)} />}
      rail={<Rail />}
      settings={<Rail places={false} />}
      map={<BaseMap />}
      panel={<FocusPanel />}
    />
    </MapShotContext.Provider>
  )
}

export default function App() {
  return (
    <DataGate>
      <ExplorerProvider>
        <Explorer />
      </ExplorerProvider>
    </DataGate>
  )
}
