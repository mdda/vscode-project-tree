import * as vscode from "vscode"; 

//import { SymbolOutlineProvider } from "./symbolOutline";
import { ProjectTreeProvider } from "./projectTree";

export function activate(context: vscode.ExtensionContext) {
  //console.log(context);
  Object.keys(context).forEach( k => {
    console.log(k, context[k]);
  });
  const projectTreeProvider = new ProjectTreeProvider(context);
}
