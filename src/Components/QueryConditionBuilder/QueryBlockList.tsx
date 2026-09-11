import { ReactNode } from "react";
import SortableCard from "./SortableCard";
import SortableList from "./SortableList";

export interface BuilderBlock {
  id: string;
  removeLabel?: string;
  removable?: boolean;
  onRemove?: () => void;
  enabled: boolean;
  onToggleEnabled: () => void;
  kindSelector?: ReactNode;
  content: ReactNode;
}

interface QueryBlockListProps {
  blocks: BuilderBlock[];
  onReorderBlock: (fromIndex: number, toIndex: number) => void;
  addStageMenu: ReactNode;
}

export default function QueryBlockList({
  blocks,
  onReorderBlock,
  addStageMenu,
}: QueryBlockListProps) {
  return (
    <div>
      <SortableList
        items={blocks}
        onReorder={onReorderBlock}
        renderItem={(block, index) => (
          <SortableCard
            key={block.id}
            id={block.id}
            label={`Stage ${index + 1}`}
            removeLabel={block.removeLabel}
            removable={block.removable}
            onRemove={block.onRemove ?? (() => {})}
            enabled={block.enabled}
            onToggleEnabled={block.onToggleEnabled}
            kindSelector={block.kindSelector}
          >
            {block.content}
          </SortableCard>
        )}
      />
      <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
        {addStageMenu}
      </div>
    </div>
  );
}
