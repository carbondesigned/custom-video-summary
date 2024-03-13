import {HfInference} from '@huggingface/inference';
import {TranscriptResponse} from 'youtube-transcript';

const Hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

export async function summarizeTranscriptToTopics(
  transcript: TranscriptResponse[]
): Promise<string[]> {
  const summarizedTranscript = preprocessTranscript(transcript);

  // Construct a prompt from the transcript to identify key topics
  const prompt = `Summarize the following into key topics: ${summarizedTranscript}`;

  const response = await Hf.textGeneration({
    model: 'mistralai/Mistral-7B-Instruct-v0.2', // Adjust model as necessary
    inputs: `Summarize the following into key topics: ${prompt}. in a numbered order`,
    parameters: {
      top_k: 1,
      top_p: 0.9,
      return_full_text: false,
    },
  });

  console.log('response', response.generated_text);

  // Parse the response to extract topics
  // Assuming the model returns a comma-separated list of topics
  const topics = response.generated_text
    .split(',')
    .map((topic: string) => topic.trim());

  return topics;
}

function preprocessTranscript(transcript: TranscriptResponse[]): string {
  // Example preprocessing to select a more representative sample
  const sampleSegments = transcript.filter((_, index) => index % 5 === 0); // Take every 5th segment
  const summarizedTranscript = sampleSegments
    .map((segment) => segment.text)
    .join('. ')
    .substring(0, 2048);

  console.log('summarizedTranscript', summarizedTranscript);
  return summarizedTranscript;
}
