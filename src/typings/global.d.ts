declare type TreeNode = {
  type: 'dir' | 'file';
  name: string;
  children?: TreeNode[];
  content?: unknown;
};

declare type Item = Record<string, unknown>;

declare type ChatAppItemConfig = {
  key: string;
  label: string;
  needConfigKeys: Item[];
};