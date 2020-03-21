/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ExtensionContext } from 'vscode';
import { ApiWrapper } from '../../../apiWrapper';

import { azureResource } from '../../azure-resource';
import { IAzureResourceService } from '../../interfaces';
import { PostgresServerTreeDataProvider as PostgresServerTreeDataProvider } from './postgresServerTreeDataProvider';

export class PostgresServerProvider implements azureResource.IAzureResourceProvider {
	public constructor(
		private _databaseServerService: IAzureResourceService<azureResource.AzureResourceDatabaseServer>,
		private _apiWrapper: ApiWrapper,
		private _extensionContext: ExtensionContext
	) {
	}

	public getTreeDataProvider(): azureResource.IAzureResourceTreeDataProvider {
		return new PostgresServerTreeDataProvider(this._databaseServerService, this._apiWrapper, this._extensionContext);
	}

	public get providerId(): string {
		return 'azure.resource.providers.postgresServer';
	}
}
