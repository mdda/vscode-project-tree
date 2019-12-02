import * as vscode from "vscode"; 

//import { SymbolOutlineProvider } from "./symbolOutline";
import { ProjectTreeProvider } from "./projectTree";

export function activate(context: vscode.ExtensionContext) {
  // Path information :
  // https://stackoverflow.com/questions/36734983/full-path-to-the-folder-where-the-currently-active-file-in-visual-studio-code

  //console.log(context);
  //Object.keys(context).forEach( k => {
  //  console.log(k, context[k]);
  //});
  //const projectTreeProvider = new ProjectTreeProvider(context);
  
  // https://aka.ms/vscode-eliminating-rootpath
  // 'workspace.rootPath' is deprecated and should no longer be used. 
  // Please use 'workspace.workspaceFolders' instead
  console.log(vscode.workspace.workspaceFolders);
  
  const projectTreeProvider = new ProjectTreeProvider("Not yet");  
}
