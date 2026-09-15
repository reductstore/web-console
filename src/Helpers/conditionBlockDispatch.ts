import { Dispatch } from "react";
import { BuilderAction } from "./builderReducer";

type ConditionBlockScopedAction = Extract<
  BuilderAction,
  { blockId: string; type: `condition/${string}` }
>;
type ConditionBlockEditorAction = {
  [Action in ConditionBlockScopedAction as Action["type"]]: Omit<
    Action,
    "blockId"
  >;
}[ConditionBlockScopedAction["type"]];

type ConditionBlockEditorDispatch = Dispatch<ConditionBlockEditorAction>;

export function conditionBlockDispatch(
  blockId: string,
  dispatch: Dispatch<BuilderAction>,
): ConditionBlockEditorDispatch {
  return (action) => {
    dispatch({ ...action, blockId } as BuilderAction);
  };
}
