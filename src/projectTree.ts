import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export class ProjectTreeProvider implements vscode.TreeDataProvider<ProjectElement> {
  private _onDidChangeTreeData: vscode.EventEmitter<ProjectElement | undefined> = new vscode.EventEmitter<ProjectElement | undefined>();
  readonly onDidChangeTreeData: vscode.Event<ProjectElement | undefined> = this._onDidChangeTreeData.event;

  private test_config: string = "";
  //private workspaceRoot: string = undefined;  // defined in constructor

  constructor(private workspaceRoot: string) {
    console.log("workspaceRoot", workspaceRoot);
    this.test_config = vscode.workspace.getConfiguration('projectTree').get('paths');
    console.log("this.test_config", this.test_config);
    //this.workspaceRoot = workspaceRoot;  // defined in constructor
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: ProjectElement): vscode.TreeItem {
    return element;
  }

  getChildren(element?: ProjectElement): Thenable<ProjectElement[]> {
    if (!this.workspaceRoot) {
      vscode.window.showInformationMessage('No project tree yet');
      return Promise.resolve([]);
    }

    if(element) {
      // This has parents
    }
    else {
      // This is root
      return Promise.resolve([]);
    }

  }

  private pathExists(p: string): boolean {
    try {
      fs.accessSync(p);
    } catch (err) {
      return false;
    }

    return true;
  }
}

export class ProjectElement extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    private version: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly command?: vscode.Command
  ) {
    super(label, collapsibleState);
  }

  get tooltip(): string {
    return `${this.label}-${this.version}`;
  }

  get description(): string {
    return this.version;
  }

  iconPath = {
    light: path.join(__filename, '..', '..', 'resources', 'light', 'dependency.svg'),
    dark: path.join(__filename, '..', '..', 'resources', 'dark', 'dependency.svg')
  };

  contextValue = 'project_element';
}