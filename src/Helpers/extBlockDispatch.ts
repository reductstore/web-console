import { Dispatch } from "react";
import { BuilderAction } from "./builderReducer";

type ExtBlockScopedAction = Extract<BuilderAction, { blockId: string }>;
type ExtBlockEditorAction = {
  [Action in ExtBlockScopedAction as Action["type"]]: Omit<Action, "blockId">;
}[ExtBlockScopedAction["type"]];

export type ExtBlockEditorDispatch = Dispatch<ExtBlockEditorAction>;

export function extBlockDispatch(
  blockId: string,
  dispatch: Dispatch<BuilderAction>,
): ExtBlockEditorDispatch {
  return (action) => {
    dispatch({ ...action, blockId } as BuilderAction);
  };
}
