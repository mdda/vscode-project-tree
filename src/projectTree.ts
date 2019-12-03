import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

const config_dir_choices = ['./.editor', './.geany', ];

export class ProjectTreeProvider implements vscode.TreeDataProvider<ProjectElement> {
  private _onDidChangeTreeData: vscode.EventEmitter<ProjectElement | undefined> = new vscode.EventEmitter<ProjectElement | undefined>();
  readonly onDidChangeTreeData: vscode.Event<ProjectElement | undefined> = this._onDidChangeTreeData.event;

  private test_config: string = "";
  private config_dir: string = undefined;
  
  constructor(private vscode_launch_directory: string) {
    console.log("vscode_launch_directory", vscode_launch_directory);
    
    // unfortutely, this is un-parsed...
    this.test_config = vscode.workspace.getConfiguration('projectTree').get('paths');
    console.log("this.test_config", this.test_config);
    
    if(this.pathExists(vscode_launch_directory)) {
      console.log("Finding config");
      var valid_dirs = config_dir_choices.map( dir => path.join(vscode_launch_directory, dir)) .filter( dir => this.pathExists(dir) );
      console.log("valid_dirs", valid_dirs);
      if(valid_dirs.length>0) {
        this.config_dir = valid_dirs[0];
        
        // Read in the config...
        
      }
    }
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: ProjectElement): vscode.TreeItem {
    return element;
  }

  getChildren(element?: ProjectElement): Thenable<ProjectElement[]> {
    if (!this.config_dir) {
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