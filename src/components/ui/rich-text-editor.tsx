"use client";

import { useEffect, useRef } from "react";
import { Bold, Italic, Link as LinkIcon, List, ListOrdered, Underline } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { sanitizeRichTextHtml } from "@/lib/rich-text";

type RichTextEditorProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

export function RichTextEditor({
  id,
  value,
  onChange,
  placeholder,
  className,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }

    if (editor.innerHTML !== value) {
      editor.innerHTML = value;
    }
  }, [value]);

  const syncValue = () => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }

    onChange(sanitizeRichTextHtml(editor.innerHTML));
  };

  const focusEditor = () => {
    editorRef.current?.focus();
    syncValue();
  };

  const runCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    focusEditor();
  };

  const handleLink = () => {
    const url = window.prompt("Enter a URL");
    if (!url) {
      return;
    }

    runCommand("createLink", url);
  };

  return (
    <div className={cn("rounded-md border border-input bg-transparent", className)}>
      <div className="flex flex-wrap gap-2 border-b border-border p-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => runCommand("bold")}
          aria-label="Bold"
          title="Bold"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => runCommand("italic")}
          aria-label="Italic"
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => runCommand("underline")}
          aria-label="Underline"
          title="Underline"
        >
          <Underline className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => runCommand("insertUnorderedList")}
          aria-label="Bullets"
          title="Bullets"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => runCommand("insertOrderedList")}
          aria-label="Numbers"
          title="Numbers"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onMouseDown={(event) => event.preventDefault()}
          onClick={handleLink}
          aria-label="Link"
          title="Link"
        >
          <LinkIcon className="h-4 w-4" />
        </Button>
      </div>
      <div
        id={id}
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        data-placeholder={placeholder}
        className={cn(
          "min-h-36 w-full px-3 py-2 text-sm outline-none",
          "empty:before:pointer-events-none empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)]",
          "[&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-6"
        )}
        onInput={syncValue}
        onBlur={syncValue}
      />
    </div>
  );
}
