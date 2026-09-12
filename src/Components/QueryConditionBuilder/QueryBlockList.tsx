import { ReactNode } from "react";
import { Button, Tooltip } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import SortableCard from "./SortableCard";
import SortableList from "./SortableList";

// Kept in sync with ConditionListEditor's own "Select a bucket and entries
// first" hint, so every !sourceReady tooltip in the builder reads the same.
const SELECT_SOURCE_HINT = "Select a bucket and entries first";

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
  // Whether inserting a new stage is currently allowed - when false, the
  // insert-here buttons stay visible but disabled instead of disappearing,
  // so the layout doesn't shift around as a bucket/entry gets picked.
  sourceReady: boolean;
  onReorderBlock: (fromIndex: number, toIndex: number) => void;
  addStageMenu: ReactNode;
}

function InsertStageButton({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="stageInsertRow">
      <Tooltip title={disabled ? SELECT_SOURCE_HINT : ""}>
        {/* A disabled Button doesn't receive pointer events, so wrapping it
            directly stops the Tooltip's hover trigger from ever firing -
            this extra span still does. */}
        <span>
          <Button
            aria-label="Insert stage here"
            shape="circle"
            size="small"
            className="stageInsertButton"
            icon={<PlusOutlined />}
            disabled={disabled}
            onClick={onClick}
          />
        </span>
      </Tooltip>
    </div>
  );
}

export default function QueryBlockList({
  blocks,
  sourceReady,
  onReorderBlock,
  addStageMenu,
}: QueryBlockListProps) {
  return (
    <div>
      {blocks[0] && (
        <InsertStageButton
          disabled={!sourceReady}
          onClick={blocks[0].onAddBefore ?? (() => {})}
        />
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
            canInsert={sourceReady}
            kindSelector={block.kindSelector}
          >
            {block.content}
          </SortableCard>
        )}
        renderBetween={(block) => (
          <InsertStageButton
            disabled={!sourceReady}
            onClick={block.onAddAfter ?? (() => {})}
          />
        )}
      />
      <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
        {addStageMenu}
      </div>
    </div>
  );
}
