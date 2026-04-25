import {
  ART_EDIT_SELECTOR,
  FEATURE_DESCRIPTION_SELECTOR,
  SCROLLABLE_PANEL_SELECTOR
} from "./constants.js";

const FEATURE_TOGGLE_ACTION = "toggleExtended";
const FEATURE_TOGGLE_TARGET_SELECTOR = ":scope > .inventory-item-header .item-name, :scope > .inventory-item-header .feature-form";

export function createCompactDefaultOptions(BaseSheet, position = {}) {
  return foundry.utils.mergeObject(
    foundry.utils.deepClone(BaseSheet.DEFAULT_OPTIONS),
    {
      classes: [...new Set([...(BaseSheet.DEFAULT_OPTIONS.classes ?? []), "dh-compact"])],
      position: {
        ...(BaseSheet.DEFAULT_OPTIONS.position ?? {}),
        ...position
      }
    },
    { inplace: false }
  );
}

export function createCompactParts(BaseSheet, parts) {
  return foundry.utils.mergeObject(
    foundry.utils.deepClone(BaseSheet.PARTS),
    parts,
    { inplace: false }
  );
}

export function createTemplatePart(template, { scrollable = false } = {}) {
  return scrollable
    ? { template, scrollable: [SCROLLABLE_PANEL_SELECTOR] }
    : { template };
}

export function refreshRenderController(controller) {
  controller?.abort();
  return new AbortController();
}

export function closeRenderController(controller) {
  controller?.abort();
  return null;
}

export function expandFeatureDescriptions(element) {
  if (!element) return;

  for (const description of element.querySelectorAll(FEATURE_DESCRIPTION_SELECTOR)) {
    description.classList.add("extended");
  }
}

export function inlineFeatureDescriptions(element, signal = null) {
  if (!element) return;

  const inlineDescriptions = () => {
    for (const item of element.querySelectorAll(".dhca-tab-panel--features .inventory-item")) {
      inlineFeatureDescription(item);
      scopeFeatureDescriptionToggle(item);
    }
  };

  inlineDescriptions();
  requestAnimationFrame(inlineDescriptions);

  if (!signal || signal.aborted) return;

  let pending = false;
  const observer = new MutationObserver(() => {
    if (pending) return;
    pending = true;

    requestAnimationFrame(() => {
      pending = false;
      inlineDescriptions();
    });
  });

  observer.observe(element, {
    childList: true,
    subtree: true
  });

  signal.addEventListener("abort", () => observer.disconnect(), { once: true });
}

function inlineFeatureDescription(item) {
  if (item.querySelector(":scope > .inventory-item-header .dhca-feature-inline-description")) return;

  const label = item.querySelector(":scope > .inventory-item-header .item-label");
  const description = item.querySelector(":scope > .inventory-item-content.extensible > .invetory-description");
  const firstParagraph = description?.querySelector(":scope > p");

  if (!label || !firstParagraph || !firstParagraph.textContent.trim()) return;

  const featureForm = label.querySelector(".feature-form");
  const featureFormText = featureForm?.querySelector(".recall-value");

  if (featureFormText) {
    featureFormText.textContent = featureFormText.textContent.trimEnd().replace(/:+$/, "");
  }

  removeEmptyTextNodes(featureForm);

  if (featureForm && !featureForm.querySelector(":scope > .dhca-feature-inline-colon")) {
    const colon = document.createElement("span");
    colon.className = "dhca-feature-inline-colon";
    colon.textContent = ":";
    featureForm.append(colon);
  }

  const inlineDescription = document.createElement("span");
  inlineDescription.className = "dhca-feature-inline-description";

  while (firstParagraph.firstChild) {
    inlineDescription.append(firstParagraph.firstChild);
  }

  firstParagraph.remove();
  item.classList.toggle("dhca-feature-inline-only", !description.textContent.trim());
  label.append(document.createTextNode(" "), inlineDescription);
}

function scopeFeatureDescriptionToggle(item) {
  const description = item.querySelector(":scope > .inventory-item-content.extensible");
  if (!description) return;

  const header = item.querySelector(":scope > .inventory-item-header");
  if (header?.dataset.action === FEATURE_TOGGLE_ACTION) {
    delete header.dataset.action;
  }

  for (const target of item.querySelectorAll(FEATURE_TOGGLE_TARGET_SELECTOR)) {
    if (!target.dataset.action) target.dataset.action = FEATURE_TOGGLE_ACTION;
    target.classList.add("dhca-feature-toggle-target");
  }
}

function removeEmptyTextNodes(element) {
  if (!element) return;

  for (const node of Array.from(element.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE && !node.textContent.trim()) {
      node.remove();
    }
  }
}

export function bindCompactImageEditButtons(element, signal, handler) {
  if (!element || !signal) return;

  for (const button of element.querySelectorAll(ART_EDIT_SELECTOR)) {
    button.addEventListener("click", handler, { signal });
  }
}

export function isCompactSheetEditable(sheet) {
  return sheet.isEditable ?? sheet.document.isOwner ?? false;
}

export function openCompactImagePicker(sheet, event) {
  event.preventDefault();
  event.stopPropagation();

  if (!isCompactSheetEditable(sheet)) return null;

  const target = event.currentTarget;
  const attr = target.dataset.dhcaEdit ?? "img";
  const current = foundry.utils.getProperty(sheet.document, attr);
  const { img } = sheet.document.constructor.getDefaultArtwork?.(sheet.document.toObject()) ?? {};

  const picker = new foundry.applications.apps.FilePicker.implementation({
    current,
    type: "image",
    redirectToRoot: img ? [img] : [],
    callback: async (path) => {
      await sheet.document.update({ [attr]: path });
    },
    top: sheet.position.top + 40,
    left: sheet.position.left + 10
  });

  return picker.browse();
}

export function buildTabNavContext(tabs, entries) {
  return entries.map(({ id, icon }) => {
    const tab = tabs?.[id] ?? {};

    return {
      cssClass: tab.cssClass ?? "",
      group: tab.group ?? "",
      icon,
      id: tab.id ?? id,
      label: tab.label ?? id
    };
  });
}
