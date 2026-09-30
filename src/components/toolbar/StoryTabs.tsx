import { STORIES } from '../../domain/stories'
import { useExplorerDispatch, useExplorerState } from '../../explorer/context'
import { useTheme } from '../../theme/context'
import './StoryTabs.css'

export function StoryTabs() {
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
          aria-pressed={story.id === storyId}
          title={story.question}
          onClick={() => dispatch({ type: 'selectStory', storyId: story.id })}
        >
          <span className="story-tabs__number" style={{ color: theme.story[story.id].accent }}>
            {story.number}
          </span>{' '}
          {story.name}
        </button>
      ))}
    </div>
  )
}
