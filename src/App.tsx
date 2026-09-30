import BaseMap from './components/BaseMap'
import { ExplorerLayout } from './components/ExplorerLayout'
import { FocusPanel } from './components/panel/FocusPanel'
import { Rail } from './components/rail/Rail'
import { Toolbar } from './components/toolbar/Toolbar'
import { useExplorerState } from './explorer/context'
import { ExplorerProvider } from './explorer/ExplorerProvider'
import { useTheme } from './theme/context'

function Explorer() {
  const { storyId } = useExplorerState()
  const theme = useTheme()
  return (
    <ExplorerLayout
      accent={theme.story[storyId].accent}
      toolbar={<Toolbar />}
      rail={<Rail />}
      map={<BaseMap />}
      panel={<FocusPanel />}
    />
  )
}

export default function App() {
  return (
    <ExplorerProvider>
      <Explorer />
    </ExplorerProvider>
  )
}
