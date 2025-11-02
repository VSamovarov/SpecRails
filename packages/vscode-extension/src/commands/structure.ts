
import * as vscode from "vscode";
import { specRails } from "@specrails/core";

export async function structureCommand() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showInformationMessage("No editor open");
    return;
  }

  const text = editor.document.getText(editor.selection) || editor.document.getText();
  const result = await specRails.structure(text);

  const panel = vscode.window.createWebviewPanel(
    "specrailsPreview",
    "SpecRails — Structure",
    vscode.ViewColumn.Beside,
    {}
  );

  panel.webview.html = `
    <h2>Structure Preview</h2>
    <pre>${JSON.stringify(result, null, 2)}</pre>
  `;
}
