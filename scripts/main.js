import { createCompactAdversarySheetClass } from "./compact-adversary-sheet.js";
import {
  MODULE_ID,
  PRELOAD_TEMPLATE_PATHS,
  SETTING_KEYS,
  SHEET_LABEL,
  SYSTEM_ID
} from "./constants.js";

Hooks.once("init", async () => {
  registerSettings();
  await preloadTemplates();
});

Hooks.once("setup", () => {
  if (game.system.id !== SYSTEM_ID) return;
  registerCompactSheet();
});

function registerSettings() {
  game.settings.register(MODULE_ID, SETTING_KEYS.makeDefault, {
    name: "Use compact sheet as the default adversary sheet",
    hint: "When enabled, adversary actors open with the compact sheet by default. Reload after changing this setting.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    requiresReload: true
  });
}

async function preloadTemplates() {
  await foundry.applications.handlebars.loadTemplates(PRELOAD_TEMPLATE_PATHS);
}

function registerCompactSheet() {
  const BaseAdversarySheet = game.system.api?.applications?.sheets?.actors?.Adversary;

  if (!BaseAdversarySheet) {
    console.warn(`${MODULE_ID} | Daggerheart adversary sheet class was not found. Registration skipped.`);
    return;
  }

  const CompactAdversarySheet = createCompactAdversarySheetClass(BaseAdversarySheet);

  foundry.documents.collections.Actors.registerSheet(MODULE_ID, CompactAdversarySheet, {
    types: ["adversary"],
    makeDefault: game.settings.get(MODULE_ID, SETTING_KEYS.makeDefault),
    label: SHEET_LABEL
  });
}
