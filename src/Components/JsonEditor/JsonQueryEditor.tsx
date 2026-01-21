import React, { useEffect, useRef, useState } from "react";
import Editor, { OnMount, Monaco } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import { getCompletionProvider } from "@reductstore/reduct-query-monaco";
import { Button, Modal, Tooltip } from "antd";
import { APIError, Client, QueryOptions } from "reduct-js";
import {
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

interface ValidationContext {
  client: Client;
  bucket?: string;
  entry?: string;
  entries?: string[];
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
  const [isExpanded, setIsExpanded] = useState(false);
  const [validationStatus, setValidationStatus] = useState<ValidationStatus>(
    ValidationStatus.Idle,
  );
  const [validationError, setValidationError] = useState<string | undefined>(
    undefined,
  );
  const validationRequestIdRef = useRef(0);

  const validationClient = validationContext?.client;
  const validationBucket = validationContext?.bucket?.trim() || "";
  const validationEntry = validationContext?.entry?.trim() || "";
  const validationEntries = (validationContext?.entries ?? [])
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  const validationEntriesKey = validationEntries.join("|");
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
    editorRef.current?.getAction("editor.action.formatDocument")?.run();
  };

  const handleToggleExpand = () => {
    setIsExpanded((prev) => !prev);
  };

  const containerHeight = typeof height === "number" ? `${height}px` : height;

  useEffect(() => {
    if (!validationClient || !validationBucket) {
      setValidationStatus(ValidationStatus.Idle);
      setValidationError(undefined);
      return;
    }

    const requestId = (validationRequestIdRef.current += 1);

    let isActive = true;
    const timeoutId = window.setTimeout(async () => {
      if (!isActive || validationRequestIdRef.current !== requestId) {
        return;
      }
      setValidationStatus(ValidationStatus.Loading);
      setValidationError(undefined);

      const parseResult = processWhenCondition(value, validationIntervalValue);
      if (!parseResult.success) {
        if (!isActive || validationRequestIdRef.current !== requestId) {
          return;
        }
        setValidationStatus(ValidationStatus.Invalid);
        setValidationError(parseResult.error || "Invalid condition");
        return;
      }

      try {
        let entryToValidate = validationEntries[0] || validationEntry;
        const bucketInstance =
          await validationClient.getBucket(validationBucket);
        if (!entryToValidate) {
          const entriesList = await bucketInstance.getEntryList();
          entryToValidate = entriesList[0]?.name ?? "";
        }
        if (!entryToValidate) {
          if (!isActive || validationRequestIdRef.current !== requestId) {
            return;
          }
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
          undefined,
          undefined,
          options,
        );
        await it.next();

        if (!isActive || validationRequestIdRef.current !== requestId) {
          return;
        }
        setValidationStatus(ValidationStatus.Valid);
        setValidationError(undefined);
      } catch (err) {
        if (!isActive || validationRequestIdRef.current !== requestId) {
          return;
        }
        const message =
          err instanceof APIError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Invalid condition";
        setValidationStatus(ValidationStatus.Invalid);
        setValidationError(message || "Invalid condition");
      }
    }, 1000);

    return () => {
      isActive = false;
      window.clearTimeout(timeoutId);
    };
  }, [
    value,
    validationClient,
    validationBucket,
    validationEntry,
    validationEntriesKey,
    validationIntervalValue,
  ]);

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
        <span className="jsonQueryEditorValidationMuted">
          Select bucket to validate condition
        </span>
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

    // validation is tested with limit = 1 but an error may still occur when executing the query
    if (validationStatus === ValidationStatus.Valid && !error) {
      return (
        <>
          <span className="jsonQueryEditorValidationOk">✓</span>
          <span>Valid condition</span>
        </>
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

    return null;
  };

  const renderEditorShell = (style?: React.CSSProperties) => (
    <div className="jsonQueryEditorContainer" style={style}>
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
        renderEditorShell({ height: containerHeight })
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
