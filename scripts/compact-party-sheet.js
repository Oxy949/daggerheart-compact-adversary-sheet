import {
  DEFAULT_WINDOWS,
  PARTY_TEMPLATE_PARTIALS
} from "./constants.js";
import {
  bindCompactSheetChrome,
  buildTabNavContext,
  closeCompactRenderState,
  createCompactDefaultOptions,
  createCompactParts,
  createTemplatePart,
  prepareCompactRender
} from "./compact-sheet-helpers.js";
import { buildCompactPartyContext } from "./utils.js";

const TAB_NAV_ENTRIES = Object.freeze([
  { id: "partyMembers", icon: "fa-solid fa-user-group" },
  { id: "inventory", icon: "fa-solid fa-suitcase" },
  { id: "notes", icon: "fa-solid fa-note-sticky" }
]);

export function createCompactPartySheetClass(BasePartySheet) {
  return class CompactPartySheet extends BasePartySheet {
    #renderController = null;

    static DEFAULT_OPTIONS = createCompactDefaultOptions(BasePartySheet, DEFAULT_WINDOWS.party);

    static PARTS = createCompactParts(BasePartySheet, {
      art: createTemplatePart(PARTY_TEMPLATE_PARTIALS.art),
      header: createTemplatePart(PARTY_TEMPLATE_PARTIALS.header),
      tabs: createTemplatePart(PARTY_TEMPLATE_PARTIALS.navigation),
      partyMembers: createTemplatePart(PARTY_TEMPLATE_PARTIALS.partyMembers, { scrollable: true }),
      inventory: createTemplatePart(PARTY_TEMPLATE_PARTIALS.inventory, { scrollable: true }),
      notes: createTemplatePart(PARTY_TEMPLATE_PARTIALS.notes, { scrollable: true })
    });

    async _prepareContext(options) {
      const context = await super._prepareContext(options);
      context.compact = {
        ...buildCompactPartyContext(this.document),
        showInteractionButtons: true,
        tabNav: buildTabNavContext(context.tabs, TAB_NAV_ENTRIES)
      };
      return context;
    }

    async _onRender(context, options) {
      await super._onRender(context, options);
      this.#renderController = prepareCompactRender(this, this.#renderController, context);
      bindCompactSheetChrome(this, this.#renderController.signal);
    }

    async close(options = {}) {
      const renderState = closeCompactRenderState(this.#renderController);
      this.#renderController = renderState.renderController;
      return super.close(options);
    }
  };
}
