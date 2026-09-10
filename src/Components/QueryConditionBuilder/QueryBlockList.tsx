import { ReactNode } from "react";
import SortableCard from "./SortableCard";
import SortableList from "./SortableList";

export interface BuilderBlock {
  id: string;
  label?: string;
  removeLabel?: string;
  removable?: boolean;
  onRemove?: () => void;
  content: ReactNode;
}

interface QueryBlockListProps {
  blocks: BuilderBlock[];
  onReorderBlock: (fromIndex: number, toIndex: number) => void;
  addStepMenu: ReactNode;
}

export default function QueryBlockList({
  blocks,
  onReorderBlock,
  addStepMenu,
}: QueryBlockListProps) {
  return (
    <div>
      <SortableList
        items={blocks}
        onReorder={onReorderBlock}
        renderItem={(block) => (
          <SortableCard
            key={block.id}
            id={block.id}
            label={block.label}
            removeLabel={block.removeLabel}
            removable={block.removable}
            onRemove={block.onRemove ?? (() => {})}
          >
            {block.content}
          </SortableCard>
        )}
      />
      <span style={{ display: "inline-block", marginTop: 8 }}>
        {addStepMenu}
      </span>
    </div>
  );
}
