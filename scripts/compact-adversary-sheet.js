const MODULE_ID = "daggerheart-compact-adversary-sheet";

export function createCompactAdversarySheetClass(BaseAdversarySheet) {
  return class CompactAdversarySheet extends BaseAdversarySheet {
    static DEFAULT_OPTIONS = foundry.utils.mergeObject(
      foundry.utils.deepClone(BaseAdversarySheet.DEFAULT_OPTIONS),
      {
        classes: [...(BaseAdversarySheet.DEFAULT_OPTIONS.classes ?? []), "dh-compact-adversary"],
        position: {
          width: 380,
          height: 760
        }
      },
      { inplace: false }
    );

    static PARTS = foundry.utils.mergeObject(
      foundry.utils.deepClone(BaseAdversarySheet.PARTS),
      {
        header: {
          template: `modules/${MODULE_ID}/templates/parts/header.hbs`
        },
        sidebar: {
          template: `modules/${MODULE_ID}/templates/parts/footer.hbs`
        },
        features: {
          template: `modules/${MODULE_ID}/templates/parts/features.hbs`,
          scrollable: [".compact-tab-scroll"]
        },
        effects: {
          template: `modules/${MODULE_ID}/templates/parts/effects.hbs`,
          scrollable: [".compact-tab-scroll"]
        },
        notes: {
          template: `modules/${MODULE_ID}/templates/parts/notes.hbs`,
          scrollable: [".compact-tab-scroll"]
        }
      },
      { inplace: false }
    );

    async _prepareContext(options) {
      const context = await super._prepareContext(options);

      context.compact = {
        thresholdMajor: this.document.system.damageThresholds?.major ?? 0,
        thresholdSevere: this.document.system.damageThresholds?.severe ?? 0,
        hitPoints: this.document.system.resources?.hitPoints,
        stress: this.document.system.resources?.stress,
        attackBonus: this.document.system.attack?.roll?.bonus,
        criticalThreshold: this.document.system.criticalThreshold,
        hasExperiences: !foundry.utils.isEmpty(this.document.system.experiences)
      };

      return context;
    }

    async _onRender(context, options) {
      await super._onRender(context, options);
      this.#expandCompactDescriptions();
    }

    #expandCompactDescriptions() {
      for (const element of this.element.querySelectorAll(".tab.features .inventory-item .extensible")) {
        element.classList.add("extended");
      }
    }
  };
}
