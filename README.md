# Project

This Visual Studio Code extension provides experimental features to extend the Jupyter notebook experience in VS Code.

This extension is intended to supplement the features provided by the main [Jupyter extension](https://marketplace.visualstudio.com/items?itemName=ms-toolsai.jupyter). As this extension is providing experimental features, there is no set roadmap for how features will be added or removed from it. Features may be added or removed at any time and there is no guarantee of future support by virtue of inclusion in the extension now. Features in this extension that see high usage may be considered for removal from this extension and inclusion in the main Jupyter VS Code extension. In that case, best efforts will be made to notify of the change and migrate settings if possible.

If these tools aren't quite satisfying your need for something new and cool, also be sure to checkout these other standalone Jupyter Extension addons:
* [Gather](https://marketplace.visualstudio.com/items?itemName=ms-python.gather) - Quickly extract tidy scripts or notebooks from your mess of experimentation.
* [Pyodide Kernel](https://marketplace.visualstudio.com/items?itemName=joyceerhl.vscode-pyodide) - Yes, you can run Python in [the browser](https://vscode.dev) without the need to install or configure any Jupyter server! 

## Contributing

This project uses GitHub Issues to track bugs and feature requests. Please search the existing
issues before filing new issues to avoid duplicates. For new issues, file your bug or
feature request as a [new Issue](https://github.com/microsoft/vscode-jupyter-powertoys/issues).

For help and questions about using this project, please start a Discussion on our [GitHub Discussions page](https://github.com/microsoft/vscode-jupyter-powertoys/discussions).

For those interested in contributing to the code of this project please see the [contributing guide](https://github.com/microsoft/vscode-jupyter-powertoys/blob/main/CONTRIBUTING.md).

These are experimental features, so support for help and bug fixing regarding them may be limited.

## Trademarks

This project may contain trademarks or logos for projects, products, or services. Authorized use of Microsoft
trademarks or logos is subject to and must follow
[Microsoft's Trademark & Brand Guidelines](https://www.microsoft.com/en-us/legal/intellectualproperty/trademarks/usage/general).
Use of Microsoft trademarks or logos in modified versions of this project must not cause confusion or imply Microsoft sponsorship.
Any use of third-party trademarks or logos are subject to those third-party's policies.

## Features

### General Feature Usage

All features provided by the Jupyter PowerToys extension can be enabled or disabled via settings. Search for
`Jupyter PowerToys` from the VS Code settings UI and change the `enabled` setting to add or remove any of the
individual features provided by this extension.

### Notebook Run Groups

The notebook run groups feature provides the ability to group notebook cells into a sets of cells which can be
executed as a group together. The `Jupyter > Notebook Run Groups > Group Count` setting controls the number of these groups available, from one to three. Icons to add or remove cells from groups are added to the toolbar of each notebook cell. Cell groups can be executed via the command palette, optional icons in the cell toolbar, or from the dropdown on the cell run button.

<img src=https://raw.githubusercontent.com/microsoft/vscode-jupyter-powertoys/main/images/README/NotebookRunGroups.gif?>

### Contextual Help

Contextual help provides help text returned by the kernel when changing cursor position in a notebook.
<img src=https://raw.githubusercontent.com/microsoft/vscode-jupyter-powertoys/main/images/README/contextualHelp.gif?>

The amount of help text can be controlled with the `jupyter.contextualHelp.detailLevel` setting.

### Kernel Management panel

List, start, stop, reset, kernels all from a new convenient Jupyter sidebar.

![Recording 2022-05-05 at 17 37 21](https://user-images.githubusercontent.com/11685408/167048370-6f71bb21-555f-412a-b2c8-ca0270232fd1.gif)

