import { getStory, type StoryId } from '../domain/stories'
import type { StoryDataset } from './dataset'
import { generateSampleDataset } from './sample'

const cache = new Map<StoryId, StoryDataset>()

/**
 * The dataset behind a story. Sample data for now; Milestone 5 swaps in each
 * story's real data here without changing callers.
 */
export function getDataset(storyId: StoryId): StoryDataset {
  let ds = cache.get(storyId)
  if (!ds) {
    ds = generateSampleDataset(getStory(storyId))
    cache.set(storyId, ds)
  }
  return ds
}
