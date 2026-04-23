export const MODULE_ID = "daggerheart-compact-adversary-sheet";
export const SYSTEM_ID = "daggerheart";
export const SHEET_LABEL = "Compact Adversary Sheet";

export const SETTING_KEYS = Object.freeze({
  makeDefault: "makeDefault"
});

export const TEMPLATE_ROOT = `modules/${MODULE_ID}/templates`;

export const TEMPLATE_PARTIALS = Object.freeze({
  header: `${TEMPLATE_ROOT}/parts/header.hbs`,
  footer: `${TEMPLATE_ROOT}/parts/footer.hbs`,
  features: `${TEMPLATE_ROOT}/parts/features.hbs`,
  effects: `${TEMPLATE_ROOT}/parts/effects.hbs`,
  notes: `${TEMPLATE_ROOT}/parts/notes.hbs`
});

export const PRELOAD_TEMPLATE_PATHS = Object.freeze(Object.values(TEMPLATE_PARTIALS));

export const DEFAULT_WINDOW = Object.freeze({
  width: 345,
  height: 780
});

export const FEATURE_DESCRIPTION_SELECTOR = ".dhca-tab-panel--features .inventory-item .extensible";
export const RESOURCE_STEP_SELECTOR = ".dhca-resource-step";
export const RESOURCE_GROUP_SIZE = 3;

export const RESOURCE_KEYS = Object.freeze({
  hitPoints: "hitPoints",
  stress: "stress"
});

export const RESOURCE_ACTIONS = Object.freeze({
  [RESOURCE_KEYS.hitPoints]: "toggleHitPoints",
  [RESOURCE_KEYS.stress]: "toggleStress"
});

export const I18N_KEYS = Object.freeze({
  tier: "DAGGERHEART.GENERAL.tier"
});
