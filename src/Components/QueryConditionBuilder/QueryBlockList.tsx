import { ReactNode } from "react";
import { Button } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import SortableCard from "./SortableCard";
import SortableList from "./SortableList";

export interface BuilderBlock {
  id: string;
  removeLabel?: string;
  removable?: boolean;
  onRemove?: () => void;
  enabled: boolean;
  onToggleEnabled: () => void;
  onAddBefore?: () => void;
  onAddAfter?: () => void;
  kindSelector?: ReactNode;
  content: ReactNode;
}

interface QueryBlockListProps {
  blocks: BuilderBlock[];
  onReorderBlock: (fromIndex: number, toIndex: number) => void;
  addStageMenu: ReactNode;
}

function InsertStageButton({ onClick }: { onClick: () => void }) {
  return (
    <div className="stageInsertRow">
      <Button
        aria-label="Insert stage here"
        shape="circle"
        size="small"
        className="stageInsertButton"
        icon={<PlusOutlined />}
        onClick={onClick}
      />
    </div>
  );
}

export default function QueryBlockList({
  blocks,
  onReorderBlock,
  addStageMenu,
}: QueryBlockListProps) {
  return (
    <div>
      {blocks[0]?.onAddBefore && (
        <InsertStageButton onClick={blocks[0].onAddBefore} />
      )}
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
            onAddBefore={block.onAddBefore}
            onAddAfter={block.onAddAfter}
            kindSelector={block.kindSelector}
          >
            {block.content}
          </SortableCard>
        )}
        renderBetween={(block) =>
          block.onAddAfter && <InsertStageButton onClick={block.onAddAfter} />
        }
      />
      <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
        {addStageMenu}
      </div>
    </div>
  );
}
