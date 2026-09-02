import {
  DEFAULT_WINDOWS,
  MODULE_ID,
  NPC_TEMPLATE_PARTIALS,
  SETTING_KEYS
} from "./constants.js";
import {
  bindCompactSheetChrome,
  buildTabNavContext,
  closeCompactRenderState,
  createCompactDefaultOptions,
  createCompactParts,
  createTemplatePart,
  normalizeCompactFeatureRows,
  prepareCompactRender
} from "./compact-sheet-helpers.js";
import { buildCompactNpcContext } from "./utils.js";

const TAB_NAV_ENTRIES = Object.freeze([
  { id: "notes", icon: "fa-solid fa-note-sticky" },
  { id: "features", icon: "fa-solid fa-list" }
]);

export function createCompactNpcSheetClass(BaseNpcSheet) {
  return class CompactNpcSheet extends BaseNpcSheet {
    #renderController = null;

    static DEFAULT_OPTIONS = createCompactDefaultOptions(BaseNpcSheet, DEFAULT_WINDOWS.npc);

    static PARTS = createCompactParts(BaseNpcSheet, {
      art: createTemplatePart(NPC_TEMPLATE_PARTIALS.art),
      header: createTemplatePart(NPC_TEMPLATE_PARTIALS.header),
      tabs: createTemplatePart(NPC_TEMPLATE_PARTIALS.navigation),
      features: createTemplatePart(NPC_TEMPLATE_PARTIALS.features, { scrollable: true }),
      notes: createTemplatePart(NPC_TEMPLATE_PARTIALS.notes, { scrollable: true })
    });

    async _prepareContext(options) {
      const context = await super._prepareContext(options);
      context.compact = {
        ...buildCompactNpcContext(this.document),
        showAttribution: context.showAttribution !== false,
        showInteractionButtons: game.settings.get(MODULE_ID, SETTING_KEYS.showAdversaryInteractionButtons),
        tabNav: buildTabNavContext(context.tabs, TAB_NAV_ENTRIES)
      };
      return context;
    }

    async _onRender(context, options) {
      await super._onRender(context, options);
      this.#renderController = prepareCompactRender(this, this.#renderController, context);
      normalizeCompactFeatureRows(this.element, this.#renderController.signal);
      bindCompactSheetChrome(this, this.#renderController.signal);
    }

    async close(options = {}) {
      const renderState = closeCompactRenderState(this.#renderController);
      this.#renderController = renderState.renderController;
      return super.close(options);
    }
  };
}
