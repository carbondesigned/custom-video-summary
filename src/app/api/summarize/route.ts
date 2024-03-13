import {HfInference} from '@huggingface/inference';
import {TranscriptResponse, YoutubeTranscript} from 'youtube-transcript';
import ytdl from 'ytdl-core';
import fs from 'fs';
import {execSync} from 'child_process';
import {Segment} from '@/types';
import {summarizeTranscriptToTopics} from '@/utils/summarize-transcript-to-topics';
import {findKeySegmentsForTopic} from '@/utils/find-key-segments-for-topic';
import {refineSegments} from '@/utils/refine-segments';
import {hmsToSeconds} from '@/utils/hms-to-seconds';

const Hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

function secondsToHms(d: number) {
  const h = Math.floor(d / 3600)
    .toString()
    .padStart(2, '0');
  const m = Math.floor((d % 3600) / 60)
    .toString()
    .padStart(2, '0');
  const s = Math.floor(d % 60)
    .toString()
    .padStart(2, '0');

  return `${h}:${m}:${s}`;
}

function parseResponse(responseText: string) {
  // Attempt to directly parse the responseText as JSON first
  try {
    const jsonArray = JSON.parse(responseText);
    console.log('JSON array parsed successfully:', jsonArray);
    return jsonArray;
  } catch (initialError) {
    console.error(
      'Initial JSON parse failed, attempting to extract valid JSON:',
      initialError
    );
    // Attempt to extract a valid JSON structure using regex
    const potentialJsonMatch = responseText.match(
      /\[\{.*?\}\](,?\s*\{.*?\})*\s*$/
    );
    if (potentialJsonMatch) {
      try {
        const jsonArray = JSON.parse(potentialJsonMatch[0]);
        console.log('JSON array extracted and parsed successfully:', jsonArray);
        return jsonArray;
      } catch (extractionError) {
        console.error('Failed to parse extracted JSON:', extractionError);
      }
    } else {
      console.error(
        'No valid JSON structure could be extracted from response.'
      );
    }
  }
  return []; // Return an empty array or handle the error as needed
}

// Function to generate summary segments with timestamps
async function generateSummarySegments(
  transcript: TranscriptResponse[]
): Promise<Segment[]> {
  const topics = await summarizeTranscriptToTopics(transcript);
  // let allSegments: Segment[] = [];

  // for (const topic of topics) {
  //   const segmentsForTopic = await findKeySegmentsForTopic(topic, transcript);
  //   allSegments = allSegments.concat(segmentsForTopic);
  // }

  // const refinedSegments = refineSegments(allSegments);
  // return refinedSegments;

  return new Promise((resolve, reject) => {
    resolve([] as Segment[]);
  });
}

function cutVideoIntoSegmentsAndConcatenate(
  videoPath: string,
  segments: Segment[]
) {
  // Generate the filter_complex string for cutting and concatenating segments
  let filterComplexStr = '';
  segments.forEach((segment, index) => {
    // Convert start and end times to seconds
    const startSeconds = hmsToSeconds(segment.start);
    const endSeconds = hmsToSeconds(segment.end);
    const duration = endSeconds - startSeconds;
    // Append to the filter_complex string
    filterComplexStr += `[0:v]trim=start=${startSeconds}:duration=${duration},setpts=PTS-STARTPTS[v${index}]; `;
    filterComplexStr += `[0:a]atrim=start=${startSeconds}:duration=${duration},asetpts=PTS-STARTPTS[a${index}]; `;
  });

  // Generate the mapping for the filter_complex concatenation
  const concatStr = segments
    .map((_, index) => `[v${index}][a${index}]`)
    .join('');
  filterComplexStr += `${concatStr}concat=n=${segments.length}:v=1:a=1[v][a]`;

  // Final FFmpeg command with filter_complex
  const command = `ffmpeg -i "${videoPath}" -filter_complex "${filterComplexStr}" -map "[v]" -map "[a]" final_summary_video.mp4`;

  console.log(
    'Executing FFmpeg command for cutting and concatenating segments...'
  );
  try {
    execSync(command, {stdio: 'inherit'});
    console.log('Final video created successfully.');
  } catch (error) {
    console.error('Failed to process video:', error);
  }
}

export async function POST(req: Request) {
  const {videoUrl} = await req.json();

  console.log(videoUrl);

  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoUrl);
    const summarySegments = await generateSummarySegments(transcript);

    // download video
    const video = ytdl(videoUrl);
    video.pipe(fs.createWriteStream('video.mp4'));
    const videoPath = 'video.mp4';
    if (!fs.existsSync(videoPath)) {
      const video = ytdl(videoUrl);
      video.pipe(fs.createWriteStream(videoPath));
    }

    // // cut video
    // cutVideoIntoSegmentsAndConcatenate(videoPath, summarySegments as Segment[]);

    return new Response(JSON.stringify(summarySegments), {
      status: 200,
    });
  } catch (error) {
    console.error(error);
    return new Response('An error occurred while summarizing the video', {
      status: 500,
    });
  }
}
