import { Breadcrumb } from './Breadcrumb'
import { StoryTabs } from './StoryTabs'
import './Toolbar.css'
import { YearRange } from './YearRange'

export function Toolbar() {
  return (
    <div className="toolbar">
      <h1 className="visually-hidden">NYC Data Atlas</h1>
      <Breadcrumb />
      <StoryTabs />
      <div className="toolbar__end">
        <YearRange />
      </div>
    </div>
  )
}
