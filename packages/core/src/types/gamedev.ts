export type GameEngine = 'godot' | 'unity' | 'generic';

export interface SpriteFrameExport {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  duration: number;
}

export interface AnimationExport {
  name: string;
  frames: SpriteFrameExport[];
  direction: 'forward' | 'reverse' | 'pingpong';
  loop: boolean;
  fps: number;
}

export interface GodotSpriteFrames {
  resourceType: 'SpriteFrames';
  animations: Array<{
    name: string;
    speed: number;
    loop: boolean;
    frames: Array<{
      texture: string;
      duration: number;
      region: { x: number; y: number; w: number; h: number };
    }>;
  }>;
}

export interface GodotTileSetResource {
  resourceType: 'TileSet';
  tileSize: { width: number; height: number };
  texture: string;
  tiles: Array<{ id: number; region: { x: number; y: number; w: number; h: number } }>;
}

export interface UnitySpriteSheet {
  name: string;
  texture: string;
  sprites: Array<{
    name: string;
    rect: { x: number; y: number; w: number; h: number };
    pivot: { x: number; y: number };
  }>;
  animations: Array<{
    name: string;
    frameRate: number;
    loop: boolean;
    sprites: string[];
  }>;
}

export interface GamedevExportOptions {
  engine: GameEngine;
  canvas: string;
  includeAnimations: boolean;
  includeTileset: boolean;
  scale: number;
  outputDir: string;
}

// Animation State Machine types

export interface AnimationTransition {
  fromState: string;
  toState: string;
  condition: string;
}

export interface AnimationState {
  name: string;
  tagName: string;
  transitions: AnimationTransition[];
}

export interface AnimationStateMachine {
  name: string;
  states: AnimationState[];
  initialState: string;
}

export interface GodotAnimationTree {
  resourceType: 'AnimationNodeStateMachine';
  nodes: Array<{ name: string; animation: string; position: { x: number; y: number } }>;
  transitions: Array<{ from: string; to: string; condition: string }>;
}

export interface UnityAnimatorController {
  name: string;
  layers: Array<{
    name: string;
    defaultState: string;
    states: Array<{
      name: string;
      clip: string;
      transitions: Array<{ destinationState: string; condition: string }>;
    }>;
  }>;
}
