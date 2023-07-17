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

* Display a project outline tree in the explorer pane - 
this is (by default) stored in `./.editor/project-tree-layout.ini`, 
and the intuition is that this can be common across team members (i.e. not often updated, and storeable in git)

* Save all tabs and line locations for the session in a separate file - 
this is (by default) stored in `./.editor/session.ini`, and, since it is rather individual to an editing session,
this **should not** be stored in git.

To activate, find and expand the "Project Tree" section near the bottom of the Explorer tab.

For [historical reasons](https://github.com/mdda/geany-project-tree), this extension also looks in `./.geany` for the `.ini` files at startup, if they're not found in `./.editor`.
