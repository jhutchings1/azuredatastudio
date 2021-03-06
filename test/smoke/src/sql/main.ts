/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { setup as setupQueryEditorTest } from './areas/queryEditor/queryEditor.test';
import { ApplicationOptions } from '../../../automation';
import * as yazl from 'yauzl';
import * as fs from 'fs';
import * as path from 'path';
import { request } from 'https';
import * as mkdirp from 'mkdirp';

export function main(): void {
	setupQueryEditorTest();
}

/* eslint-disable no-sync */
const PLATFORM = '${PLATFORM}';
const RUNTIME = '${RUNTIME}';
const VERSION = '${VERSION}';

const sqliteUrl = `https://github.com/anthonydresser/azuredatastudio-sqlite/releases/download/1.0.6/azuredatastudio-sqlite-${PLATFORM}-${RUNTIME}-${VERSION}.zip`;

export async function setup(app: ApplicationOptions): Promise<void> {
	const requestUrl = sqliteUrl.replace(PLATFORM, process.platform).replace(RUNTIME, getRuntime(app.web || app.remote || false)).replace(VERSION, getVersion(app.web || app.remote || false));
	const zip = await fetch(requestUrl);
	if (!zip) {
		throw new Error('Could not get extension for current platform');
	}
	return new Promise<void>((resolve, reject) => {
		yazl.fromBuffer(zip, (e, zipFile) => {
			if (e || !zipFile) {
				reject(e);
				return;
			}

			zipFile.on('entry', (entry: yazl.Entry) => {
				if (/\/$/.test(entry.fileName)) {
					return;
				}
				zipFile.openReadStream(entry, (err, readStream) => {
					if (err || !readStream) {
						reject(err);
						return;
					}
					const destination = path.join(app.extensionsPath, 'azuredatastudio-sqlite', entry.fileName);
					if (fs.existsSync(path.dirname(destination))) {
						readStream.pipe(fs.createWriteStream(destination));
						return;
					}

					mkdirp(path.dirname(destination), err => {
						if (err) {
							reject(err);
							return;
						}
						readStream.pipe(fs.createWriteStream(destination));
					});
				});
			}).once('end', () => resolve());
		});
	});
}

const root = path.dirname(path.dirname(path.dirname(path.dirname(__dirname))));

function getRuntime(remote: boolean) {
	// eslint-disable-next-line no-sync
	const yarnrc = fs.readFileSync(remote ? path.join(root, 'remote', '.yarnrc') : path.join(root, '.yarnrc'), 'utf8');
	const runtime = /^runtime "(.*)"$/m.exec(yarnrc)![1];
	return runtime;
}

function getVersion(remote: boolean) {
	// eslint-disable-next-line no-sync
	const yarnrc = fs.readFileSync(remote ? path.join(root, 'remote', '.yarnrc') : path.join(root, '.yarnrc'), 'utf8');
	const target = /^target "(.*)"$/m.exec(yarnrc)![1];
	return target;
}

function fetch(url: string): Promise<Buffer | undefined> {
	return new Promise<Buffer>((resolve, reject) => {
		const buffers: Buffer[] = [];
		const req = request(url, async res => {
			if (res.headers.location) {
				resolve(await fetch(res.headers.location));
			} else {
				res.on('data', chunk => buffers.push(chunk));
				res.on('end', () => {
					if (buffers.length > 0) {
						resolve(Buffer.concat(buffers));
					} else {
						resolve(undefined);
					}
				});
				res.on('error', e => reject(e));
			}
		});

		req.end();
	});
}
