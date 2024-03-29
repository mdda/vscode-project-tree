import * as vscode from "vscode"; 

import { ProjectTreeProvider, ProjectElement } from "./projectTree";

export function activate(context: vscode.ExtensionContext) {
  // Path information :
  // https://stackoverflow.com/questions/36734983/full-path-to-the-folder-where-the-currently-active-file-in-visual-studio-code

  // Detect active text editor window path ::
  /// https://github.com/Tyriar/vscode-terminal-here/blob/master/src/extension.ts
  
  // Go with the process path : 
  var editor_path = process.cwd();
  
  const projectTreeProvider = new ProjectTreeProvider(editor_path); 
  
  vscode.commands.registerCommand("projectTree.session_save",  () => projectTreeProvider.session_save());
  vscode.commands.registerCommand("projectTree.project_save",  () => projectTreeProvider.project_save());
  
  //vscode.commands.registerCommand("projectTree.clickFile",  (id: number) => projectTreeProvider.clickFile(id));
  vscode.commands.registerCommand("projectTree.clickFile",  (element: ProjectElement) => projectTreeProvider.clickFile(element));
  vscode.commands.registerCommand("projectTree.clickGroup", (element: ProjectElement) => projectTreeProvider.clickGroup(element));
  
  //vscode.commands.registerCommand("projectTree.add", (id: number) => projectTreeProvider.add(id));
  vscode.commands.registerCommand("projectTree.add",    (element: ProjectElement) => projectTreeProvider.add(element));
  vscode.commands.registerCommand("projectTree.add_group", (element: ProjectElement) => projectTreeProvider.add_group(element));
  
  vscode.commands.registerCommand("projectTree.rename", (element: ProjectElement) => projectTreeProvider.rename(element));
  vscode.commands.registerCommand("projectTree.move",   (element: ProjectElement) => projectTreeProvider.move_start(element));
  vscode.commands.registerCommand("projectTree.delete", (element: ProjectElement) => projectTreeProvider.delete_element(element));
  
  vscode.window.registerTreeDataProvider('projectTree', projectTreeProvider);
  
  projectTreeProvider.session_load(projectTreeProvider.session_path);
}
