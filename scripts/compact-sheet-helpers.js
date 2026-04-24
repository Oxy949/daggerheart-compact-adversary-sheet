import {
  ART_EDIT_SELECTOR,
  FEATURE_DESCRIPTION_SELECTOR,
  SCROLLABLE_PANEL_SELECTOR
} from "./constants.js";

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
