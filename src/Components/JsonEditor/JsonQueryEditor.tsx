import React, { useRef } from "react";
import Editor, { OnMount, Monaco } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import { getCompletionProvider } from "@reductstore/reduct-query-monaco";
import "./JsonQueryEditor.css";

interface JsonQueryEditorProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  height?: number | string;
  error?: string;
  readOnly?: boolean;
}

// Global flag to track if completion provider has been registered
let isCompletionProviderRegistered = false;

type JsonDefaults = {
  setDiagnosticsOptions: (options: { validate?: boolean }) => void;
  setModeConfiguration: (modeConfiguration: {
    completionItems?: boolean;
    hovers?: boolean;
    documentSymbols?: boolean;
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
  onBlur,
  height = 120,
  error,
  readOnly = false,
}: JsonQueryEditorProps) {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  const handleEditorMount: OnMount = (editor, monacoInstance) => {
    editorRef.current = editor;
    // Handle blur events
    if (onBlur) {
      editor.onDidBlurEditorWidget(() => {
        onBlur();
      });
    }
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
        tokens: true, // keep syntax highlighting
        colors: false,
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

  return (
    <div className={`jsonQueryEditor ${error ? "hasError" : ""}`}>
      <Editor
        height={height}
        language="json"
        value={value}
        onChange={handleChange}
        onMount={handleEditorMount}
        beforeMount={handleBeforeMount}
        options={{
          minimap: { enabled: false },
          lineNumbers: "on",
          scrollBeyondLastLine: false,
          wordWrap: "on",
          wrappingStrategy: "advanced",
          automaticLayout: true,
          suggestOnTriggerCharacters: !readOnly,
          quickSuggestions: !readOnly,
          formatOnPaste: false,
          formatOnType: false,
          folding: false,
          glyphMargin: false,
          lineDecorationsWidth: 5,
          lineNumbersMinChars: 2,
          renderLineHighlight: "none",
          scrollbar: {
            vertical: "auto",
            horizontal: "hidden",
            verticalScrollbarSize: 8,
          },
          overviewRulerLanes: 0,
          hideCursorInOverviewRuler: true,
          overviewRulerBorder: false,
          contextmenu: !readOnly,
          tabSize: 2,
          readOnly: readOnly,
        }}
      />
    </div>
  );
}

export default JsonQueryEditor;
