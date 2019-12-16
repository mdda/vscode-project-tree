import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

// https://www.npmjs.com/package/js-ini 
//   :: Much better behaved with '.' than the 'ini' package
import * as ini from 'js-ini';

import * as mkdirp from 'mkdirp';


const config_dir_choices = ['./.editor', './.geany', ];
const config_dir_choice_default=0;

const config_tree_layout_file='project-tree-layout.ini', config_session_file='session.ini';


export class ProjectTreeProvider implements vscode.TreeDataProvider<ProjectElement> {
  private _onDidChangeTreeData: vscode.EventEmitter<ProjectElement | undefined> = new vscode.EventEmitter<ProjectElement | undefined>();
  readonly onDidChangeTreeData: vscode.Event<ProjectElement | undefined> = this._onDidChangeTreeData.event;

  private test_config: string = "";
  private config_dir: string = undefined;
  
  private project_path: string = undefined;
  private session_path: string = undefined;
  
  // Not actually used as a TreeView element, just as a holder for children
  private tree_root: ProjectElement = undefined;
  private tree_id_last: number = 1;
  
  private move_from_element: ProjectElement = undefined;
  private status_bar_item: vscode.StatusBarItem = undefined;
  
  constructor(private vscode_launch_directory: string) {
    console.log("vscode_launch_directory", vscode_launch_directory);
    
    // unfortunately, this is un-parsed...
    this.test_config = vscode.workspace.getConfiguration('projectTree').get('paths');
    //console.log("this.test_config", this.test_config);
    
    //var tree_id=this.tree_id_last;
    this.tree_root = new ProjectElement(this.tree_id_last++, undefined, // parent=undefined
                                         'g', '', // empty group name for tree root
                                         vscode.TreeItemCollapsibleState.Expanded); 
    
    if(this.pathExists(vscode_launch_directory)) {
      var valid_dirs = config_dir_choices.map( dir => path.join(vscode_launch_directory, dir)) .filter( dir => this.pathExists(dir) );
      //console.log("valid_dirs", valid_dirs);
      
      if(valid_dirs.length>0) {
        this.config_dir = valid_dirs[0];
        
        this.project_path = path.join(this.config_dir, config_tree_layout_file);
        if( this.pathExists(this.project_path) ) {
          this.project_load( this.project_path );
        }
        
        this.session_path = path.join(this.config_dir, config_session_file);
        if( this.pathExists(this.session_path) ) {
          this.session_load( this.session_path );
        }
      }
    }
    
    if( this.tree_root.children.length==0 ) {
      // If nothing was loaded, create a fake entry
      var filename = './notes.txt';
      this.tree_root.children.push( 
        new ProjectElement(this.tree_id_last++, this.tree_root,
                           'f', 'fake-file_notes.txt',
                           vscode.TreeItemCollapsibleState.None,
                           filename)
      );
    }
    
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
    //if(!this.config_dir) {
    //  vscode.window.showInformationMessage('No project tree yet');
    //  return Promise.resolve([]);
    //}
    if(!element) {
      console.log("Requested root of tree");
      element=this.tree_root;
    }
    return Promise.resolve(element.children);
  }
  
  /*
  clickFile_by_id(id: number): void {
    console.log(`You clicked on File '${id}'`); 
    if(this.move_from_element) { // We're completing a move to command here
      //move_finish(element);
    }
    else { 
      // Open up the file in the editor
      //.. todo - maybe later
    }
  }
  */

  clickFile(element: ProjectElement): void {
    console.log(`You clicked on File element '${element.ptid}'`); 
    if(this.move_from_element) { // We're completing a move to command here
      this.move_end(element);
    }
    else { 
      // Open up the file in the editor
      
      let uri = this.expand_relative_filename(element.filename);
      
      //  Put this in a new tab
      //    https://code.visualstudio.com/api/references/vscode-api#TextDocumentShowOptions
      vscode.workspace.openTextDocument(uri)
        .then(doc => vscode.window.showTextDocument(doc, { preview:false }));
        
      // Better for large / binary files
      //vscode.commands.executeCommand( 'vscode.open', uri);
    }
  }

  clickGroup(element: ProjectElement): void {
    console.log(`You clicked on Group element '${element.ptid}'`); 
    if(this.move_from_element) { // We're completing a move to command here
      this.move_end(element);
    }
    else { 
      // Not sure why we'd click on a Group label itself
    }
  }

  /*
  add_by_id(id: number): void {
    console.log(`You clicked on Add to location '${id}'`); 
    var element = this.findElementInTree(id);
    if(element) {
      console.log(`  Found the element : Label '{element.label}'`); 
    }
  }
  */
  
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
  
  expand_relative_filename(filename): vscode.Uri {
    var expanded = filename.startsWith('/')? filename : path.join( this.vscode_launch_directory, filename );
    return vscode.Uri.file(expanded);
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
    this.move_cleanup();
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
    this.move_cleanup();
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
    this.move_cleanup();
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
    console.log(`Start a move operation at ${element_from.label}.ptid='${element_from.ptid}'`);
    this.move_from_element = element_from;
    
    // https://github.com/microsoft/vscode-extension-samples/blob/master/statusbar-sample/src/extension.ts
    this.status_bar_item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    this.status_bar_item.text = `Select Move Destination`;
    this.status_bar_item.color = '#FFFF00';
    //this.status_bar_item.color = new vscode.ThemeColor('statusBarItem.prominentForeground');
    this.status_bar_item.show();
  }
  
  move_end(element_to: ProjectElement) {
    var element_from = this.move_from_element;
    var parent_from = this.get_parent(element_from);
    var idx_from = this.get_index_within_children(parent_from, element_from.ptid);
    
    var parent_to = this.get_parent(element_to);
    var idx_to_check = this.get_index_within_children(parent_to, element_to.ptid);
    
    console.log(`Potential move ${idx_from} -> ${idx_to_check} (${element_from.ptid} -> ${element_to.ptid})`);
    if( idx_from>=0 && idx_to_check>=0 && element_from.ptid!=element_to.ptid ) {
      parent_from.children.splice(idx_from, 1);  // remove the element from source

      // This may have changed because of the removal above...
      var idx_to = this.get_index_within_children(parent_to, element_to.ptid);

      if( idx_to>=0 ) { 
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
      }
      
      this.refresh();
    }
    
    this.move_cleanup();
  }

  move_cleanup() {
    this.move_from_element=undefined;  // Finished with mode
    if(this.status_bar_item) {
      this.status_bar_item.hide();
    }
  }

  async delete_element(element: ProjectElement) {
    this.move_cleanup();
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

  project_load( project_ini_file: string ): void {
    // Read in the config...  :: https://www.npmjs.com/package/js-ini 
    var config = ini.parse(fs.readFileSync(project_ini_file, 'utf-8'))
    
    var _load_project_tree_branch = (section, parent) => {
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
          var file_element = new ProjectElement(this.tree_id_last++, parent,
                                'f', path.basename(filename),
                                vscode.TreeItemCollapsibleState.None,
                                filename);
          parent.children.push( file_element );
        }
        else if( vd['group'] ) {
          // This is a Group entry
          var group = vd['group'];
          
          // Add the group to the tree, and recursively go after that section...
          var group_element = new ProjectElement(this.tree_id_last++, parent,
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

  session_load( session_ini_file: string ): void {
    var config_mangled = ini.parse(fs.readFileSync(session_ini_file, 'utf-8'));
    console.log("TODO! session_load()");
 
  }

  
  async get_valid_save_path(prompt: string) {
    var valid_dirs = config_dir_choices.map( dir => path.join(this.vscode_launch_directory, dir)) .filter( dir => this.pathExists(dir) );
    
    if( valid_dirs.length==0 ) {
      var save_path = await vscode.window.showInputBox({ prompt:prompt, value:config_dir_choices[config_dir_choice_default] });
      if(!save_path) {
        return Promise.resolve(); // abort
      }
      var create_dir = path.join( this.vscode_launch_directory, save_path );
      console.log(`  Create directory '${create_dir}'`);
      await this.mkdir( create_dir );
      valid_dirs.push( create_dir );
    }
    return Promise.resolve(valid_dirs[0]);
  }

  async project_save() {
    var save_dir = await this.get_valid_save_path("Project save path :");
    if(save_dir) {
      console.log(`  Saving project to '${save_dir}'`);

      var config={};
      var _save_project_tree_branch = (section: string, arr: ProjectElement[]) => {
        config[section]={};
        
        arr.forEach( (ele, i) => {
          //console.log(`* ${ele.label}:${ele.ptid}`);
          var j=(i+1)*10;
          if('f'==ele.type) {
            config[section][j+''] = ele.filename;
          }
          else {
            config[section][j+'-group'] = ele.label;
            _save_project_tree_branch(section+'/'+ele.label, ele.children);
          }  
        });
      }
      _save_project_tree_branch('.', this.tree_root.children);

      // https://github.com/npm/js-ini :: Now gets ordering correct
      var ini_txt = ini.stringify(config);
      //console.log(ini_txt);
      
      fs.writeFileSync(path.join(save_dir, config_tree_layout_file), ini_txt);
    }
    return Promise.resolve();
  }

  async session_save() {
    var save_dir = await this.get_valid_save_path("Session save path :");
    if(save_dir) {
      console.log(`  Saving session to '${save_dir}'`);
      
      var open_files={};
      
      // Hmm : This may not be so easy...
      //   https://github.com/microsoft/vscode/issues/15178
      //   https://github.com/microsoft/vscode/blob/master/src/vs/workbench/contrib/files/browser/views/openEditorsView.ts#L329
      //   https://marketplace.visualstudio.com/items?itemName=eamodio.restore-editors
      //     https://github.com/eamodio/vscode-restore-editors/blob/01efb6710da5e6ae55421dcbbb51edca7904c4a6/src/constants.ts
    
      // This is just the current *visible* one
      console.log("vscode.window.visibleTextEditors[] :",  vscode.window.visibleTextEditors );
      
      // https://github.com/npm/js=ini
      var ini_txt = ini.encode(open_files);
      console.log(ini_txt);
      
      //fs.writeFileSync(path.join(save_dir, config_session_file), )
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
  
  private mkdir(path: string): Promise<void> {
    return new Promise<void>( (resolve, reject) => {
        mkdirp(path, error => {
            if(error) { return reject(error); }
            return resolve();
          });
      });
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
  ) {
    super(label, collapsibleState);
    if('f'==type) {
      this.filename = filename;
      
      this.command = {
        command: "projectTree.clickFile",
        title: "Click File",
        //arguments: [this.ptid] // initial attempt
        arguments: [this]        // Much cleaner implementation
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

  contextValue = 'project_element';
}


