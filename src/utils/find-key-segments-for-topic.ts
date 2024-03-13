import {Segment} from '@/types';
import {HfInference} from '@huggingface/inference';
import {TranscriptResponse} from 'youtube-transcript';

const Hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

export async function findKeySegmentsForTopic(
  topic: string,
  transcript: TranscriptResponse[]
): Promise<Segment[]> {
  console.log('topic', topic);
  // Summarize the transcript or select relevant portions to stay within token limits
  const summarizedTranscript = transcript
    .map((segment) => segment.text)
    .join('. ')
    .substring(0, 2048); // Example approach

  // Construct the prompt
  const prompt = `Given the topic "${topic}", identify key segments from the following transcript: ${summarizedTranscript}`;

  // Send the prompt to the model
  const response = await Hf.textGeneration({
    model: 'mistralai/Mistral-7B-Instruct-v0.2', // Adjust model as necessary
    inputs: prompt,
    parameters: {
      top_k: 1,
      top_p: 0.9,
      max_new_tokens: 512, // Adjust based on your needs and model's limits
      return_full_text: false,
    },
  });

  // Parse the model's response to extract segments
  // This parsing logic will depend on how the model formats its response
  // For simplicity, let's assume the model returns JSON-formatted segments
  try {
    console.log('segments', response.generated_text);
    const segments: Segment[] = response.generated_text
      ? JSON.parse(response.generated_text)
      : [];
    return segments;
  } catch (error) {
    console.error('Failed to parse segments from model response:', error);
    return [];
  }
}
