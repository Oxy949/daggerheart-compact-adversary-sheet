import {
  ADVERSARY_TEMPLATE_PARTIALS,
  DEFAULT_WINDOWS,
  MODULE_ID,
  SETTING_KEYS
} from "./constants.js";
import {
  ADVERSARY_RESOURCE_GROUPS_FLAG,
  PRIMARY_ADVERSARY_RESOURCE_GROUP_ID,
  addAdversaryResourceGroup,
  buildAdversaryResourceGroupsContext,
  readAdversaryResourceGroupsState,
  removeAdversaryResourceGroup,
  renameAdversaryResourceGroup,
  updateAdversaryResourceGroupValue
} from "./adversary-resource-groups.js";
import {
  bindCompactResourceStepButtons,
  bindResponsiveResourceTracks,
  bindCompactSheetChrome,
  buildTabNavContext,
  closeCompactRenderState,
  createCompactDefaultOptions,
  createCompactParts,
  createTemplatePart,
  handleCompactResourceStep,
  isCompactSheetEditable,
  normalizeCompactFeatureRows,
  prepareCompactRender
} from "./compact-sheet-helpers.js";
import { buildCompactAttributionContext, buildCompactContext, clampNumber } from "./utils.js";

const TAB_NAV_ENTRIES = Object.freeze([
  { id: "features", icon: "fa-solid fa-list" },
  { id: "effects", icon: "fa-solid fa-bolt" },
  { id: "notes", icon: "fa-solid fa-note-sticky" }
]);

const ATTACK_CHAT_ACTION_SELECTOR = ".dhca-header__attack-list .inventory-item-compact .item-name";
const HEADER_RESOURCE_MAX_SELECTOR = ".dhca-header__resource-max[data-dhca-resource-path]";
const HEADER_RESOURCE_VALUE_SELECTOR = ".dhca-header__resource-current[data-dhca-resource-path]";
const ADD_RESOURCE_GROUP_SELECTOR = "[data-dhca-add-adversary-resource-group]";
const REMOVE_RESOURCE_GROUP_SELECTOR = "[data-dhca-remove-adversary-resource-group]";
const RESOURCE_GROUP_NAME_SELECTOR = "[data-dhca-adversary-resource-name]";
const RESOURCE_GROUP_PIP_SELECTOR = "[data-dhca-adversary-resource-value]";

export function createCompactAdversarySheetClass(BaseAdversarySheet) {
  return class CompactAdversarySheet extends BaseAdversarySheet {
    #renderController = null;
    #resourceTrackResizeObserver = null;
    #resourceGroupUpdateQueue = Promise.resolve();

    static DEFAULT_OPTIONS = createCompactDefaultOptions(BaseAdversarySheet, DEFAULT_WINDOWS.adversary);

    static PARTS = createCompactParts(BaseAdversarySheet, {
      art: createTemplatePart(ADVERSARY_TEMPLATE_PARTIALS.art),
      header: createTemplatePart(ADVERSARY_TEMPLATE_PARTIALS.header),
      sidebar: createTemplatePart(ADVERSARY_TEMPLATE_PARTIALS.footer),
      features: createTemplatePart(ADVERSARY_TEMPLATE_PARTIALS.features, { scrollable: true }),
      effects: createTemplatePart(ADVERSARY_TEMPLATE_PARTIALS.effects, { scrollable: true }),
      notes: createTemplatePart(ADVERSARY_TEMPLATE_PARTIALS.notes, { scrollable: true })
    });

    async _prepareContext(options) {
      const context = await super._prepareContext(options);
      const showResourceBlock = game.settings.get(MODULE_ID, SETTING_KEYS.showAdversaryResourceBlock);
      const showAttribution = game.settings.get(MODULE_ID, SETTING_KEYS.showSourceAndArtist)
        && context.showAttribution !== false;
      const attribution = buildCompactAttributionContext(this.document, showAttribution);
      const compactContext = buildCompactContext(this.document);
      const adversaryResourceGroups = buildAdversaryResourceGroupsContext(
        this.document,
        compactContext.resources
      );
      const hasResourceBlockContent = showResourceBlock && (
        compactContext.hasTrackedResources
        || compactContext.thresholds.visible
        || compactContext.criticalThreshold < 20
      );
      context.compact = {
        ...compactContext,
        adversaryResourceGroups,
        attribution,
        hasFooter: hasResourceBlockContent || attribution.visible,
        showInteractionButtons: game.settings.get(MODULE_ID, SETTING_KEYS.showAdversaryInteractionButtons),
        showResourceBlock,
        tabNav: buildTabNavContext(context.tabs, TAB_NAV_ENTRIES),
        useResourcePips: true
      };
      return context;
    }

    async _onRender(context, options) {
      await super._onRender(context, options);
      this.#renderController = prepareCompactRender(this, this.#renderController, context);
      setupAttackNameChatAction(
        this.element,
        context.compact?.showInteractionButtons === true,
        this.#renderController.signal
      );
      normalizeCompactFeatureRows(this.element, this.#renderController.signal);
      normalizeAttackSeparators(this.element);
      bindCompactResourceStepButtons(this.element, this.#renderController.signal, this.#onCompactResourceStep);
      this.#bindAdversaryResourceGroups();
      this.#bindHeaderResourceEdits();
      bindCompactSheetChrome(this, this.#renderController.signal);
      this.#resourceTrackResizeObserver = bindResponsiveResourceTracks(this.element, this.#resourceTrackResizeObserver);
    }

    async close(options = {}) {
      const renderState = closeCompactRenderState(this.#renderController, this.#resourceTrackResizeObserver);
      this.#renderController = renderState.renderController;
      this.#resourceTrackResizeObserver = renderState.resourceTrackResizeObserver;
      return super.close(options);
    }

    #bindHeaderResourceEdits() {
      if (!this.element || !this.#renderController) return;

      const { signal } = this.#renderController;

      for (const value of this.element.querySelectorAll(HEADER_RESOURCE_VALUE_SELECTOR)) {
        value.addEventListener("focus", this.#onHeaderResourceFocus, { signal });
        value.addEventListener("keydown", this.#onHeaderResourceKeydown, { signal });
        value.addEventListener("blur", this.#onHeaderResourceBlur, { signal });
      }

      for (const maxValue of this.element.querySelectorAll(HEADER_RESOURCE_MAX_SELECTOR)) {
        maxValue.addEventListener("click", this.#onHeaderResourceMaxClick, { signal });
        maxValue.addEventListener("contextmenu", this.#onHeaderResourceMaxContextMenu, { signal });
      }
    }

    #isSheetEditable() {
      return isCompactSheetEditable(this);
    }

    #bindAdversaryResourceGroups() {
      if (!this.element || !this.#renderController) return;

      const { signal } = this.#renderController;

      this.element.querySelector(ADD_RESOURCE_GROUP_SELECTOR)
        ?.addEventListener("click", this.#onAddResourceGroup, { signal });

      for (const button of this.element.querySelectorAll(REMOVE_RESOURCE_GROUP_SELECTOR)) {
        button.addEventListener("click", this.#onRemoveResourceGroup, { signal });
      }

      for (const input of this.element.querySelectorAll(RESOURCE_GROUP_NAME_SELECTOR)) {
        input.addEventListener("focus", this.#onResourceGroupNameFocus, { signal });
        input.addEventListener("keydown", this.#onResourceGroupNameKeydown, { signal });
        input.addEventListener("blur", this.#onResourceGroupNameBlur, { signal });
      }

      for (const pip of this.element.querySelectorAll(RESOURCE_GROUP_PIP_SELECTOR)) {
        pip.addEventListener("click", this.#onResourceGroupPip, { signal });
      }
    }

    #onCompactResourceStep = (event) => {
      if (event.currentTarget.dataset.dhcaAdversaryResourceGroupId) {
        return this.#stepAdditionalResource(event);
      }

      return handleCompactResourceStep(this, event);
    };

    #onAddResourceGroup = async (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (!this.#isSheetEditable()) return;

      const button = event.currentTarget;
      button.disabled = true;
      let groupId;

      try {
        await this.#queueResourceGroupUpdate((state) => {
          groupId = createResourceGroupId(state);
          return addAdversaryResourceGroup(state, groupId);
        });
        scheduleResourceGroupNameFocus(this, groupId);
      } finally {
        if (button.isConnected) button.disabled = !this.#isSheetEditable();
      }
    };

    #onRemoveResourceGroup = async (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (!this.#isSheetEditable()) return;

      const button = event.currentTarget;
      const groupId = button.dataset.dhcaRemoveAdversaryResourceGroup;
      if (!groupId) return;

      button.disabled = true;

      try {
        const compact = buildCompactContext(this.document);
        const resourceGroups = buildAdversaryResourceGroupsContext(this.document, compact.resources);
        const group = resourceGroups.groups.find((candidate) => candidate.id === groupId);
        if (!group) return;

        const hasData = Boolean(group.name || group.resources.hitPoints.value || group.resources.stress.value);
        if (hasData && !await confirmResourceGroupRemoval(group)) return;

        await this.#queueResourceGroupUpdate((state) => removeAdversaryResourceGroup(state, groupId));
      } finally {
        if (button.isConnected) button.disabled = !this.#isSheetEditable();
      }
    };

    #onResourceGroupNameFocus = (event) => {
      event.currentTarget.dataset.dhcaOriginalValue = event.currentTarget.value;
    };

    #onResourceGroupNameKeydown = (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        event.currentTarget.blur();
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        event.currentTarget.value = event.currentTarget.dataset.dhcaOriginalValue ?? "";
        event.currentTarget.blur();
      }
    };

    #onResourceGroupNameBlur = async (event) => {
      const input = event.currentTarget;
      const groupId = input.dataset.dhcaAdversaryResourceName;

      if (!this.#isSheetEditable() || !groupId) {
        input.value = input.dataset.dhcaOriginalValue ?? input.value;
        return;
      }

      input.disabled = true;
      input.value = input.value.trim().slice(0, 80);

      try {
        await this.#queueResourceGroupUpdate((state) => (
          renameAdversaryResourceGroup(state, groupId, input.value)
        ));
      } finally {
        if (input.isConnected) input.disabled = !this.#isSheetEditable();
      }
    };

    #onResourceGroupPip = async (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (!this.#isSheetEditable()) return;

      const button = event.currentTarget;
      const groupId = button.dataset.dhcaAdversaryResourceGroupId;
      const resourceKey = button.dataset.dhcaAdversaryResourceKey;
      const selectedValue = Number(button.dataset.dhcaAdversaryResourceValue);

      if (!groupId || !resourceKey || !Number.isFinite(selectedValue)) return;
      button.disabled = true;

      try {
        await this.#queueResourceGroupUpdate((state, resources) => {
          const group = state.groups.find((candidate) => candidate.id === groupId);
          if (!group) return state;

          const nextValue = group[resourceKey] === selectedValue
            ? selectedValue - 1
            : selectedValue;

          return updateAdversaryResourceGroupValue(
            state,
            groupId,
            resourceKey,
            nextValue,
            resources[resourceKey]?.max
          );
        });
      } finally {
        if (button.isConnected) button.disabled = !this.#isSheetEditable();
      }
    };

    async #stepAdditionalResource(event) {
      event.preventDefault();
      event.stopPropagation();
      if (!this.#isSheetEditable()) return;

      const button = event.currentTarget;
      const groupId = button.dataset.dhcaAdversaryResourceGroupId;
      const resourceKey = button.dataset.dhcaResourceStep;
      const direction = Number(button.dataset.direction);

      if (!groupId || !resourceKey || !Number.isFinite(direction) || direction === 0) return;
      button.disabled = true;

      try {
        await this.#queueResourceGroupUpdate((state, resources) => {
          const group = state.groups.find((candidate) => candidate.id === groupId);
          if (!group) return state;

          return updateAdversaryResourceGroupValue(
            state,
            groupId,
            resourceKey,
            group[resourceKey] + direction,
            resources[resourceKey]?.max
          );
        });
      } finally {
        if (button.isConnected) button.disabled = !this.#isSheetEditable();
      }
    }

    #queueResourceGroupUpdate(mutator) {
      const update = async () => {
        const compact = buildCompactContext(this.document);
        const state = readAdversaryResourceGroupsState(this.document, compact.resources);
        const nextState = mutator(state, compact.resources);
        if (!nextState || nextState === state) return;

        if (typeof this.document.setFlag === "function") {
          await this.document.setFlag(MODULE_ID, ADVERSARY_RESOURCE_GROUPS_FLAG, nextState);
          return;
        }

        await this.document.update({
          [`flags.${MODULE_ID}.${ADVERSARY_RESOURCE_GROUPS_FLAG}`]: nextState
        });
      };

      const operation = this.#resourceGroupUpdateQueue.catch(() => {}).then(update);
      this.#resourceGroupUpdateQueue = operation;
      return operation;
    }

    #onHeaderResourceFocus = (event) => {
      event.currentTarget.dataset.dhcaOriginalValue = event.currentTarget.textContent.trim();
    };

    #onHeaderResourceKeydown = (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        event.currentTarget.blur();
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        event.currentTarget.textContent = event.currentTarget.dataset.dhcaOriginalValue ?? "";
        event.currentTarget.blur();
      }
    };

    #onHeaderResourceBlur = async (event) => {
      if (!this.#isSheetEditable()) return;

      const target = event.currentTarget;
      const path = target.dataset.dhcaResourcePath;
      if (!path) return;

      const original = Number(target.dataset.dhcaOriginalValue ?? 0);
      const max = Math.max(Number(target.dataset.dhcaResourceMax ?? 0), 0);
      const nextValue = clampNumber(target.textContent.trim(), 0, max);

      target.textContent = String(nextValue);

      if (nextValue === original) return;

      await this.document.update({ [path]: nextValue });
    };

    #onHeaderResourceMaxClick = (event) => this.#stepHeaderResource(event, 1);

    #onHeaderResourceMaxContextMenu = (event) => this.#stepHeaderResource(event, -1);

    async #stepHeaderResource(event, direction) {
      event.preventDefault();
      event.stopPropagation();

      if (!this.#isSheetEditable()) return;

      const target = event.currentTarget;
      const path = target.dataset.dhcaResourcePath;
      if (!path) return;

      const current = Number(foundry.utils.getProperty(this.document, path) ?? 0);
      const max = Math.max(Number(target.dataset.dhcaResourceMax ?? 0), 0);
      const nextValue = clampNumber(current + direction, 0, max);

      if (nextValue === current) return;

      await this.document.update({ [path]: nextValue });
    }
  };
}

function setupAttackNameChatAction(element, enabled, signal) {
  if (!element) return;

  const attackName = element.querySelector(ATTACK_CHAT_ACTION_SELECTOR);
  if (!attackName) return;

  attackName.classList.toggle("dhca-attack-chat-action", enabled);

  if (!enabled) {
    delete attackName.dataset.action;
    delete attackName.dataset.tooltipText;
    attackName.removeAttribute("role");
    attackName.removeAttribute("tabindex");
    return;
  }

  attackName.dataset.action = "toChat";
  attackName.dataset.tooltipText = game.i18n.localize("DAGGERHEART.UI.Tooltip.sendToChat");
  attackName.setAttribute("role", "button");
  attackName.tabIndex = 0;

  attackName.addEventListener("keydown", onAttackNameChatActionKeydown, { signal });
}

function onAttackNameChatActionKeydown(event) {
  if (event.key !== "Enter" && event.key !== " ") return;

  event.preventDefault();
  event.currentTarget.click();
}

function normalizeAttackSeparators(element) {
  if (!element) return;

  for (const separator of element.querySelectorAll(".dhca-header__attack-list .label > span")) {
    if (separator.textContent.trim() !== "-") continue;
    separator.textContent = "|";
    separator.classList.add("dhca-header__attack-separator");
  }
}

function createResourceGroupId(state) {
  const existingIds = new Set(state.groups.map((group) => group.id));
  let id;

  do {
    id = foundry.utils.randomID();
  } while (!id || id === PRIMARY_ADVERSARY_RESOURCE_GROUP_ID || existingIds.has(id));

  return id;
}

function scheduleResourceGroupNameFocus(sheet, groupId) {
  if (!sheet || !groupId) return;

  let frames = 0;
  const focus = () => {
    const input = Array.from(sheet.element?.querySelectorAll(RESOURCE_GROUP_NAME_SELECTOR) ?? [])
      .find((candidate) => candidate.dataset.dhcaAdversaryResourceName === groupId);

    if (input) {
      input.focus();
      input.select();
      return;
    }

    frames += 1;
    if (frames < 8) requestAnimationFrame(focus);
  };

  requestAnimationFrame(focus);
}

async function confirmResourceGroupRemoval(group) {
  const fallbackName = game.i18n.format("DHCS.Labels.AdversaryResourceNamePlaceholder", {
    number: group.index
  });
  const message = game.i18n.format("DHCS.Dialogs.RemoveAdversaryResourceGroup.Content", {
    name: group.name || fallbackName
  });
  const title = game.i18n.localize("DHCS.Dialogs.RemoveAdversaryResourceGroup.Title");
  const DialogV2 = foundry.applications?.api?.DialogV2;

  if (typeof DialogV2?.confirm === "function") {
    return DialogV2.confirm({
      content: `<p>${escapeHtml(message)}</p>`,
      modal: true,
      rejectClose: false,
      window: { title }
    });
  }

  return globalThis.confirm(message);
}

function escapeHtml(value) {
  if (typeof foundry.utils.escapeHTML === "function") return foundry.utils.escapeHTML(value);

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
