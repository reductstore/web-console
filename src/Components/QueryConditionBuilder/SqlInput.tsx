import { CSSProperties } from "react";
import Editor, { Monaco, OnMount } from "@monaco-editor/react";
import { getSqlCompletionProvider } from "@reductstore/reduct-query-monaco";

interface IDisposable {
  dispose(): void;
}

// Kept on window (not a module variable) so it survives Vite's HMR reloads,
// which would otherwise stack a duplicate provider on every reload.
declare global {
  interface Window {
    __sqlCompletionProviderDisposable?: IDisposable;
  }
}

interface SqlInputProps {
  value: string;
  onChange: (value: string) => void;
  style?: CSSProperties;
}

export default function SqlInput({ value, onChange, style }: SqlInputProps) {
  const handleBeforeMount = (monacoInstance: Monaco) => {
    window.__sqlCompletionProviderDisposable?.dispose();
    window.__sqlCompletionProviderDisposable =
      monacoInstance.languages.registerCompletionItemProvider(
        "sql",
        getSqlCompletionProvider(),
      );
  };

  const handleChange = (newValue: string | undefined) => {
    onChange(newValue ?? "");
  };

  const handleMount: OnMount = (editor) => {
    const triggerSuggest = () => {
      editor.trigger("keyboard", "editor.action.triggerSuggest", {});
    };
    editor.onDidFocusEditorText(triggerSuggest);
    editor.onMouseDown(triggerSuggest);
  };

  return (
    <div
      style={{
        position: "relative",
        height: 32,
        border: "1px solid #d9d9d9",
        borderRadius: 6,
        overflow: "hidden",
        ...style,
      }}
    >
      {value === "" && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 4,
            height: "100%",
            display: "flex",
            alignItems: "center",
            color: "rgba(0, 0, 0, 0.25)",
            fontSize: 14,
            pointerEvents: "none",
            zIndex: 1,
          }}
        >
          SELECT * FROM ENTRY()
        </div>
      )}
      <Editor
        height="100%"
        language="sql"
        value={value}
        onChange={handleChange}
        beforeMount={handleBeforeMount}
        onMount={handleMount}
        options={{
          minimap: { enabled: false },
          lineNumbers: "off",
          scrollBeyondLastLine: false,
          wordWrap: "off",
          automaticLayout: true,
          suggestOnTriggerCharacters: true,
          quickSuggestions: true,
          folding: false,
          glyphMargin: false,
          lineDecorationsWidth: 0,
          lineNumbersMinChars: 0,
          renderLineHighlight: "none",
          scrollbar: {
            vertical: "hidden",
            horizontal: "hidden",
          },
          overviewRulerLanes: 0,
          hideCursorInOverviewRuler: true,
          overviewRulerBorder: false,
          contextmenu: false,
          fontSize: 14,
          lineHeight: 20,
          padding: { top: 6, bottom: 6 },
          fixedOverflowWidgets: true,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
        }}
      />
    </div>
  );
}
