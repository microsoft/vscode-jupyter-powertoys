// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { PythonExtension } from '@vscode/python-extension';
import { EnvironmentType, PythonEnvironment, getCachedEnvironmentTypeFromUri } from './vscodeJupyter';

export function getPythonEnvironmentCategory(interpreter: PythonEnvironment, pythonApi: PythonExtension) {
    const envType = getCachedEnvironmentTypeFromUri(interpreter.uri, pythonApi);
    switch (envType) {
        case EnvironmentType.Conda:
            return 'Conda Env';
        case EnvironmentType.Pipenv:
            return 'Pipenv Env';
        case EnvironmentType.Poetry:
            return 'Poetry Env';
        case EnvironmentType.Pyenv:
            return 'PyEnv Env';
        case EnvironmentType.Venv:
        case EnvironmentType.VirtualEnv:
        case EnvironmentType.VirtualEnvWrapper:
            return 'Virtual Env';
        default:
            return 'Global Env';
    }
}
