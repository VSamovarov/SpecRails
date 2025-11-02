
import * as vscode from "vscode";
import { structureCommand } from "./commands/structure";

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand(
    "specrails.structure",
    structureCommand
  );
  context.subscriptions.push(disposable);
}

export function deactivate() {}
