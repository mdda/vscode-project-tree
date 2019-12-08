import * as vscode from "vscode"; 

//import { SymbolOutlineProvider } from "./symbolOutline";
import { ProjectTreeProvider, ProjectElement } from "./projectTree";

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
  //console.log("vscode.workspace.workspaceFolders", vscode.workspace.workspaceFolders);

  //console.log("vscode", vscode);
  
  // Detect active text editor window path ::
  /// https://github.com/Tyriar/vscode-terminal-here/blob/master/src/extension.ts
  
  // Go with the process path : 
  var editor_path = process.cwd();
  
  const projectTreeProvider = new ProjectTreeProvider(editor_path); 
  //vscode.commands.registerCommand("projectTree.clickFile",  (id: number) => projectTreeProvider.clickFile(id));
  vscode.commands.registerCommand("projectTree.clickFile",  (element: ProjectElement) => projectTreeProvider.clickFile(element));
  vscode.commands.registerCommand("projectTree.clickGroup", (element: ProjectElement) => projectTreeProvider.clickGroup(element));
  
  //vscode.commands.registerCommand("projectTree.add", (id: number) => projectTreeProvider.add(id));
  vscode.commands.registerCommand("projectTree.add",    (element: ProjectElement) => projectTreeProvider.add(element));
  vscode.commands.registerCommand("projectTree.rename", (element: ProjectElement) => projectTreeProvider.rename(element));
  vscode.commands.registerCommand("projectTree.move",   (element: ProjectElement) => projectTreeProvider.move_start(element));
  vscode.commands.registerCommand("projectTree.delete", (element: ProjectElement) => projectTreeProvider.delete_element(element));

  vscode.commands.registerCommand("projectTree.add_group", (element: ProjectElement) => projectTreeProvider.add_group(element));
  
  vscode.window.registerTreeDataProvider('projectTree', projectTreeProvider);  
}
