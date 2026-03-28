import type { AnimationTag } from '../types/canvas.js';
import type {
  AnimationStateMachine,
  AnimationState,
  AnimationTransition,
  GodotAnimationTree,
  UnityAnimatorController,
} from '../types/gamedev.js';

/**
 * Validate a state machine against available animation tags.
 * Returns an array of error strings (empty if valid).
 */
export function validateStateMachine(
  sm: AnimationStateMachine,
  availableTags: AnimationTag[],
): string[] {
  const errors: string[] = [];
  const tagNames = new Set(availableTags.map((t) => t.name));
  const stateNames = new Set<string>();

  if (!sm.states || sm.states.length === 0) {
    errors.push('State machine has no states');
    return errors;
  }

  for (const state of sm.states) {
    if (stateNames.has(state.name)) {
      errors.push(`Duplicate state name: "${state.name}"`);
    }
    stateNames.add(state.name);

    if (!tagNames.has(state.tagName)) {
      errors.push(`State "${state.name}" references unknown tag "${state.tagName}"`);
    }
  }

  if (!stateNames.has(sm.initialState)) {
    errors.push(`Initial state "${sm.initialState}" not found in states`);
  }

  for (const state of sm.states) {
    for (const t of state.transitions) {
      if (!stateNames.has(t.toState)) {
        errors.push(`Transition from "${state.name}" targets unknown state "${t.toState}"`);
      }
    }
  }

  return errors;
}

/**
 * Build a linear state machine from animation tags.
 * Each tag becomes a state, transitions flow sequentially (tag0 → tag1 → tag2...).
 */
export function buildStateMachineFromTags(
  tags: AnimationTag[],
  transitions?: AnimationTransition[],
): AnimationStateMachine {
  if (tags.length === 0) {
    return { name: 'default', states: [], initialState: '' };
  }

  const states: AnimationState[] = tags.map((tag, i) => {
    const autoTransitions: AnimationTransition[] = [];
    if (i < tags.length - 1) {
      autoTransitions.push({
        fromState: tag.name,
        toState: tags[i + 1].name,
        condition: `to_${tags[i + 1].name}`,
      });
    }
    return {
      name: tag.name,
      tagName: tag.name,
      transitions: autoTransitions,
    };
  });

  if (transitions) {
    for (const t of transitions) {
      const state = states.find((s) => s.name === t.fromState);
      if (state) {
        state.transitions.push(t);
      }
    }
  }

  return {
    name: 'default',
    states,
    initialState: tags[0].name,
  };
}

/**
 * Export state machine as Godot AnimationTree .tres format.
 */
export function exportGodotAnimationTree(sm: AnimationStateMachine): string {
  const lines: string[] = [];
  lines.push('[gd_resource type="AnimationNodeStateMachine" format=3]');
  lines.push('');

  sm.states.forEach((state, i) => {
    lines.push(`[sub_resource type="AnimationNodeAnimation" id="${i + 1}"]`);
    lines.push(`animation = "${state.tagName}"`);
    lines.push('');
  });

  lines.push('[resource]');

  sm.states.forEach((state, i) => {
    const col = i % 4;
    const row = Math.floor(i / 4);
    lines.push(`states/${state.name}/node = SubResource("${i + 1}")`);
    lines.push(`states/${state.name}/position = Vector2(${col * 250}, ${row * 150})`);
  });

  const allTransitions: Array<{ from: string; to: string; condition: string }> = [];
  for (const state of sm.states) {
    for (const t of state.transitions) {
      allTransitions.push({ from: state.name, to: t.toState, condition: t.condition });
    }
  }

  allTransitions.forEach((t, i) => {
    lines.push(`transitions/${i}/from = "${t.from}"`);
    lines.push(`transitions/${i}/to = "${t.to}"`);
    lines.push(`transitions/${i}/condition = "${t.condition}"`);
  });

  if (sm.initialState) {
    lines.push(`start_node = "${sm.initialState}"`);
  }

  return lines.join('\n');
}

/**
 * Build structured Godot AnimationTree data.
 */
export function buildGodotAnimationTree(sm: AnimationStateMachine): GodotAnimationTree {
  const nodes = sm.states.map((state, i) => ({
    name: state.name,
    animation: state.tagName,
    position: { x: (i % 4) * 250, y: Math.floor(i / 4) * 150 },
  }));

  const transitions: GodotAnimationTree['transitions'] = [];
  for (const state of sm.states) {
    for (const t of state.transitions) {
      transitions.push({ from: state.name, to: t.toState, condition: t.condition });
    }
  }

  return { resourceType: 'AnimationNodeStateMachine', nodes, transitions };
}

/**
 * Export state machine as Unity Animator Controller JSON.
 */
export function exportUnityAnimatorController(sm: AnimationStateMachine): UnityAnimatorController {
  const states = sm.states.map((state) => ({
    name: state.name,
    clip: state.tagName,
    transitions: state.transitions.map((t) => ({
      destinationState: t.toState,
      condition: t.condition,
    })),
  }));

  return {
    name: sm.name || 'AnimatorController',
    layers: [
      {
        name: 'Base Layer',
        defaultState: sm.initialState,
        states,
      },
    ],
  };
}

/**
 * Export state machine as generic JSON.
 */
export function exportStateMachineGeneric(sm: AnimationStateMachine): Record<string, unknown> {
  return {
    name: sm.name,
    initialState: sm.initialState,
    stateCount: sm.states.length,
    states: sm.states.map((s) => ({
      name: s.name,
      tagName: s.tagName,
      transitions: s.transitions.map((t) => ({
        to: t.toState,
        condition: t.condition,
      })),
    })),
    generator: 'PixelCreator',
  };
}
