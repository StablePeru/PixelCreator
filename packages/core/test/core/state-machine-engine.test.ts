import { describe, it, expect } from 'vitest';
import type { AnimationTag } from '../../src/types/canvas.js';
import type { AnimationStateMachine, AnimationTransition } from '../../src/types/gamedev.js';
import {
  validateStateMachine,
  buildStateMachineFromTags,
  exportGodotAnimationTree,
  buildGodotAnimationTree,
  exportUnityAnimatorController,
  exportStateMachineGeneric,
} from '../../src/core/state-machine-engine.js';

const sampleTags: AnimationTag[] = [
  { name: 'idle', from: 0, to: 3, direction: 'forward', repeat: 0 },
  { name: 'walk', from: 4, to: 9, direction: 'forward', repeat: 0 },
  { name: 'run', from: 10, to: 15, direction: 'forward', repeat: 0 },
];

function makeSM(overrides?: Partial<AnimationStateMachine>): AnimationStateMachine {
  return {
    name: 'test-sm',
    initialState: 'idle',
    states: [
      { name: 'idle', tagName: 'idle', transitions: [{ fromState: 'idle', toState: 'walk', condition: 'speed > 0' }] },
      { name: 'walk', tagName: 'walk', transitions: [{ fromState: 'walk', toState: 'run', condition: 'speed > 5' }] },
      { name: 'run', tagName: 'run', transitions: [] },
    ],
    ...overrides,
  };
}

describe('validateStateMachine', () => {
  it('returns empty array for valid state machine', () => {
    const errors = validateStateMachine(makeSM(), sampleTags);
    expect(errors).toHaveLength(0);
  });

  it('detects missing initial state', () => {
    const errors = validateStateMachine(makeSM({ initialState: 'nonexistent' }), sampleTags);
    expect(errors.some((e) => e.includes('Initial state'))).toBe(true);
  });

  it('detects state referencing unknown tag', () => {
    const sm = makeSM({
      states: [
        { name: 'idle', tagName: 'unknown-tag', transitions: [] },
      ],
    });
    const errors = validateStateMachine(sm, sampleTags);
    expect(errors.some((e) => e.includes('unknown tag'))).toBe(true);
  });

  it('detects transition referencing unknown state', () => {
    const sm = makeSM({
      states: [
        { name: 'idle', tagName: 'idle', transitions: [{ fromState: 'idle', toState: 'nonexistent', condition: 'x' }] },
      ],
    });
    const errors = validateStateMachine(sm, sampleTags);
    expect(errors.some((e) => e.includes('unknown state'))).toBe(true);
  });

  it('detects duplicate state names', () => {
    const sm = makeSM({
      states: [
        { name: 'idle', tagName: 'idle', transitions: [] },
        { name: 'idle', tagName: 'walk', transitions: [] },
      ],
    });
    const errors = validateStateMachine(sm, sampleTags);
    expect(errors.some((e) => e.includes('Duplicate'))).toBe(true);
  });

  it('detects empty states', () => {
    const sm = makeSM({ states: [] });
    const errors = validateStateMachine(sm, sampleTags);
    expect(errors.some((e) => e.includes('no states'))).toBe(true);
  });
});

describe('buildStateMachineFromTags', () => {
  it('creates linear chain from tags', () => {
    const sm = buildStateMachineFromTags(sampleTags);
    expect(sm.states).toHaveLength(3);
    expect(sm.initialState).toBe('idle');
    expect(sm.states[0].transitions).toHaveLength(1);
    expect(sm.states[0].transitions[0].toState).toBe('walk');
    expect(sm.states[1].transitions[0].toState).toBe('run');
    expect(sm.states[2].transitions).toHaveLength(0);
  });

  it('sets first tag as initial state', () => {
    const sm = buildStateMachineFromTags(sampleTags);
    expect(sm.initialState).toBe('idle');
  });

  it('handles single tag', () => {
    const sm = buildStateMachineFromTags([sampleTags[0]]);
    expect(sm.states).toHaveLength(1);
    expect(sm.states[0].transitions).toHaveLength(0);
    expect(sm.initialState).toBe('idle');
  });

  it('handles empty tags array', () => {
    const sm = buildStateMachineFromTags([]);
    expect(sm.states).toHaveLength(0);
    expect(sm.initialState).toBe('');
  });

  it('merges custom transitions', () => {
    const custom: AnimationTransition[] = [
      { fromState: 'run', toState: 'idle', condition: 'speed == 0' },
    ];
    const sm = buildStateMachineFromTags(sampleTags, custom);
    const runState = sm.states.find((s) => s.name === 'run');
    expect(runState!.transitions).toHaveLength(1);
    expect(runState!.transitions[0].toState).toBe('idle');
  });
});

describe('exportGodotAnimationTree', () => {
  it('generates valid .tres format', () => {
    const tres = exportGodotAnimationTree(makeSM());
    expect(tres).toContain('[gd_resource type="AnimationNodeStateMachine"');
    expect(tres).toContain('format=3');
  });

  it('includes all states as nodes', () => {
    const tres = exportGodotAnimationTree(makeSM());
    expect(tres).toContain('states/idle/node');
    expect(tres).toContain('states/walk/node');
    expect(tres).toContain('states/run/node');
  });

  it('includes transitions', () => {
    const tres = exportGodotAnimationTree(makeSM());
    expect(tres).toContain('transitions/0/from = "idle"');
    expect(tres).toContain('transitions/0/to = "walk"');
    expect(tres).toContain('transitions/1/from = "walk"');
    expect(tres).toContain('transitions/1/to = "run"');
  });

  it('sets start_node', () => {
    const tres = exportGodotAnimationTree(makeSM());
    expect(tres).toContain('start_node = "idle"');
  });
});

describe('buildGodotAnimationTree', () => {
  it('returns structured data', () => {
    const tree = buildGodotAnimationTree(makeSM());
    expect(tree.resourceType).toBe('AnimationNodeStateMachine');
    expect(tree.nodes).toHaveLength(3);
    expect(tree.transitions).toHaveLength(2);
  });

  it('auto-positions nodes in grid layout', () => {
    const tree = buildGodotAnimationTree(makeSM());
    expect(tree.nodes[0].position).toEqual({ x: 0, y: 0 });
    expect(tree.nodes[1].position).toEqual({ x: 250, y: 0 });
    expect(tree.nodes[2].position).toEqual({ x: 500, y: 0 });
  });
});

describe('exportUnityAnimatorController', () => {
  it('creates controller with one layer', () => {
    const ctrl = exportUnityAnimatorController(makeSM());
    expect(ctrl.layers).toHaveLength(1);
    expect(ctrl.layers[0].name).toBe('Base Layer');
  });

  it('sets correct default state', () => {
    const ctrl = exportUnityAnimatorController(makeSM());
    expect(ctrl.layers[0].defaultState).toBe('idle');
  });

  it('maps transitions to Unity format', () => {
    const ctrl = exportUnityAnimatorController(makeSM());
    const idleState = ctrl.layers[0].states.find((s) => s.name === 'idle');
    expect(idleState!.transitions).toHaveLength(1);
    expect(idleState!.transitions[0].destinationState).toBe('walk');
    expect(idleState!.transitions[0].condition).toBe('speed > 0');
  });

  it('maps all states', () => {
    const ctrl = exportUnityAnimatorController(makeSM());
    expect(ctrl.layers[0].states).toHaveLength(3);
  });
});

describe('exportStateMachineGeneric', () => {
  it('includes all states and transitions', () => {
    const data = exportStateMachineGeneric(makeSM());
    expect(data.stateCount).toBe(3);
    expect(data.initialState).toBe('idle');
    expect((data.states as any[]).length).toBe(3);
  });

  it('includes generator metadata', () => {
    const data = exportStateMachineGeneric(makeSM());
    expect(data.generator).toBe('PixelCreator');
  });
});
