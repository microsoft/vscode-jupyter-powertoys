// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	// Test to make sure that we can activate our extension
	test('Extension Activation', async () => {
		const ptExtension = vscode.extensions.getExtension('ms-toolsai.vscode-jupyter-powertoys');

		if (!ptExtension) {
			assert.fail('Failed to find powertoys extension');
		}

		// If not activated, activate it
		await ptExtension.activate();

		assert(ptExtension.isActive);
	});
});
