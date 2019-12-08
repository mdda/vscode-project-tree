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
  //private tree_root: ProjectElement[] = [];
  
  private tree_id_last: number = 1;
  // Not actually used as a TreeView element, just as a holder for children
  private tree_root: ProjectElement = undefined;
  private move_from_element: ProjectElement = undefined;
  
  constructor(private vscode_launch_directory: string) {
    console.log("vscode_launch_directory", vscode_launch_directory);
    
    // unfortunately, this is un-parsed...
    this.test_config = vscode.workspace.getConfiguration('projectTree').get('paths');
    //console.log("this.test_config", this.test_config);
    
    var tree_id=this.tree_id_last;
    this.tree_root = new ProjectElement(tree_id++, undefined, // parent=undefined
                                         'g', '', // empty group name for tree root
                                         vscode.TreeItemCollapsibleState.Expanded); 
    
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
          
          function _load_project_tree_branch(section, parent) {
            console.log("_load_project_tree_branch", section);
            
            const key_matcher = /(\d+)-?(\S*)/;
            var section_gather={};
            
            Object.keys( config[section] ).forEach( k => {
              var v = config[section][k];
              var group = k.match( key_matcher );
              //console.log(k, v, group);
              if(group) {
                var order = group[1];
                if(! section_gather[order]) {
                  section_gather[order]={};
                }
                section_gather[order][group[2] || ''] = v;
              }
            });
            //console.log("section_gather", section_gather);
        
            // Now, in numerical order...
            var ordered = Object.keys(section_gather).sort((n1,n2) => Number(n1) - Number(n2));
            
            ordered.forEach( k => {
              var vd=section_gather[k];
              if( vd[''] ) {
                // This is a file entry
                var filename = vd[''];
                var file_element = new ProjectElement(tree_id++, parent,
                                      'f', path.basename(filename),
                                      vscode.TreeItemCollapsibleState.None,
                                      filename);
                parent.children.push( file_element );
              }
              else if( vd['group'] ) {
                // This is a Group entry
                var group = vd['group'];
                
                // Add the group to the tree, and recursively go after that section...
                var group_element = new ProjectElement(tree_id++, parent,
                                      'g', group,
                                      vscode.TreeItemCollapsibleState.Collapsed);
                parent.children.push( group_element );
                
                // Descend with parent = currently-being-added-group
                _load_project_tree_branch(section+'/'+group, group_element )  // Add to this group's children array
              }
              
            });
            return; // end of _load_project_tree_branch
          }
          
          if( config['.'] ) {
            _load_project_tree_branch('.', this.tree_root)
            console.log( this.tree_root );
          }
        }
      }
    }
    
    if( this.tree_root.children.length==0 ) {
      // If nothing was loaded, create a fake entry
      var filename = './notes.txt';
      this.tree_root.children.push( 
        new ProjectElement(tree_id++, this.tree_root,
                           'f', 'fake-file_notes.txt',
                           vscode.TreeItemCollapsibleState.None,
                           filename)
      );
    }
    
    this.tree_id_last = tree_id;
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }
  
  findElementInTree(id: number): ProjectElement {
    function findElementInThis(element: ProjectElement) {
      if(id==element.ptid) {
        return element;
      }
      if('g'==element.type) {
        var found=element.children.filter( c => findElementInThis(c) );
        if(found.length>0) {
          return found[0];  // Just one match is sufficient
        }
      }
      return undefined;
    }
    
    return findElementInThis(this.tree_root);
  }
  
  getTreeItem(element: ProjectElement): vscode.TreeItem {
    return element;
  }

  getChildren(element?: ProjectElement): Thenable<ProjectElement[]> {
    console.log("Requested leaf data");
    if (!this.config_dir) {
      vscode.window.showInformationMessage('No project tree yet');
      return Promise.resolve([]);
    }
    if(!element) {
      console.log("Requested root of tree");
      element=this.tree_root;
    }
    return Promise.resolve(element.children);
  }
  
  clickFile_by_id(id: number): void {
    console.log(`You clicked on File '${id}'`); 
    if(this.move_from_element) { // We're completing a move to command here
      //move_finish(element);
    }
    else { 
      // Open up the file in the editor
      
      
      
      
    }
  }

  clickFile(element: ProjectElement): void {
    console.log(`You clicked on File element '${element.ptid}'`); 
    if(this.move_from_element) { // We're completing a move to command here
      this.move_finish(element);
    }
    else { 
      // Open up the file in the editor
      
      
      
      
    }
  }

  clickGroup(element: ProjectElement): void {
    console.log(`You clicked on Group element '${element.ptid}'`); 
    if(this.move_from_element) { // We're completing a move to command here
      this.move_finish(element);
    }
    else { 
      // Not sure why we'd click on a Group label itself
    }
  }

  add_by_id(id: number): void {
    console.log(`You clicked on Add to location '${id}'`); 
    var element = this.findElementInTree(id);
    if(element) {
      console.log(`  Found the element : Label '{element.label}'`); 
    }
  }
  
  get_active_document_uri() {
    // https://github.com/Tyriar/vscode-terminal-here/blob/master/src/extension.ts
    let editor = vscode.window.activeTextEditor;
    if (!editor) { return undefined; }   // No active document
    let document = editor.document;
    if (!document) { return undefined; } // Not a real document
    return document.uri;
  }

  get_relative_filename(uri): string {
    //console.log(`filename to add '${uri}'`, uri); 
    /*
      $mid:1
      fsPath:"/home/andrewsm/OpenSource/vscode-project-tree/README.md"
      external:"file:///home/andrewsm/OpenSource/vscode-project-tree/README.md"
      path:"/home/andrewsm/OpenSource/vscode-project-tree/README.md"
      scheme:"file"
    */
    
    // Need to get a path relative to the parent of '.editor'
    //   https://nodejs.org/api/path.html#path_path_relative_from_to
    var path_relative = path.relative( this.vscode_launch_directory, path.dirname(uri.path) );
    var file_relative = path.join( path_relative, path.basename(uri.path) );
    var filename = (file_relative.length < uri.path.length) ? path.join('.', file_relative) : uri.path;
    console.log(`File selected : '${uri.path}' ~ '${file_relative}' -> '${filename}'`);

    return filename;
  }
  
  get_parent(element: ProjectElement): ProjectElement {
    return (element.parent) ? element.parent : this.tree_root;
  }
  
  get_index_within_children(parent: ProjectElement, ptid: number): number {
    var idx_ptid_arr = parent.children.map( (e:ProjectElement,idx:number) => [idx,e.ptid] );
    //console.log("idx_ptid_arr",  idx_ptid_arr );
    
    var idx_ptid_found = idx_ptid_arr.filter( idx_ptid => idx_ptid[1]==ptid );
    //console.log("idx_ptid_found[]",  idx_ptid_found );
    
    if( idx_ptid_found.length==0) {  return -1; }
    return idx_ptid_found[0][0];  // This is the index of the found child
  }

  add(element: ProjectElement): void {
    console.log(`You clicked on Add to location '${element.ptid}'`);
    var uri = this.get_active_document_uri();
    if(!uri) { return; }
    var filename = this.get_relative_filename(uri);
    if(!filename) { return; }

    // avoid 'function' here to allow us to smuggle 'this' inside
    var create_file_element = (where: ProjectElement): ProjectElement => {
      return new ProjectElement(this.tree_id_last++, where,
                                'f', path.basename(filename),
                                vscode.TreeItemCollapsibleState.None,
                                filename);
    }
    
    if('g'==element.type) { // Add to group
      console.log(`  Add new element at end of .children[]`);
      element.children.push( create_file_element(element) );
    }
    else { // Add after this element (find within parent.children, then put the addition afterwards)
      var parent = this.get_parent(element);
      var idx = this.get_index_within_children(parent, element.ptid);
      if( idx<0 ) { return; }
       
      // https://stackoverflow.com/questions/586182/how-to-insert-an-item-into-an-array-at-a-specific-index-javascript
      console.log(`  Added new element after parent.child at position '${idx}'`);
      parent.children.splice(idx+1, 0, create_file_element(parent));
    }
    
    // Need to redraw the tree
    this.refresh(); 
  }

  async add_group(element: ProjectElement) {
    console.log(`You clicked on AddGroup to location '${element.ptid}'`);

    // Prompt for group element
    var group = await vscode.window.showInputBox({ placeHolder: "Name for new Group" });
    if( !group ) {
      return Promise.resolve();
    }
    
    var create_group_element = (where: ProjectElement): ProjectElement => {
      return new ProjectElement(this.tree_id_last++, where,
                                'g', group,
                                vscode.TreeItemCollapsibleState.Collapsed);
    }
    
    if('g'==element.type) { // Add to group
      console.log(`  Add new element at end of .children[]`);
      element.children.push( create_group_element(element) );
    }
    else { // Add after this element (find within parent.children, then put the addition afterwards)
      var parent = this.get_parent(element);
      var idx = this.get_index_within_children(parent, element.ptid);
      if( idx<0 ) { return; }
       
      // https://stackoverflow.com/questions/586182/how-to-insert-an-item-into-an-array-at-a-specific-index-javascript
      console.log(`  Added new element after parent.child at position '${idx}'`);
      parent.children.splice(idx+1, 0, create_group_element(parent));
    }
    
    // Need to redraw the tree
    this.refresh(); 
    
    return Promise.resolve();
  }

  async rename(element: ProjectElement) {
    var name_existing = ('f'==element.type)?element.filename:element.label;
    var name = await vscode.window.showInputBox({ value: name_existing });  // placeHolder
    //console.log(`'${confirm}' selected`);
    if(name) {
      console.log(`  Rename element from '${name_existing}' to '${name}'`);
      element.rename(name);
      this.refresh(); 
    }
    return Promise.resolve();
  }

  move_start(element_from: ProjectElement) {
    this.move_from_element = element_from;
  }
  
  move_finish(element_to: ProjectElement) {
    var element_from = this.move_from_element;
    var parent_from = this.get_parent(element_from);
    var idx_from = this.get_index_within_children(parent_from, element_from.ptid);

    var parent_to = this.get_parent(element_to);
    var idx_to = this.get_index_within_children(parent_to, element_to.ptid);

    if( idx_from>=0 && idx_to>=0 && element_from.ptid!=element_to.ptid ) { 
      console.log(`  Executing the move`);
      
      if('g'==element_to.type) { // Add to group
        console.log(`  Move element '${element_from.label}' to end of '${element_to.label}'.children[]`);
        element_from.parent = element_to;  // Fix up parent
        element_to.children.push( element_from );
      }
      else { // Add after this element (find within parent.children, then put the addition afterwards)
        console.log(`  Move element '${element_from.label}'  after '${element_to.label}'.child at position '${idx_to}'`);
        element_from.parent = parent_to;  // Fix up parent
        parent_to.children.splice(idx_to+1, 0, element_from);
      }
      
      parent_from.children.splice(idx_from, 1);  // remove it from source
      
      this.refresh();
    }
    this.move_from_element=undefined;  // Finished with mode
  }


  async delete_element(element: ProjectElement) {
    //var confirm = await vscode.window.showInputBox({ placeHolder: "Type 'YES' to confirm deletion" });
    var confirm = await vscode.window.showQuickPick(["YES - Confirm deletion of this item"], {canPickMany: false});
    //console.log(`'${confirm}' selected`);
    if(confirm.match(/^YES/)) {
      console.log(`  Delete element...`);
      var parent = this.get_parent(element);
      var idx = this.get_index_within_children(parent, element.ptid);
      if( idx>=0 ) { 
        parent.children.splice(idx, 1);
        this.refresh(); 
      }
    }
    return Promise.resolve();
  }


  private pathExists(p: string): boolean {
    try {
      fs.accessSync(p);
    } 
    catch (err) {
      return false;
    }

    return true;
  }
}

export class ProjectElement extends vscode.TreeItem {
  public children: ProjectElement[] = [];
  
  constructor(
    public readonly ptid: number, 
    public parent: ProjectElement,
    public readonly type: string, 
    public label: string,
    
    // https://code.visualstudio.com/api/references/vscode-api#TreeItemCollapsibleState
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    
    public filename?: string
    
    //public readonly command?: vscode.Command
  ) {
    super(label, collapsibleState);
    if('f'==type) {
      this.filename = filename;
      
      this.command = {
        command: "projectTree.clickFile",
        title: "Click File",
        //arguments: [this.ptid]
        arguments: [this]
      };      
    }
    else {
      this.children=[];
      this.command = {
        command: "projectTree.clickGroup",
        title: "Click Group",
        arguments: [this]
      };      
    }
  }

  get tooltip(): string {
    if('f'==this.type) {
      return `${this.filename}`;
    }
    return `${this.label}`;
  }

  rename(name_new): void {
    if('f'==this.type) {
      this.label=path.basename(name_new);
      this.filename=name_new;
    }
    else {
      this.label=name_new;
    }
  }
  
  //get description(): string {
  //  return this.version;
  //}

  iconPath = {
    light: path.join(__filename, '..', '..', 'resources', 'light', 'dependency.svg'),
    dark: path.join(__filename, '..', '..', 'resources', 'dark', 'dependency.svg')
  };

  contextValue = 'project_element';
}


