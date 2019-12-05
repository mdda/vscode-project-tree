import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

import * as ini from 'ini';


const config_dir_choices = ['./.editor', './.geany', ];
const config_tree_layout_file='project-tree-layout.ini', config_session_file='session.ini';


export class ProjectTreeProvider implements vscode.TreeDataProvider<ProjectElement> {
  private _onDidChangeTreeData: vscode.EventEmitter<ProjectElement | undefined> = new vscode.EventEmitter<ProjectElement | undefined>();
  readonly onDidChangeTreeData: vscode.Event<ProjectElement | undefined> = this._onDidChangeTreeData.event;

  private test_config: string = "";
  private config_dir: string = undefined;
  
  private tree_path: string = undefined;
  private tree_root = {};
  
  constructor(private vscode_launch_directory: string) {
    console.log("vscode_launch_directory", vscode_launch_directory);
    
    // unfortutely, this is un-parsed...
    this.test_config = vscode.workspace.getConfiguration('projectTree').get('paths');
    //console.log("this.test_config", this.test_config);
    
    if(this.pathExists(vscode_launch_directory)) {
      var valid_dirs = config_dir_choices.map( dir => path.join(vscode_launch_directory, dir)) .filter( dir => this.pathExists(dir) );
      //console.log("valid_dirs", valid_dirs);
      
      if(valid_dirs.length>0) {
        this.config_dir = valid_dirs[0];
        
        this.tree_path = path.join(this.config_dir, config_tree_layout_file);
        if( this.pathExists(this.tree_path) ) {
          // Read in the config...  :: https://github.com/npm/ini
          var config_mangled = ini.parse(fs.readFileSync(this.tree_path, 'utf-8'))
          
          // Strangely, the initial '.' could be stripped off the section names : Add back
          var config = Object.keys(config_mangled['']).reduce( (acc, a) => {
            if(a.substr(0,1)=='.') {
              acc[ a ] = config_mangled[''][a];
            }
            else {
              acc[ '.'+a ] = config_mangled[''][a];
            }
            return acc;
          }, {});
          //console.log("config", config);
          
          function _load_project_tree_branch(section, arr) {
            console.log("_load_project_tree_branch", section);
            
            const key_matcher = /(\d+)-?(\S*)/;
            var section_gather={};
            
            Object.keys( config[section] ).forEach( k => {
              var v = config[section][k];
              var group = v.match( key_matcher );
              if(group) {
                var order = group[0] | 0;
                if(! section_gather[order]) {
                  section_gather[order]={};
                }
                section_gather[order][group[1] || ''] = v;
              }
            });
            console.log("section_gather", section_gather);
        
            
            
            
            
          }
          
          if( config['.'] ) {
            _load_project_tree_branch('.', this.tree_root)
          }
          
          
        }
        
        
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