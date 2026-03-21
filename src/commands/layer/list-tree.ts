import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON } from '../../io/project-io.js';
import { getChildLayers } from '../../core/layer-engine.js';
import { formatOutput, makeResult } from '../../utils/output-formatter.js';
import type { LayerInfo } from '../../types/canvas.js';

export default class LayerListTree extends BaseCommand {
  static override description = 'Display layer hierarchy as a tree';

  static override flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({ char: 'c', description: 'Canvas name', required: true }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(LayerListTree);
    const projectPath = getProjectPath(flags.project);

    const canvas = readCanvasJSON(projectPath, flags.canvas);

    interface TreeNode {
      id: string; name: string; type: string; visible: boolean;
      opacity: number; blendMode: string; clipping: boolean; depth: number;
      children?: TreeNode[];
    }

    const buildTree = (layers: LayerInfo[], parentId: string | null, depth: number): TreeNode[] => {
      const children = getChildLayers(layers, parentId)
        .sort((a, b) => a.order - b.order);
      return children.map((layer) => ({
        id: layer.id,
        name: layer.name,
        type: layer.isGroup ? 'group' : layer.type,
        visible: layer.visible,
        opacity: layer.opacity,
        blendMode: layer.blendMode,
        clipping: layer.clipping ?? false,
        depth,
        children: layer.isGroup ? buildTree(layers, layer.id, depth + 1) : undefined,
      }));
    };

    const tree = buildTree(canvas.layers, null, 0);

    const result = makeResult('layer:list-tree', { canvas: flags.canvas }, { tree, layerCount: canvas.layers.length }, startTime);
    const format = this.getOutputFormat(flags);
    formatOutput(format, result, () => {
      const printLayer = (node: TreeNode, indent: string) => {
        const icon = node.type === 'group' ? '[G]' : node.clipping ? '[C]' : '   ';
        const vis = node.visible ? ' ' : 'H';
        console.log(`${indent}${icon} ${vis} ${node.name} (${node.id}) blend:${node.blendMode} opacity:${node.opacity}`);
        if (node.children) {
          for (const child of node.children) {
            printLayer(child, indent + '  ');
          }
        }
      };
      for (const node of tree) {
        printLayer(node, '');
      }
    });
  }
}
