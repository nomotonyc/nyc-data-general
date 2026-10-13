import { Breadcrumb } from './Breadcrumb'
import { StoryTabs } from './StoryTabs'
import './Toolbar.css'
import { YearRange } from './YearRange'
import { SaveView } from '../SaveView'

export function Toolbar() {
  return (
    <div className="toolbar">
      <h1 className="visually-hidden">NYC Data Atlas</h1>
      <Breadcrumb />
      <StoryTabs />
      <div className="toolbar__end">
        <YearRange />
        <SaveView />
      </div>
    </div>
  )
}
