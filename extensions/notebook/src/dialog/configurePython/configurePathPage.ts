/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import * as azdata from 'azdata';
import { ConfigurePythonPage } from './configurePythonPage';
import * as nls from 'vscode-nls';
import { JupyterServerInstallation } from '../../jupyter/jupyterServerInstallation';
import { PythonPathInfo } from '../pythonPathLookup';
import * as utils from '../../common/utils';

const localize = nls.loadMessageBundle();

export class ConfigurePathPage extends ConfigurePythonPage {
	private readonly BrowseButtonText = localize('configurePython.browseButtonText', "Browse");
	private readonly LocationTextBoxTitle = localize('configurePython.locationTextBoxText', "Python Install Location");
	private readonly SelectFileLabel = localize('configurePython.selectFileLabel', "Select");

	private pythonLocationDropdown: azdata.DropDownComponent;
	private pythonDropdownLoader: azdata.LoadingComponent;
	private browseButton: azdata.ButtonComponent;
	private newInstallButton: azdata.RadioButtonComponent;
	private existingInstallButton: azdata.RadioButtonComponent;

	public async start(): Promise<boolean> {
		this.pythonLocationDropdown = this.view.modelBuilder.dropDown()
			.withProperties<azdata.DropDownProperties>({
				value: undefined,
				values: [],
				width: '100%'
			}).component();
		this.pythonDropdownLoader = this.view.modelBuilder.loadingComponent()
			.withItem(this.pythonLocationDropdown)
			.withProperties<azdata.LoadingComponentProperties>({
				loading: false
			})
			.component();

		this.browseButton = this.view.modelBuilder.button()
			.withProperties<azdata.ButtonProperties>({
				label: this.BrowseButtonText,
				width: '70px'
			}).component();
		this.browseButton.onDidClick(() => this.handleBrowse());

		let useExistingPython = JupyterServerInstallation.getExistingPythonSetting(this.apiWrapper);
		this.createInstallRadioButtons(this.view.modelBuilder, useExistingPython);

		let formModel = this.view.modelBuilder.formContainer()
			.withFormItems([{
				component: this.newInstallButton,
				title: localize('configurePython.installationType', "Installation Type")
			}, {
				component: this.existingInstallButton,
				title: ''
			}, {
				component: this.pythonDropdownLoader,
				title: this.LocationTextBoxTitle
			}, {
				component: this.browseButton,
				title: ''
			}]).component();

		await this.view.initializeModel(formModel);

		await this.updatePythonPathsDropdown(useExistingPython);

		return true;
	}

	public onPageEnter(): Promise<boolean> {
		throw new Error('Method not implemented.');
	}

	onPageLeave(): Promise<boolean> {
		throw new Error('Method not implemented.');
	}

	public cleanup(): Promise<boolean> {
		throw new Error('Method not implemented.');
	}

	public setupNavigationValidator(): void {
		throw new Error('Method not implemented.');
	}

	private async updatePythonPathsDropdown(useExistingPython: boolean): Promise<void> {
		await this.pythonDropdownLoader.updateProperties({ loading: true });
		try {
			let pythonPaths: PythonPathInfo[];
			let dropdownValues: azdata.CategoryValue[];
			if (useExistingPython) {
				pythonPaths = await this.model.pythonPathsPromise;
				if (pythonPaths && pythonPaths.length > 0) {
					dropdownValues = pythonPaths.map(path => {
						return {
							displayName: `${path.installDir} (Python ${path.version})`,
							name: path.installDir
						};
					});
				} else {
					dropdownValues = [{
						displayName: 'No supported Python versions found.',
						name: ''
					}];
				}
			} else {
				let defaultPath = JupyterServerInstallation.DefaultPythonLocation;
				dropdownValues = [{
					displayName: `${defaultPath} (Default)`,
					name: defaultPath
				}];
			}

			this.model.usingCustomPath = false;
			await this.pythonLocationDropdown.updateProperties({
				value: dropdownValues[0],
				values: dropdownValues
			});
		} finally {
			await this.pythonDropdownLoader.updateProperties({ loading: false });
		}
	}

	private createInstallRadioButtons(modelBuilder: azdata.ModelBuilder, useExistingPython: boolean): void {
		let buttonGroup = 'installationType';
		this.newInstallButton = modelBuilder.radioButton()
			.withProperties<azdata.RadioButtonProperties>({
				name: buttonGroup,
				label: localize('configurePython.newInstall', "New Python installation"),
				checked: !useExistingPython
			}).component();
		this.newInstallButton.onDidClick(() => {
			this.existingInstallButton.checked = false;
			this.updatePythonPathsDropdown(false)
				.catch(err => {
					this.showErrorMessage(utils.getErrorMessage(err));
				});
		});

		this.existingInstallButton = modelBuilder.radioButton()
			.withProperties<azdata.RadioButtonProperties>({
				name: buttonGroup,
				label: localize('configurePython.existingInstall', "Use existing Python installation"),
				checked: useExistingPython
			}).component();
		this.existingInstallButton.onDidClick(() => {
			this.newInstallButton.checked = false;
			this.updatePythonPathsDropdown(true)
				.catch(err => {
					this.showErrorMessage(utils.getErrorMessage(err));
				});
		});
	}

	private async handleBrowse(): Promise<void> {
		let options: vscode.OpenDialogOptions = {
			defaultUri: vscode.Uri.file(utils.getUserHome()),
			canSelectFiles: false,
			canSelectFolders: true,
			canSelectMany: false,
			openLabel: this.SelectFileLabel
		};

		let fileUris: vscode.Uri[] = await this.apiWrapper.showOpenDialog(options);
		if (fileUris && fileUris[0]) {
			let existingValues = <azdata.CategoryValue[]>this.pythonLocationDropdown.values;
			let filePath = fileUris[0].fsPath;
			let newValue = {
				displayName: `${filePath} (Custom)`,
				name: filePath
			};

			if (this.model.usingCustomPath) {
				existingValues[0] = newValue;
			} else {
				existingValues.unshift(newValue);
				this.model.usingCustomPath = true;
			}

			await this.pythonLocationDropdown.updateProperties({
				value: existingValues[0],
				values: existingValues
			});
		}
	}

	private showErrorMessage(message: string): void {
		this.model.wizard.message = {
			text: message,
			level: azdata.window.MessageLevel.Error
		};
	}
}
