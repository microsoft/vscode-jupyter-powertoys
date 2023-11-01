# Contributing

This project welcomes contributions and suggestions. Most contributions require you to
agree to a Contributor License Agreement (CLA) declaring that you have the right to,
and actually do, grant us the rights to use your contribution. For details, visit
https://cla.microsoft.com.

When you submit a pull request, a CLA-bot will automatically determine whether you need
to provide a CLA and decorate the PR appropriately (e.g., label, comment). Simply follow the
instructions provided by the bot. You will only need to do this once across all repositories using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/)
or contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

## Development Process

### Create An Issue
Before starting on a PR an [issue](https://github.com/microsoft/vscode-jupyter-powertoys/issues) should be created.
Submissions that do not have an associated issue are unlikely to be approved.

### Prerequisites
1. [Node.js](https://nodejs.org/) 18.15.0
2. [npm](https://www.npmjs.com/) 9.5.0
3. [Visual Studio Code](https://code.visualstudio.com/)

### Setup
```shell
git clone https://github.com/Microsoft/vscode-jupyter-powertoys
cd vscode-jupyter-powertoys
npm ci
```

### Running And Testing The Extension
Open the vscode-jupyter-powertoys folder in VS Code. After opening, there will be "Run Extension" and "Extension Tests"
debug targets that can be used to either build and launch the extension in a new instance of VS Code or to launch and
run the test suites.

### Feature Independence
Any new features added to this extension should be contained to a single folder under the src directory (plus src/test for tests).
Features should all have a top level `enabled` setting so individual features can be turned on and off. This `enabled` setting should
be checked both with command contributions and with the activation of the feature from the main `extension.ts` file.
