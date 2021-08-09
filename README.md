# Project tree for Visual Studio Code

Code foundation taken from (https://github.com/patrys/vscode-code-outline)


## Running the Project Tree extension in debugging mode

```
dnf install nodejs-typescript.noarch
```

- Open this example in VS Code Insiders (i.e. a recent version of VS code):
  -  `cd .; code .`
- In the terminal window (`Ctrl-tilde` is the hotkey), use instant reload on edit :
  -  `npm run watch`
- `F5` to start debugging the extension, loaded in a 'secondary' `code` session
  - Project Tree is shown in Package explorer view container in Activity bar



## Features 

Displays a project outline tree in the explorer pane.

To activate find and expand the "Project Tree" section near the bottom of the Explorer tab.


#  TODO...







## Extension Settings

Default settings:

```json
{
  "symbolOutline.doSort": false,
  "symbolOutline.sortOrder": [
    "Class",
    "Module",
    "Constant",
    "Interface",
    "*",
    "Constructor",
    "Function",
    "Method"
  ],
  "symbolOutline.expandNodes": [
    "Module",
    "Class",
    "Interface",
    "Namespace",
    "Object",
    "Package",
    "Struct"
  ],
  "symbolOutline.topLevel": [
    "*"
  ]
}
```

- **doSort:** sort the outline.
- **expandNodes:** kinds of nodes to be expanded automatically.
- **sortOrder:** order to the sort symbols.
- **topLevel:** which symbols include at the topmost scope.

## Known Issues

Until Microsoft provides an API to see which files are open in tabs,
we can't get the 'Load/Save Session' functionality that's so useful in `geany-project-tree`...

See Issue : 

*  (API Access to "Open Editors")[https://github.com/microsoft/vscode/issues/15178]
   +  (Is there any estimate on when this will actually be worked on? )[https://github.com/microsoft/vscode/issues/15178#issuecomment-639991364]
   +  (... I am now locking this issue because ...)[https://github.com/microsoft/vscode/issues/15178#issuecomment-652411217]  YIKES
   
*  (Possible hacky solution)[https://github.com/eamodio/vscode-restore-editors/blob/master/src/activeEditorTracker.ts] - also has issue looking for save-session behaviour

