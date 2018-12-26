import * as vscode from "vscode";

//import { SymbolOutlineProvider } from "./symbolOutline";
import { ProjectTreeProvider } from "./projectTree";

export function activate(context: vscode.ExtensionContext) {
  const symbolOutlineProvider = new SymbolOutlineProvider(context);
}
