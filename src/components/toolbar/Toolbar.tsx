import { Breadcrumb } from './Breadcrumb'
import { StoryTabs } from './StoryTabs'
import './Toolbar.css'
import { YearRange } from './YearRange'
import { SaveView } from '../SaveView'

type Props = {
  analysis?: boolean
  onAnalysis?: () => void
  onStory?: () => void
}

export function Toolbar({ analysis = false, onAnalysis, onStory }: Props) {
  return (
    <div className={`toolbar${analysis ? ' toolbar--analysis' : ''}`}>
      <h1 className="visually-hidden">NYC Data Atlas</h1>
      {!analysis && <Breadcrumb />}
      <StoryTabs analysis={analysis} onAnalysis={onAnalysis} onStory={onStory} />
      {!analysis && (
        <div className="toolbar__end">
          <YearRange />
          <SaveView />
        </div>
      )}
    </div>
  )
}
