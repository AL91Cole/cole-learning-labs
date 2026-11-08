// Which presentation an investigation uses. Hardware cases stay ticket-style
// (request, clues, first idea, workbench, check & explain). Every other track
// opens as a guided lab: a lab guide beside the environment with an
// introduction, a hands-on demonstration, applied learning and a challenge.
// Kept dependency-free so the record normalizer and the start-up bundle can
// both read it without pulling in a workbench.
export const GUIDE_TRACKS = Object.freeze(['network', 'ai', 'security', 'coding']);

export function labFormat(scenario) {
  const guide = GUIDE_TRACKS.includes(scenario?.track);
  return Object.freeze({guide, ticket: !guide});
}
