export type DeadlinePresetId =
  | 'card'
  | 'first-name'
  | 'free-word'
  | 'number'
  | 'short-prediction'
  | 'custom';

export type DeadlineCallType = 'flash' | 'revelation' | 'theatrical';

export const DEADLINE_PRESETS: Array<{
  id: DeadlinePresetId;
  name: string;
  eyebrow: string;
  defaultLabel: string;
  defaultMessage: string;
}> = [
  {
    id: 'card',
    name: 'Carte pensée',
    eyebrow: 'Cartomagie',
    defaultLabel: 'Révélation carte pensée',
    defaultMessage: 'Je savais que tu penserais à la dame de cœur.',
  },
  {
    id: 'first-name',
    name: 'Prénom',
    eyebrow: 'Mentalisme',
    defaultLabel: 'Révélation prénom',
    defaultMessage: 'Le prénom que tu gardes en tête est exactement celui que j’avais prévu.',
  },
  {
    id: 'free-word',
    name: 'Mot libre',
    eyebrow: 'Prédiction',
    defaultLabel: 'Révélation mot libre',
    defaultMessage: 'Le mot auquel tu penses vient d’être confirmé. Impossible, mais exact.',
  },
  {
    id: 'number',
    name: 'Nombre',
    eyebrow: 'Influence',
    defaultLabel: 'Révélation nombre',
    defaultMessage: 'Le nombre choisi était déjà connu avant même que l’appel commence.',
  },
  {
    id: 'short-prediction',
    name: 'Prédiction courte',
    eyebrow: 'Final',
    defaultLabel: 'Prédiction finale',
    defaultMessage: 'La prédiction est confirmée. Tout était écrit avant le début.',
  },
  {
    id: 'custom',
    name: 'Message personnalisé',
    eyebrow: 'Libre',
    defaultLabel: 'Message Dead Line',
    defaultMessage: 'Le message personnalisé est prêt. La révélation peut commencer.',
  },
];

export const DEADLINE_CALL_TYPES: Array<{
  id: DeadlineCallType;
  name: string;
  cost: number;
  description: string;
}> = [
  {
    id: 'flash',
    name: 'Flash',
    cost: 1,
    description: 'Message très court, idéal pour une révélation rapide.',
  },
  {
    id: 'revelation',
    name: 'Révélation',
    cost: 2,
    description: 'Format standard pour une révélation claire et mystérieuse.',
  },
  {
    id: 'theatrical',
    name: 'Théâtral',
    cost: 3,
    description: 'Message plus long, pensé pour un climax de spectacle.',
  },
];

export function getPresetById(id: string | null | undefined) {
  return DEADLINE_PRESETS.find((preset) => preset.id === id) || DEADLINE_PRESETS[0];
}

export function getCallTypeById(id: string | null | undefined) {
  return DEADLINE_CALL_TYPES.find((type) => type.id === id) || DEADLINE_CALL_TYPES[1];
}

export function formatCallTypeName(id: string | null | undefined) {
  return getCallTypeById(id).name;
}
