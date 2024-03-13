import {Segment} from '@/types';
import {hmsToSeconds} from './hms-to-seconds';

export function refineSegments(segments: Segment[]): Segment[] {
  const MAX_DURATION_SECONDS = 5 * 60; // 5 minutes
  let currentDuration = 0;
  const refinedSegments: Segment[] = [];

  for (const segment of segments) {
    const segmentStart = hmsToSeconds(segment.start);
    const segmentEnd = hmsToSeconds(segment.end);
    const segmentDuration = segmentEnd - segmentStart;

    if (currentDuration + segmentDuration <= MAX_DURATION_SECONDS) {
      refinedSegments.push(segment);
      currentDuration += segmentDuration;
    } else {
      // Optionally, you could break the loop if there's no way to fit this segment
      // Or implement more complex logic to maybe replace a previous segment with this one if it's more relevant
      break;
    }
  }

  return refinedSegments;
}
