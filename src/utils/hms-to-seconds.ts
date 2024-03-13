// Helper function to convert HH:MM:SS to seconds
export function hmsToSeconds(hms: string) {
  const [hours, minutes, seconds] = hms.split(':').map(parseFloat);
  return hours * 3600 + minutes * 60 + seconds;
}
