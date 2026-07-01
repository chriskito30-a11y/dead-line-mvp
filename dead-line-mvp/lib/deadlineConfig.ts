export type DeadlinePresetId =
  | 'card'
  | 'first-name'
  | 'free-word'
  | 'number'
  | 'short-prediction'
  | 'custom';

export type DeadlineCallType = 'flash' | 'revelation' | 'theatrical';

export type DeadlineVariableKey =
  | 'prediction'
  | 'zone1'
  | 'zone2'
  | 'zone3'
  | 'zone4'
  | 'zone5'
  | 'fullMessage';

export type DeadlineApiTarget = 'phone' | DeadlineVariableKey | 'trigger';

export type DeadlineApiResponseMode = 'auto' | 'json' | 'text';

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

export const DEADLINE_VARIABLES: Array<{
  id: DeadlineVariableKey;
  label: string;
  placeholder: string;
}> = [
  { id: 'prediction', label: 'Prédiction', placeholder: 'dame de cœur' },
  { id: 'zone1', label: 'Zone 1', placeholder: 'carte, mot, couleur…' },
  { id: 'zone2', label: 'Zone 2', placeholder: 'couleur, nombre…' },
  { id: 'zone3', label: 'Zone 3', placeholder: 'prénom, objet…' },
  { id: 'zone4', label: 'Zone 4', placeholder: 'valeur libre' },
  { id: 'zone5', label: 'Zone 5', placeholder: 'valeur libre' },
  { id: 'fullMessage', label: 'Message complet', placeholder: 'message déjà prêt' },
];

export const DEADLINE_API_TARGETS: Array<{
  id: DeadlineApiTarget;
  label: string;
}> = [
  { id: 'phone', label: 'Contact' },
  { id: 'prediction', label: 'Prédiction' },
  { id: 'zone1', label: 'Zone 1' },
  { id: 'zone2', label: 'Zone 2' },
  { id: 'zone3', label: 'Zone 3' },
  { id: 'zone4', label: 'Zone 4' },
  { id: 'zone5', label: 'Zone 5' },
  { id: 'fullMessage', label: 'Message complet' },
  { id: 'trigger', label: 'Déclenchement' },
];

export const DEFAULT_PERFORM_TEMPLATE = 'La carte est {zone1}.';

export function getPresetById(id: string | null | undefined) {
  return DEADLINE_PRESETS.find((preset) => preset.id === id) || DEADLINE_PRESETS[0];
}

export function getCallTypeById(id: string | null | undefined) {
  return DEADLINE_CALL_TYPES.find((type) => type.id === id) || DEADLINE_CALL_TYPES[1];
}

export function formatCallTypeName(id: string | null | undefined) {
  return getCallTypeById(id).name;
}

export function normalizePhone(phone: string) {
  const compact = String(phone || '').trim().replace(/[\s.\-()]/g, '');
  if (!compact) return '';
  if (compact.startsWith('+')) return compact;
  if (compact.startsWith('00')) return '+' + compact.slice(2);
  if (compact.startsWith('0')) return '+33' + compact.slice(1);
  return compact;
}

export function maskPhone(phone: string) {
  const clean = String(phone || '').replace(/\s+/g, '');
  if (!clean) return '—';
  if (clean.length <= 6) return '••••';
  return `${clean.slice(0, 3)}••••••${clean.slice(-4)}`;
}

export function isValidPhone(phone: string) {
  const normalized = normalizePhone(phone);
  return /^\+[1-9]\d{7,14}$/.test(normalized);
}

export function extractTemplateVariables(template: string) {
  const allowed = new Set(DEADLINE_VARIABLES.map((variable) => variable.id));
  const found = new Set<DeadlineVariableKey>();
  const matches = String(template || '').matchAll(/\{([a-zA-Z0-9_]+)\}/g);

  for (const match of matches) {
    const key = match[1] as DeadlineVariableKey;
    if (allowed.has(key)) {
      found.add(key);
    }
  }

  return Array.from(found);
}

export function renderTemplate(template: string, variables: Partial<Record<DeadlineVariableKey, string>>) {
  return String(template || '').replace(/\{([a-zA-Z0-9_]+)\}/g, (fullMatch, rawKey) => {
    const key = rawKey as DeadlineVariableKey;
    if (!DEADLINE_VARIABLES.some((variable) => variable.id === key)) return fullMatch;
    return String(variables?.[key] || '').trim();
  }).trim();
}

export function validatePerformMessage(params: {
  phone: string;
  template: string;
  variables: Partial<Record<DeadlineVariableKey, string>>;
}) {
  const missing: string[] = [];
  const phone = normalizePhone(params.phone);
  const usedVariables = extractTemplateVariables(params.template);

  if (!isValidPhone(phone)) {
    missing.push('Contact valide');
  }

  for (const variable of usedVariables) {
    if (!String(params.variables?.[variable] || '').trim()) {
      const config = DEADLINE_VARIABLES.find((item) => item.id === variable);
      missing.push(config?.label || variable);
    }
  }

  const message = renderTemplate(params.template, params.variables);
  if (!message) {
    missing.push('Message final');
  }

  const unresolved = message.match(/\{[a-zA-Z0-9_]+\}/g) || [];
  for (const token of unresolved) {
    missing.push(`Variable inconnue ${token}`);
  }

  return {
    ok: missing.length === 0,
    missing,
    phone,
    message,
    usedVariables,
  };
}
