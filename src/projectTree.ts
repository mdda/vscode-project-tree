import {
  Event,
  EventEmitter,
  ExtensionContext,
  Range,
  Selection,
  SymbolInformation,
  SymbolKind,
  TextDocument,
  TextEditor,
  TextEditorRevealType,
  TreeDataProvider,
  TreeItem,
  TreeItemCollapsibleState,
  TreeView,
  commands,
  window,
  workspace,
  //env,
  Position
} from "vscode";

import { lstatSync, existsSync } from 'fs';
import { dirname, join, normalize } from 'path';

import { getIcon } from "./icons";

let optsSortOrder: number[] = [];
let optsTopLevel: number[] = [];
let optsExpandNodes: number[] = [];
let optsDoSort = true;

export class ProjectTreeNode {
  parent?: ProjectTreeNode;
  name:    string;
  path:    string;
  symbol:  SymbolInformation;
  children: ProjectTreeNode[];

  constructor(name:string, path:string, symbol?: SymbolInformation) {
    this.name=name;
    this.path=path;
    this.children = [];
    this.symbol = symbol;
  }

  /**
   * Judge if a node should be expanded automatically.
   */
  public static shouldAutoExpand(kind: SymbolKind): boolean {
    let ix = optsExpandNodes.indexOf(kind);
    if (ix < 0) {
      ix = optsExpandNodes.indexOf(-1);
    }
    return ix > -1;
  }

  private getKindOrder(kind: SymbolKind): number {
    let ix = optsSortOrder.indexOf(kind);
    if (ix < 0) {
      ix = optsSortOrder.indexOf(-1);
    }
    return ix;
  }

  private compareSymbols(a: ProjectTreeNode, b: ProjectTreeNode): number {
    const kindOrder =
      this.getKindOrder(a.symbol.kind) - this.getKindOrder(b.symbol.kind);
    if (kindOrder !== 0) {
      return kindOrder;
    }
    if (a.symbol.name.toLowerCase() > b.symbol.name.toLowerCase()) {
      return 1;
    }
    return -1;
  }

  sort() {
    return;
    //this.children.sort(this.compareSymbols.bind(this));
    //this.children.forEach(child => child.sort());
  }

  addChild(child: ProjectTreeNode) {
    child.parent = this;
    this.children.push(child);
  }
}

export class ProjectTreeTreeDataProvider implements TreeDataProvider<ProjectTreeNode> {
  private _onDidChangeTreeData: EventEmitter<ProjectTreeNode | null> = new EventEmitter<ProjectTreeNode | null>();
  readonly onDidChangeTreeData: Event<ProjectTreeNode | null> = this._onDidChangeTreeData.event;

  private context: ExtensionContext;
  private tree:   ProjectTreeNode;
  private editor: TextEditor;

  constructor(context: ExtensionContext) {
    console.log("ProjectTreeTreeDataProvider.constructor");
    this.context = context;
  }
  
  setTreeData(root: ProjectTreeNode) {
    this.tree=root;
  }

  private getSymbols(document: TextDocument): Thenable<SymbolInformation[]> {
    console.log("ProjectTreeTreeDataProvider.getSymbols");
    
    return commands.executeCommand<SymbolInformation[]>(
      "vscode.executeDocumentSymbolProvider",
      document.uri
    );
  }

  private compareSymbols(a: ProjectTreeNode, b: ProjectTreeNode) {
    const startComparison = a.symbol.location.range.start.compareTo(
      b.symbol.location.range.start
    );
    if (startComparison != 0) {
      return startComparison;
    }
    return b.symbol.location.range.end.compareTo(a.symbol.location.range.end);
  }


  private async updateSymbols(editor: TextEditor): Promise<void> {
    console.log("ProjectTreeTreeDataProvider.updateSymbols");
    
    const tree = new ProjectTreeNode("","");
    this.editor = editor;
    if (editor) {
      readOpts();
      let symbols = await this.getSymbols(editor.document);
      if (optsTopLevel.indexOf(-1) < 0) {
        symbols = symbols.filter(sym => optsTopLevel.indexOf(sym.kind) >= 0);
      }
      // Create symbol nodes
      const ProjectTreeNodes = symbols.map(symbol => new ProjectTreeNode("","", symbol));
      // Sort nodes by left edge ascending and right edge descending
      ProjectTreeNodes.sort(this.compareSymbols);
      // Start with an empty list of parent candidates
      let potentialParents: ProjectTreeNode[] = [];
      ProjectTreeNodes.forEach(currentNode => {
        // Drop candidates that do not contain the current symbol range
        potentialParents = potentialParents
          .filter(
            node =>
              node !== currentNode &&
              node.symbol.location.range.contains(
                currentNode.symbol.location.range
              ) &&
              !node.symbol.location.range.isEqual(
                currentNode.symbol.location.range
              )
          )
          .sort(this.compareSymbols);
        // See if any candidates remain
        if (!potentialParents.length) {
          tree.addChild(currentNode);
        } else {
          const parent = potentialParents[potentialParents.length - 1];
          parent.addChild(currentNode);
        }
        // Add current node as a parent candidate
        potentialParents.push(currentNode);
      });
      if (optsDoSort) {
        tree.sort();
      }
    }
    this.tree = tree;
  }

  async getChildren(node?: ProjectTreeNode): Promise<ProjectTreeNode[]> {
    console.log("ProjectTreeTreeDataProvider.getChildren", node);

    if (node) {
      return node.children;
    } else {
      //await this.updateSymbols(window.activeTextEditor);
      //return this.tree ? this.tree.children : [];
      return this.tree.children; // root returns list of children
    }
  }

  getParent(node: ProjectTreeNode): ProjectTreeNode {
    console.log("ProjectTreeTreeDataProvider.getParent");
    
    return node.parent;
  }

  getNodeByPosition(position: Position): ProjectTreeNode {
    console.log("ProjectTreeTreeDataProvider.getNodeByPosition", position);
    
    let node = this.tree;
    while (node.children.length) {
      const matching = node.children.filter(node =>
        node.symbol.location.range.contains(position)
      );
      if (!matching.length) {
        break;
      }
      node = matching[0];
    }
    if (node.symbol) {
      return node;
    }
  }

  getTreeItem(node: ProjectTreeNode): TreeItem {
    console.log("ProjectTreeTreeDataProvider.getTreeItem");
    
    //const { kind } = node.symbol;
    let kind = SymbolKind.Namespace;
    let treeItem = new TreeItem(node.name);

    if (node.children.length) {
      treeItem.collapsibleState = TreeItemCollapsibleState.Collapsed;
    } 
    else {
      treeItem.collapsibleState = TreeItemCollapsibleState.None;
      kind = SymbolKind.Method;
      treeItem.command = {
        command: "projectTree.openFile",
        title: "Open",
        arguments: [this.editor, node.path]
      };
    }


    treeItem.iconPath = getIcon(kind, this.context);
    return treeItem;
  }
  
  getTreeItem_orig(node: ProjectTreeNode): TreeItem {
    console.log("ProjectTreeTreeDataProvider.getTreeItem");
    
    const { kind } = node.symbol;
    let treeItem = new TreeItem(node.symbol.name);

    if (node.children.length) {
      treeItem.collapsibleState =
        optsExpandNodes.length && ProjectTreeNode.shouldAutoExpand(kind)
          ? TreeItemCollapsibleState.Expanded
          : TreeItemCollapsibleState.Collapsed;
    } 
    else {
      treeItem.collapsibleState = TreeItemCollapsibleState.None;
    }

    treeItem.command = {
      command: "projectTree.revealRange",
      title: "",
      arguments: [this.editor, node.symbol.location.range]
    };

    treeItem.iconPath = getIcon(kind, this.context);
    return treeItem;
  }

  refresh() {
    console.log("ProjectTreeTreeDataProvider.refresh()");
    this._onDidChangeTreeData.fire();
  }
}

export class ProjectTreeProvider {
  projectViewer: TreeView<ProjectTreeNode>;

  constructor(context: ExtensionContext) {
    console.log("ProjectTreeProvider.constructor");
    
    const treeDataProvider = new ProjectTreeTreeDataProvider(context);
    // terminal.integrated.cwd
    
    // .activeTextEditor undefined for window.activeTextEditor.document.uri.fsPath 
    // window is basically empty at launch
    // workspace just has the welcome document
    // commands is {}
    console.log("ProjectTreeProvider.constructor - created", "context??");
    
    // env.appRoot == /usr/share/code/resources/app
    //console.log("ProjectTreeProvider.constructor - created", env.appRoot);  //
    
    //let folderName = workspace.name; // get the open folder name
    //let folderPath = workspace.rootPath; // get the open folder path
    //console.log("ProjectTreeProvider.constructor - created", folderName, folderPath);

    // const currentFilePath: string = dirname(vscode.window.activeTextEditor.document.uri.fsPath);

    let root = new ProjectTreeNode("ROOT", "INGORE");
    let group1 = new ProjectTreeNode("Hello", "NOOO");
    group1.addChild(new ProjectTreeNode("Hello-sub1", "hello.js"))
    group1.addChild(new ProjectTreeNode("README.md", "./README.md"))
    root.addChild(group1)
    root.addChild(new ProjectTreeNode("Hello2", "hello2.js"))
    
    treeDataProvider.setTreeData(root);
    
    this.projectViewer = window.createTreeView("projectTree", {
      treeDataProvider
    });
    console.log("ProjectTreeProvider.constructor - added tree view");
    
    commands.registerCommand("projectTree.refresh", () => {
      treeDataProvider.refresh();
    });
    console.log("ProjectTreeProvider.constructor - registered refresh command");

    commands.registerCommand(
      "projectTree.openFile",
      (editor: TextEditor, path: string) => {
        console.log("command : projectTree.openFile firing", path);
        
        let modifiedPath = path;
        let fail=false;
          
        // convert modifiedPath to path relative to initial launch location or .geany/ or .vscode/ ...
        //  https://github.com/cg-cnu/vscode-super-new-file/blob/master/src/superNewFile.ts#L23
        
        try {
          if(lstatSync(modifiedPath).isFile()) {
            console.log("command : projectTree.openFile opening", modifiedPath);
            
            //modifiedPath = '/home/andrewsm/OpenSource/vscode-project-tree/README.md';
            workspace.openTextDocument(modifiedPath)
              .then((textDocument) => {
                if (textDocument) {
                  window.showTextDocument(textDocument);
                }
                else {
                  window.showErrorMessage("Editor couldn't open the document!");
                }
              });
          }
          else { fail=true; }   
        }
        catch { fail=true; }
        
        if(fail) {
          console.log("command : projectTree.openFile could not open", modifiedPath);
          window.showErrorMessage(`Couldn't open the document '${modifiedPath}'`);
        }
        
        
      }
    );
    
    /*
    commands.registerCommand(
      "projectTree.revealRange",
      (editor: TextEditor, range: Range) => {
        editor.revealRange(range, TextEditorRevealType.Default);
        editor.selection = new Selection(range.start, range.start);
        commands.executeCommand("workbench.action.focusActiveEditorGroup");
      }
    );
    */
    /*
    window.onDidChangeActiveTextEditor(editor => treeDataProvider.refresh());
    workspace.onDidCloseTextDocument(document => treeDataProvider.refresh());
    workspace.onDidChangeTextDocument(event => treeDataProvider.refresh());
    workspace.onDidSaveTextDocument(document => treeDataProvider.refresh());
    */
    /*
    commands.registerTextEditorCommand(
      "projectTree.revealCurrentSymbol",
      (editor: TextEditor) => {
        if (editor.selections.length) {
          const node = treeDataProvider.getNodeByPosition(
            editor.selections[0].active
          );
          if (node) {
            this.symbolViewer.reveal(node);
          }
        }
      }
    );
    */
  }
}

function readOpts() {
  let opts = workspace.getConfiguration("projectTree");
  optsDoSort = opts.get<boolean>("doSort");
  optsExpandNodes = convertEnumNames(opts.get<string[]>("expandNodes"));
  optsSortOrder = convertEnumNames(opts.get<string[]>("sortOrder"));
  optsTopLevel = convertEnumNames(opts.get<string[]>("topLevel"));
}

function convertEnumNames(names: string[]): number[] {
  return names.map(str => {
    let v = SymbolKind[str];
    return typeof v == "undefined" ? -1 : v;
  });
}
