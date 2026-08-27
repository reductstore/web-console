import React, { useEffect, useRef, useState } from "react";
import Editor, { OnMount, Monaco } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import { getCompletionProvider } from "@reductstore/reduct-query-monaco";
import { Button, Modal, Tooltip } from "antd";
import { APIError, Client, QueryOptions } from "reduct-js";
import {
  ExperimentOutlined,
  CompressOutlined,
  ExpandOutlined,
  FormatPainterOutlined,
} from "@ant-design/icons";
import { processWhenCondition } from "../../Helpers/json5Utils";
import "./JsonQueryEditor.css";

enum ValidationStatus {
  Idle = "idle",
  Loading = "loading",
  Valid = "valid",
  Warning = "warning",
  Invalid = "invalid",
}

const MIN_INLINE_EDITOR_HEIGHT = 100;
const MAX_INLINE_EDITOR_VIEWPORT_RATIO = 0.8;
const KEYBOARD_RESIZE_STEP = 16;

interface ValidationContext {
  client: Client;
  bucket?: string;
  entry?: string;
  entries?: string[];
  requireEntrySelection?: boolean;
  start?: bigint;
  end?: bigint;
  intervalValue?: string | null;
}

interface JsonQueryEditorProps {
  value: string;
  onChange: (value: string) => void;
  height?: number | string;
  error?: string;
  readOnly?: boolean;
  validationContext?: ValidationContext;
}

// Global flag to track if completion provider has been registered
let isCompletionProviderRegistered = false;

type JsonDefaults = {
  setDiagnosticsOptions: (options: { validate?: boolean }) => void;
  setModeConfiguration: (modeConfiguration: {
    completionItems?: boolean;
    hovers?: boolean;
    documentSymbols?: boolean;
    documentFormattingEdits?: boolean;
    documentRangeFormattingEdits?: boolean;
    tokens?: boolean;
    colors?: boolean;
    foldingRanges?: boolean;
    diagnostics?: boolean;
    selectionRanges?: boolean;
  }) => void;
};

export function JsonQueryEditor({
  value,
  onChange,
  height = 120,
  error,
  readOnly = false,
  validationContext,
}: JsonQueryEditorProps) {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const inlineContainerRef = useRef<HTMLDivElement | null>(null);
  const stopPointerResizeRef = useRef<(() => void) | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [manualHeight, setManualHeight] = useState<number | undefined>();
  const [validationStatus, setValidationStatus] = useState<ValidationStatus>(
    ValidationStatus.Idle,
  );
  const [validationError, setValidationError] = useState<string | undefined>(
    undefined,
  );
  const validationRequestIdRef = useRef(0);
  const lastValidatedKeyRef = useRef<string>("");

  const validationClient = validationContext?.client;
  const validationBucket = validationContext?.bucket?.trim() || "";
  const validationEntry = validationContext?.entry?.trim() || "";
  const validationEntries = (validationContext?.entries ?? [])
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  const requireEntrySelection =
    validationContext?.requireEntrySelection ?? false;
  const validationEntriesKey = validationEntries.join("|");
  const validationStart = validationContext?.start;
  const validationEnd = validationContext?.end;
  const validationIntervalValue = validationContext?.intervalValue ?? undefined;

  const handleEditorMount: OnMount = (editor, monacoInstance) => {
    editorRef.current = editor;
  };

  const handleBeforeMount = (monacoInstance: Monaco) => {
    if (!isCompletionProviderRegistered) {
      const jsonDefaults =
        (
          monacoInstance as unknown as {
            json?: { jsonDefaults?: JsonDefaults };
          }
        ).json?.jsonDefaults ??
        (
          monacoInstance as unknown as {
            languages?: { json?: { jsonDefaults?: JsonDefaults } };
          }
        ).languages?.json?.jsonDefaults;
      jsonDefaults?.setDiagnosticsOptions({ validate: false });
      jsonDefaults?.setModeConfiguration({
        completionItems: false,
        hovers: false,
        documentSymbols: false,
        documentFormattingEdits: true,
        documentRangeFormattingEdits: true,
        tokens: true, // keep syntax highlighting
        colors: true,
        foldingRanges: false,
        diagnostics: false,
        selectionRanges: false,
      });
      monacoInstance.languages.registerCompletionItemProvider(
        "json",
        getCompletionProvider(),
      );
      isCompletionProviderRegistered = true;
    }
  };

  const handleChange = (newValue: string | undefined) => {
    onChange(newValue ?? "");
  };

  const handleFormat = () => {
    const editor = editorRef.current;
    if (!editor) return;
    const model = editor.getModel();
    if (!model) return;
    const hadTrailingNewline = model.getValue().endsWith("\n");
    const action = editor.getAction("editor.action.formatDocument");
    if (!action) return;
    action.run().then(() => {
      if (hadTrailingNewline) {
        const currentValue = editorRef.current?.getModel()?.getValue();
        if (currentValue !== undefined && !currentValue.endsWith("\n")) {
          onChange(currentValue + "\n");
        }
      }
    });
  };

  const handleToggleExpand = () => {
    setIsExpanded((prev) => !prev);
  };

  const getMaximumEditorHeight = () =>
    Math.max(
      MIN_INLINE_EDITOR_HEIGHT,
      Math.floor(window.innerHeight * MAX_INLINE_EDITOR_VIEWPORT_RATIO),
    );

  const clampEditorHeight = (nextHeight: number) =>
    Math.min(
      getMaximumEditorHeight(),
      Math.max(MIN_INLINE_EDITOR_HEIGHT, Math.round(nextHeight)),
    );

  const getRenderedInlineHeight = () => {
    const container = inlineContainerRef.current;
    const renderedHeight = container?.getBoundingClientRect().height ?? 0;
    if (renderedHeight > 0) return renderedHeight;
    if (container && container.offsetHeight > 0) return container.offsetHeight;
    if (manualHeight !== undefined) return manualHeight;
    if (typeof height === "number") return height;
    if (height.endsWith("px")) return Number.parseFloat(height);
    return MIN_INLINE_EDITOR_HEIGHT;
  };

  const handleResizePointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    if (event.button !== 0) return;
    event.preventDefault();
    stopPointerResizeRef.current?.();

    const { currentTarget: handle, pointerId, clientY: startY } = event;
    const startHeight = clampEditorHeight(getRenderedInlineHeight());
    setManualHeight(startHeight);
    setIsResizing(true);

    try {
      handle.setPointerCapture?.(pointerId);
    } catch {
      // Pointer capture is optional in older browsers and test environments.
    }

    const handlePointerMove = (pointerEvent: PointerEvent) => {
      if (pointerEvent.pointerId !== pointerId) return;
      setManualHeight(
        clampEditorHeight(startHeight + pointerEvent.clientY - startY),
      );
    };

    const stopPointerResize = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerEnd);
      window.removeEventListener("pointercancel", handlePointerEnd);
      try {
        if (handle.hasPointerCapture?.(pointerId)) {
          handle.releasePointerCapture(pointerId);
        }
      } catch {
        // The handle may have been removed while a drag was active.
      }
      stopPointerResizeRef.current = null;
    };

    const handlePointerEnd = (pointerEvent: PointerEvent) => {
      if (pointerEvent.pointerId !== pointerId) return;
      stopPointerResize();
      setIsResizing(false);
    };

    stopPointerResizeRef.current = stopPointerResize;
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerEnd);
    window.addEventListener("pointercancel", handlePointerEnd);
  };

  const handleResizeKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    event.preventDefault();
    const direction = event.key === "ArrowUp" ? -1 : 1;
    setManualHeight((currentHeight) =>
      clampEditorHeight(
        (currentHeight ?? getRenderedInlineHeight()) +
          direction * KEYBOARD_RESIZE_STEP,
      ),
    );
  };

  const effectiveHeight = manualHeight ?? height;
  const containerHeight =
    typeof effectiveHeight === "number"
      ? `${effectiveHeight}px`
      : effectiveHeight;
  const currentHeight = Math.round(
    manualHeight ??
      (typeof height === "number" ? height : MIN_INLINE_EDITOR_HEIGHT),
  );

  useEffect(
    () => () => {
      stopPointerResizeRef.current?.();
    },
    [],
  );

  useEffect(() => {
    const parsed = processWhenCondition(value, validationIntervalValue);
    const key = JSON.stringify([
      parsed.success ? JSON.stringify(parsed.value) : value,
      validationBucket,
      validationEntry,
      validationEntriesKey,
      String(validationStart),
      String(validationEnd),
      validationIntervalValue,
    ]);
    if (key !== lastValidatedKeyRef.current) {
      setValidationStatus(ValidationStatus.Idle);
      setValidationError(undefined);
      lastValidatedKeyRef.current = "";
    }
  }, [
    value,
    validationBucket,
    validationEntry,
    validationEntriesKey,
    validationStart,
    validationEnd,
    validationIntervalValue,
  ]);

  const canValidate =
    !!validationClient &&
    !!validationBucket &&
    (!requireEntrySelection ||
      !!validationEntry ||
      validationEntries.length > 0);

  const handleValidate = async () => {
    if (!validationClient || !validationBucket) return;

    const requestId = (validationRequestIdRef.current += 1);
    setValidationStatus(ValidationStatus.Loading);
    setValidationError(undefined);

    const parseResult = processWhenCondition(value, validationIntervalValue);

    const currentKey = JSON.stringify([
      parseResult.success ? JSON.stringify(parseResult.value) : value,
      validationBucket,
      validationEntry,
      validationEntriesKey,
      String(validationStart),
      String(validationEnd),
      validationIntervalValue,
    ]);

    if (!parseResult.success) {
      if (validationRequestIdRef.current !== requestId) return;
      lastValidatedKeyRef.current = currentKey;
      setValidationStatus(ValidationStatus.Invalid);
      setValidationError(parseResult.error || "Invalid condition");
      return;
    }

    try {
      let entryToValidate = validationEntries[0] || validationEntry;
      if (!entryToValidate) {
        if (requireEntrySelection) {
          if (validationRequestIdRef.current !== requestId) return;
          lastValidatedKeyRef.current = currentKey;
          setValidationStatus(ValidationStatus.Warning);
          setValidationError("Select entry to validate condition");
          return;
        }
      }

      const bucketInstance = await validationClient.getBucket(validationBucket);
      if (!entryToValidate) {
        const entriesList = await bucketInstance.getEntryList();
        entryToValidate = entriesList[0]?.name ?? "";
      }
      if (!entryToValidate) {
        if (validationRequestIdRef.current !== requestId) return;
        lastValidatedKeyRef.current = currentKey;
        setValidationStatus(ValidationStatus.Warning);
        setValidationError("No entries available to validate condition");
        return;
      }

      const whenCondition = {
        ...(parseResult.value ?? {}),
        $limit: 1,
      };
      const options = new QueryOptions();
      options.head = true;
      options.strict = true;
      options.when = whenCondition;

      const it = bucketInstance.query(
        entryToValidate,
        validationStart,
        validationEnd,
        options,
      );
      await it.next();

      if (validationRequestIdRef.current !== requestId) return;
      lastValidatedKeyRef.current = currentKey;
      setValidationStatus(ValidationStatus.Valid);
      setValidationError(undefined);
    } catch (err) {
      if (validationRequestIdRef.current !== requestId) return;
      const message =
        err instanceof APIError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Invalid condition";
      lastValidatedKeyRef.current = currentKey;
      setValidationStatus(ValidationStatus.Invalid);
      setValidationError(message || "Invalid condition");
    }
  };

  const editorOptions = {
    minimap: { enabled: false },
    lineNumbers: "on" as const,
    scrollBeyondLastLine: false,
    wordWrap: "on" as const,
    wrappingStrategy: "advanced" as const,
    automaticLayout: true,
    suggestOnTriggerCharacters: !readOnly,
    quickSuggestions: !readOnly,
    formatOnPaste: false,
    formatOnType: false,
    folding: false,
    glyphMargin: false,
    lineDecorationsWidth: 15,
    lineNumbersMinChars: 3,
    renderLineHighlight: "none" as const,
    scrollbar: {
      vertical: "auto" as const,
      horizontal: "hidden" as const,
      verticalScrollbarSize: 8,
    },
    overviewRulerLanes: 0,
    hideCursorInOverviewRuler: true,
    overviewRulerBorder: false,
    contextmenu: !readOnly,
    tabSize: 2,
    readOnly: readOnly,
  };

  const renderValidationStatus = (readOnly: boolean) => {
    if (readOnly) {
      return (
        <span className="jsonQueryEditorValidationMuted">Read-only mode</span>
      );
    }
    if (!validationClient) {
      return (
        <span className="jsonQueryEditorValidationMuted">
          Validation unavailable
        </span>
      );
    }

    if (!validationBucket) {
      return (
        <span className="jsonQueryEditorValidationMuted">Select bucket</span>
      );
    }

    if (
      requireEntrySelection &&
      !validationEntry &&
      validationEntries.length === 0
    ) {
      return (
        <span className="jsonQueryEditorValidationMuted">Select entry</span>
      );
    }

    if (error) {
      return (
        <>
          <span className="jsonQueryEditorValidationError">✗</span>
          <span>{error}</span>
        </>
      );
    }

    if (validationStatus === ValidationStatus.Loading) {
      return <span>Validating...</span>;
    }

    if (validationStatus === ValidationStatus.Warning) {
      return (
        <>
          <span className="jsonQueryEditorValidationWarning">!</span>
          <span>{validationError || "Validation skipped"}</span>
        </>
      );
    }

    if (validationStatus === ValidationStatus.Invalid) {
      return (
        <>
          <span className="jsonQueryEditorValidationError">✗</span>
          <span>{validationError || "Invalid condition"}</span>
        </>
      );
    }

    if (validationStatus === ValidationStatus.Valid) {
      return (
        <>
          <span className="jsonQueryEditorValidationOk">✓</span>
          <span>Valid condition</span>
        </>
      );
    }

    return null;
  };

  const renderEditorShell = (
    style?: React.CSSProperties,
    resizable = false,
  ) => (
    <div
      ref={resizable ? inlineContainerRef : undefined}
      className={`jsonQueryEditorContainer${resizable ? " isResizable" : ""}${isResizing ? " isResizing" : ""}`}
      style={style}
    >
      <div className="jsonQueryEditorBody">
        <Editor
          height="100%"
          language="json"
          value={value}
          onChange={handleChange}
          onMount={handleEditorMount}
          beforeMount={handleBeforeMount}
          options={editorOptions}
        />
      </div>
      <div className="jsonQueryEditorToolbar">
        {!readOnly && (
          <Tooltip title="Validate condition">
            <Button
              aria-label="Validate condition"
              type="text"
              size="small"
              icon={<ExperimentOutlined />}
              onClick={handleValidate}
              disabled={
                !canValidate || validationStatus === ValidationStatus.Loading
              }
              loading={validationStatus === ValidationStatus.Loading}
              className="jsonQueryEditorValidateBtn"
            />
          </Tooltip>
        )}
        <div className="jsonQueryEditorValidation">
          {renderValidationStatus(readOnly)}
        </div>
        <div className="jsonQueryEditorToolbarActions">
          <Tooltip
            title={readOnly ? "Cannot format in read-only mode" : "Format JSON"}
          >
            <Button
              aria-label="Format JSON"
              type="text"
              size="small"
              icon={<FormatPainterOutlined />}
              onClick={handleFormat}
              disabled={readOnly}
            />
          </Tooltip>
          <Tooltip title={isExpanded ? "Collapse editor" : "Expand editor"}>
            <Button
              aria-label={isExpanded ? "Collapse editor" : "Expand editor"}
              type="text"
              size="small"
              icon={isExpanded ? <CompressOutlined /> : <ExpandOutlined />}
              onClick={handleToggleExpand}
            />
          </Tooltip>
        </div>
      </div>
      {resizable && (
        <div
          className="jsonQueryEditorResizeHandle"
          role="separator"
          aria-label="Resize JSON editor"
          aria-orientation="horizontal"
          aria-valuemin={MIN_INLINE_EDITOR_HEIGHT}
          aria-valuemax={getMaximumEditorHeight()}
          aria-valuenow={currentHeight}
          tabIndex={0}
          onPointerDown={handleResizePointerDown}
          onKeyDown={handleResizeKeyDown}
        >
          <span aria-hidden="true" />
        </div>
      )}
    </div>
  );

  return (
    <div className={`jsonQueryEditor ${error ? "hasError" : ""}`}>
      {isExpanded ? (
        <div
          className="jsonQueryEditorPlaceholder"
          style={{ height: containerHeight }}
        >
          Editing in expanded JSON editor
        </div>
      ) : (
        renderEditorShell({ height: containerHeight }, true)
      )}
      {isExpanded && (
        <Modal
          open={isExpanded}
          onCancel={() => setIsExpanded(false)}
          footer={null}
          closable
          title="Conditional Query Editor"
          maskClosable={false}
          keyboard={false}
          className="jsonQueryEditorModal"
          width="90vw"
          centered
        >
          <div className="jsonQueryEditorModalContent">
            <div
              className={`jsonQueryEditor ${error ? "hasError" : ""}`}
              style={{ height: "100%" }}
            >
              {renderEditorShell({ height: "100%" })}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default JsonQueryEditor;
