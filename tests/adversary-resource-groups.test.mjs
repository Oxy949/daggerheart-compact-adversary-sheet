import assert from "node:assert/strict";
import test from "node:test";

import {
  addAdversaryResourceGroup,
  buildAdversaryResourceGroupsContext,
  normalizeAdversaryResourceGroupsState,
  removeAdversaryResourceGroup,
  renameAdversaryResourceGroup,
  updateAdversaryResourceGroupValue
} from "../scripts/adversary-resource-groups.js";
import { buildResourceTrack } from "../scripts/utils.js";

function createResources({ hitPoints = 6, hitPointsValue = 2, stress = 3, stressValue = 1 } = {}) {
  return {
    hitPoints: buildResourceTrack("hitPoints", { max: hitPoints, value: hitPointsValue }),
    stress: buildResourceTrack("stress", { max: stress, value: stressValue })
  };
}

function createDocument(stored) {
  return {
    getFlag: () => stored
  };
}

test("starts with only the system-backed primary resource group", () => {
  const resources = createResources();
  const context = buildAdversaryResourceGroupsContext(createDocument(undefined), resources);

  assert.equal(context.hasMultiple, false);
  assert.equal(context.groups.length, 1);
  assert.equal(context.groups[0].isPrimary, true);
  assert.equal(context.groups[0].resources, resources);
});

test("adds an independent empty group without copying primary damage", () => {
  const resources = createResources({ hitPointsValue: 4, stressValue: 2 });
  const initial = normalizeAdversaryResourceGroupsState(undefined, resources);
  const stored = addAdversaryResourceGroup(initial, "second");
  const context = buildAdversaryResourceGroupsContext(createDocument(stored), resources);

  assert.equal(context.groups[0].resources.hitPoints.value, 4);
  assert.equal(context.groups[0].resources.stress.value, 2);
  assert.equal(context.groups[1].resources.hitPoints.value, 0);
  assert.equal(context.groups[1].resources.stress.value, 0);
});

test("updates, names, and removes only the selected additional group", () => {
  const resources = createResources();
  let state = normalizeAdversaryResourceGroupsState(undefined, resources);
  state = addAdversaryResourceGroup(state, "second");
  state = addAdversaryResourceGroup(state, "third");
  state = renameAdversaryResourceGroup(state, "primary", "Red");
  state = renameAdversaryResourceGroup(state, "second", "Blue");
  state = updateAdversaryResourceGroupValue(state, "second", "hitPoints", 3, 6);
  state = removeAdversaryResourceGroup(state, "third");

  assert.equal(state.primaryName, "Red");
  assert.deepEqual(state.groups, [{
    hitPoints: 3,
    id: "second",
    name: "Blue",
    stress: 0
  }]);
});

test("hides zero-maximum stress in every group and clamps stale stored values", () => {
  const resources = createResources({ stress: 0, stressValue: 0 });
  const stored = {
    groups: [{ id: "second", name: "Blue", hitPoints: 99, stress: 3 }],
    primaryName: "Red",
    version: 1
  };
  const context = buildAdversaryResourceGroupsContext(createDocument(stored), resources);

  assert.equal(context.groups[1].resources.hitPoints.value, 6);
  assert.equal(context.groups[1].resources.stress.max, 0);
  assert.equal(context.groups[1].resources.stress.value, 0);
  assert.deepEqual(context.groups[1].resources.stress.slots, []);
});

test("drops malformed and duplicate stored group ids", () => {
  const state = normalizeAdversaryResourceGroupsState({
    groups: [
      { id: "same", hitPoints: 1 },
      { id: "same", hitPoints: 2 },
      { id: "primary", hitPoints: 3 },
      { id: "", hitPoints: 4 }
    ]
  }, createResources());

  assert.equal(state.groups.length, 1);
  assert.equal(state.groups[0].id, "same");
  assert.equal(state.groups[0].hitPoints, 1);
});
