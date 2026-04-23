import { createCompactAdversarySheetClass } from "./compact-adversary-sheet.js";

const MODULE_ID = "daggerheart-compact-adversary-sheet";

Hooks.once("init", async () => {
  game.settings.register(MODULE_ID, "makeDefault", {
    name: "Use compact sheet as the default adversary sheet",
    hint: "When enabled, adversary actors open with the compact sheet by default. Reload after changing this setting.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    requiresReload: true
  });

  await foundry.applications.handlebars.loadTemplates([
    `modules/${MODULE_ID}/templates/parts/header.hbs`,
    `modules/${MODULE_ID}/templates/parts/footer.hbs`,
    `modules/${MODULE_ID}/templates/parts/features.hbs`,
    `modules/${MODULE_ID}/templates/parts/effects.hbs`,
    `modules/${MODULE_ID}/templates/parts/notes.hbs`
  ]);
});

Hooks.once("setup", () => {
  if (game.system.id !== "daggerheart") return;

  const BaseAdversarySheet = game.system.api?.applications?.sheets?.actors?.Adversary;
  if (!BaseAdversarySheet) {
    console.warn(`${MODULE_ID} | Daggerheart adversary sheet class was not found. Registration skipped.`);
    return;
  }

  const CompactAdversarySheet = createCompactAdversarySheetClass(BaseAdversarySheet);
  const { Actors } = foundry.documents.collections;

  Actors.registerSheet(MODULE_ID, CompactAdversarySheet, {
    types: ["adversary"],
    makeDefault: game.settings.get(MODULE_ID, "makeDefault"),
    label: "Compact Adversary Sheet"
  });
});
