import { STORIES } from '../../domain/stories'
import { useExplorerDispatch, useExplorerState } from '../../explorer/context'
import { useTheme } from '../../theme/context'
import './StoryTabs.css'

type Props = {
  analysis?: boolean
  onAnalysis?: () => void
  onStory?: () => void
}

export function StoryTabs({ analysis = false, onAnalysis, onStory }: Props) {
  const { storyId } = useExplorerState()
  const dispatch = useExplorerDispatch()
  const theme = useTheme()

  return (
    <div className="story-tabs" role="group" aria-label="Stories">
      {STORIES.map((story) => (
        <button
          key={story.id}
          type="button"
          className="story-tabs__tab"
          aria-pressed={!analysis && story.id === storyId}
          title={story.question}
          onClick={() => {
            dispatch({ type: 'selectStory', storyId: story.id })
            onStory?.()
          }}
        >
          <span className="story-tabs__number" style={{ color: theme.story[story.id].accent }}>
            {story.number}
          </span>{' '}
          {story.name}
        </button>
      ))}
      <button
        type="button"
        className="story-tabs__tab"
        aria-pressed={analysis}
        title="Explore and compare the data"
        onClick={onAnalysis}
      >
        <span className="story-tabs__number" style={{ color: theme.color.analysisAccent }}>
          04
        </span>{' '}
        Analysis
      </button>
    </div>
  )
}
