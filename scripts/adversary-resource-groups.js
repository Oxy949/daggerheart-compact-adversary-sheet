import { MODULE_ID } from "./constants.js";
import { buildResourceTrack, clampNumber } from "./utils.js";

export const ADVERSARY_RESOURCE_GROUPS_FLAG = "adversaryResourceGroups";
export const PRIMARY_ADVERSARY_RESOURCE_GROUP_ID = "primary";

const STATE_VERSION = 1;
const MAX_NAME_LENGTH = 80;

export function buildAdversaryResourceGroupsContext(document, primaryResources) {
  const state = readAdversaryResourceGroupsState(document, primaryResources);
  const additionalGroups = state.groups.map((group, index) => ({
    extraId: group.id,
    id: group.id,
    index: index + 2,
    isPrimary: false,
    name: group.name,
    resources: buildAdditionalResources(group, primaryResources)
  }));

  return {
    groups: [
      {
        extraId: null,
        id: PRIMARY_ADVERSARY_RESOURCE_GROUP_ID,
        index: 1,
        isPrimary: true,
        name: state.primaryName,
        resources: primaryResources
      },
      ...additionalGroups
    ],
    hasMultiple: additionalGroups.length > 0,
    state
  };
}

export function readAdversaryResourceGroupsState(document, primaryResources) {
  const stored = document?.getFlag?.(MODULE_ID, ADVERSARY_RESOURCE_GROUPS_FLAG)
    ?? document?.flags?.[MODULE_ID]?.[ADVERSARY_RESOURCE_GROUPS_FLAG];

  return normalizeAdversaryResourceGroupsState(stored, primaryResources);
}

export function normalizeAdversaryResourceGroupsState(stored, primaryResources) {
  const maxima = getResourceMaxima(primaryResources);
  const seenIds = new Set();
  const groups = [];

  for (const candidate of Array.isArray(stored?.groups) ? stored.groups : []) {
    const id = normalizeId(candidate?.id);
    if (!id || id === PRIMARY_ADVERSARY_RESOURCE_GROUP_ID || seenIds.has(id)) continue;

    seenIds.add(id);
    groups.push({
      hitPoints: clampNumber(candidate?.hitPoints, 0, maxima.hitPoints),
      id,
      name: normalizeName(candidate?.name),
      stress: clampNumber(candidate?.stress, 0, maxima.stress)
    });
  }

  return {
    groups,
    primaryName: normalizeName(stored?.primaryName),
    version: STATE_VERSION
  };
}

export function addAdversaryResourceGroup(state, id) {
  const normalizedId = normalizeId(id);
  if (!normalizedId || normalizedId === PRIMARY_ADVERSARY_RESOURCE_GROUP_ID) return state;
  if (state.groups.some((group) => group.id === normalizedId)) return state;

  return {
    ...state,
    groups: [
      ...state.groups,
      {
        hitPoints: 0,
        id: normalizedId,
        name: "",
        stress: 0
      }
    ]
  };
}

export function removeAdversaryResourceGroup(state, id) {
  const groups = state.groups.filter((group) => group.id !== id);
  return groups.length === state.groups.length ? state : { ...state, groups };
}

export function renameAdversaryResourceGroup(state, id, name) {
  const normalizedName = normalizeName(name);

  if (id === PRIMARY_ADVERSARY_RESOURCE_GROUP_ID) {
    return normalizedName === state.primaryName
      ? state
      : { ...state, primaryName: normalizedName };
  }

  let changed = false;
  const groups = state.groups.map((group) => {
    if (group.id !== id || group.name === normalizedName) return group;
    changed = true;
    return { ...group, name: normalizedName };
  });

  return changed ? { ...state, groups } : state;
}

export function updateAdversaryResourceGroupValue(state, id, resourceKey, value, max) {
  if (!["hitPoints", "stress"].includes(resourceKey)) return state;

  const nextValue = clampNumber(value, 0, Math.max(Number(max) || 0, 0));
  let changed = false;
  const groups = state.groups.map((group) => {
    if (group.id !== id || group[resourceKey] === nextValue) return group;
    changed = true;
    return { ...group, [resourceKey]: nextValue };
  });

  return changed ? { ...state, groups } : state;
}

function buildAdditionalResources(group, primaryResources) {
  return {
    hitPoints: buildResourceTrack("hitPoints", {
      max: primaryResources.hitPoints.max,
      value: group.hitPoints
    }),
    stress: buildResourceTrack("stress", {
      max: primaryResources.stress.max,
      value: group.stress
    })
  };
}

function getResourceMaxima(primaryResources = {}) {
  return {
    hitPoints: Math.max(Number(primaryResources.hitPoints?.max) || 0, 0),
    stress: Math.max(Number(primaryResources.stress?.max) || 0, 0)
  };
}

function normalizeId(value) {
  return typeof value === "string" ? value.trim().slice(0, 64) : "";
}

function normalizeName(value) {
  return typeof value === "string" ? value.trim().slice(0, MAX_NAME_LENGTH) : "";
}
