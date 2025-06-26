type MaterialType = 'fine-ware' | 'coarse-ware';

const FINE_WARE_LABELS: Record<string, string> = {
  // Diagnostic types
  'rim': 'Rim',
  'base': 'Base',
  'foot': 'Foot',
  'body': 'Body',
  'its': 'ITS',
  'handle': 'Handle',
  'spout': 'Spout',
  'lip': 'Lip',
  
  // Qualification types
  'african sigillata': 'African sigillata',
  'african': 'African sigillata',
  'sardinian black gloss': 'Sardinian black gloss',
  'sardinian': 'Sardinian black gloss',
  'black gloss': 'Black gloss',
  'black_gloss': 'Black gloss',
  'thin wall': 'Thin wall',
  'thin_wall': 'Thin wall',
  'red slip': 'Red slip',
  'red_slip': 'Red slip',
  'cooking': 'Cooking ware',
  'cooking_ware': 'Cooking ware',
  'plain': 'Plain',
  'painted': 'Painted',
  'burnished': 'Burnished',
  'glazed': 'Glazed'
};

const COARSE_WARE_LABELS: Record<string, string> = {
  // Diagnostic types (same as fine ware)
  'rim': 'Rim',
  'base': 'Base',
  'foot': 'Foot',
  'body': 'Body',
  'its': 'ITS',
  'handle': 'Handle',
  'spout': 'Spout',
  'lip': 'Lip',
  
  // Qualification types (only need to map diagnostic types for coarse ware)
  // 'Punic' and 'Unidentified' are already in correct form
};

export const formatMaterialLabel = (label: string, materialType: MaterialType): string => {
  if (!label) return '';
  
  // Normalize the input
  const normalized = label.toLowerCase().replace(/_/g, ' ').trim();
  
  // Get the appropriate mapping based on material type
  const mapping = materialType === 'fine-ware' ? FINE_WARE_LABELS : COARSE_WARE_LABELS;
  
  // Return mapped value or title case the original if not found
  return mapping[normalized] || label.split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
};

// Helper function to format qualification labels specifically
export const formatQualificationLabel = (label: string, materialType: MaterialType): string => {
  if (materialType === 'coarse-ware') {
    // For coarse ware, only 'Punic' and 'Unidentified' are valid and already in correct form
    return label === 'Punic' || label === 'Unidentified' ? label : 'Unidentified';
  }
  // For fine ware, use the full mapping
  return formatMaterialLabel(label, 'fine-ware');
};
