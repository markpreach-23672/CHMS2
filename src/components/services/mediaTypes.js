export const FILE_TYPES = [
  { value: 'chord_chart', label: 'Chord Chart' },
  { value: 'score', label: 'Music Score (PDF)' },
  { value: 'backing_track', label: 'Backing Track' },
  { value: 'other', label: 'Other' },
];

export const TYPE_STYLES = {
  chord_chart: 'bg-blue-100 text-blue-700',
  score: 'bg-purple-100 text-purple-700',
  backing_track: 'bg-green-100 text-green-700',
  other: 'bg-slate-100 text-slate-600',
};

export const typeLabel = (v) => FILE_TYPES.find(t => t.value === v)?.label || 'Other';