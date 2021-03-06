/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as TypeMoq from 'typemoq';
import * as assert from 'assert';

import { MarkdownTextTransformer, MarkdownButtonType } from 'sql/workbench/contrib/notebook/browser/markdownToolbarActions';
import { NotebookService } from 'sql/workbench/services/notebook/browser/notebookServiceImpl';
import { TestInstantiationService } from 'vs/platform/instantiation/test/common/instantiationServiceMock';
import { TestLifecycleService, TestEnvironmentService, TestAccessibilityService } from 'vs/workbench/test/browser/workbenchTestServices';
import { INotebookService } from 'sql/workbench/services/notebook/browser/notebookService';
import { CellModel } from 'sql/workbench/services/notebook/browser/models/cell';
import { MockContextKeyService } from 'vs/platform/keybinding/test/common/mockKeybindingService';
import { TestThemeService } from 'vs/platform/theme/test/common/testThemeService';
import { TextModel } from 'vs/editor/common/model/textModel';
import { isUndefinedOrNull } from 'vs/base/common/types';
import { IAccessibilityService } from 'vs/platform/accessibility/common/accessibility';
import { IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { TestCodeEditorService } from 'vs/editor/test/browser/editorTestServices';
import { ICodeEditorService } from 'vs/editor/browser/services/codeEditorService';
import { DefaultEndOfLine } from 'vs/editor/common/model';
import { UndoRedoService } from 'vs/platform/undoRedo/common/undoRedoService';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { TestNotificationService } from 'vs/platform/notification/test/common/testNotificationService';
import { TestDialogService } from 'vs/platform/dialogs/test/common/testDialogService';
import { TestStorageService } from 'vs/workbench/test/common/workbenchTestServices';
import { IEnvironmentService } from 'vs/platform/environment/common/environment';
import { IStorageService } from 'vs/platform/storage/common/storage';
import { IEditor } from 'vs/editor/common/editorCommon';
import { TestNotebookEditor } from 'sql/workbench/contrib/notebook/test/browser/testEditorsAndProviders.test';



suite('MarkdownTextTransformer', () => {
	let markdownTextTransformer: MarkdownTextTransformer;
	let widget: IEditor;
	let textModel: TextModel;

	setup(() => {
		let mockNotebookService: TypeMoq.Mock<INotebookService>;
		const dialogService = new TestDialogService();
		const notificationService = new TestNotificationService();
		const undoRedoService = new UndoRedoService(dialogService, notificationService);
		const instantiationService = new TestInstantiationService();

		instantiationService.stub(IAccessibilityService, new TestAccessibilityService());
		instantiationService.stub(IContextKeyService, new MockContextKeyService());
		instantiationService.stub(ICodeEditorService, new TestCodeEditorService());
		instantiationService.stub(IThemeService, new TestThemeService());
		instantiationService.stub(IEnvironmentService, TestEnvironmentService);
		instantiationService.stub(IStorageService, new TestStorageService());

		mockNotebookService = TypeMoq.Mock.ofType(NotebookService, undefined, new TestLifecycleService(), undefined, undefined, undefined, instantiationService, new MockContextKeyService(),
			undefined, undefined, undefined, undefined, undefined, undefined, TestEnvironmentService);

		let cellModel = new CellModel(undefined, undefined, mockNotebookService.object);
		let notebookEditor = new TestNotebookEditor(cellModel.cellGuid, instantiationService);
		markdownTextTransformer = new MarkdownTextTransformer(mockNotebookService.object, cellModel, notebookEditor);
		mockNotebookService.setup(s => s.findNotebookEditor(TypeMoq.It.isAny())).returns(() => notebookEditor);

		let editor = notebookEditor.cellEditors[0].getEditor();
		assert(!isUndefinedOrNull(editor), 'editor is undefined');

		widget = editor.getControl();
		assert(!isUndefinedOrNull(widget), 'widget is undefined');

		// Create new text model
		textModel = new TextModel('', { isForSimpleWidget: true, defaultEOL: DefaultEndOfLine.LF, detectIndentation: true, indentSize: 0, insertSpaces: false, largeFileOptimizations: false, tabSize: 4, trimAutoWhitespace: false }, null, undefined, undoRedoService);

		// Couple widget with newly created text model
		widget.setModel(textModel);

		// let textModel = widget.getModel() as TextModel;
		assert(!isUndefinedOrNull(widget.getModel()), 'Text model is undefined');
	});

	test('Transform text with no previous selection', () => {
		testWithNoSelection(MarkdownButtonType.BOLD, '****', true);
		testWithNoSelection(MarkdownButtonType.BOLD, '');
		testWithNoSelection(MarkdownButtonType.ITALIC, '__', true);
		testWithNoSelection(MarkdownButtonType.ITALIC, '');
		// testWithNoSelection(MarkdownButtonType.CODE, '```\n\n```', true);
		// testWithNoSelection(MarkdownButtonType.CODE, '\n');
		testWithNoSelection(MarkdownButtonType.HIGHLIGHT, '<mark></mark>', true);
		testWithNoSelection(MarkdownButtonType.HIGHLIGHT, '');
		testWithNoSelection(MarkdownButtonType.LINK, '[]()', true);
		testWithNoSelection(MarkdownButtonType.LINK, '');
		testWithNoSelection(MarkdownButtonType.UNORDERED_LIST, '- ', true);
		testWithNoSelection(MarkdownButtonType.UNORDERED_LIST, '- ');
		testWithNoSelection(MarkdownButtonType.ORDERED_LIST, '1. ', true);
		testWithNoSelection(MarkdownButtonType.ORDERED_LIST, '1. ');
		testWithNoSelection(MarkdownButtonType.IMAGE, '![]()', true);
		testWithNoSelection(MarkdownButtonType.IMAGE, '');
	});

	test('Transform text with one word selected', () => {
		testWithSingleWordSelected(MarkdownButtonType.BOLD, '**WORD**');
		testWithSingleWordSelected(MarkdownButtonType.ITALIC, '_WORD_');
		testWithSingleWordSelected(MarkdownButtonType.CODE, '```\nWORD\n```');
		testWithSingleWordSelected(MarkdownButtonType.HIGHLIGHT, '<mark>WORD</mark>');
		testWithSingleWordSelected(MarkdownButtonType.LINK, '[WORD]()');
		testWithSingleWordSelected(MarkdownButtonType.UNORDERED_LIST, '- WORD');
		testWithSingleWordSelected(MarkdownButtonType.ORDERED_LIST, '1. WORD');
		testWithSingleWordSelected(MarkdownButtonType.IMAGE, '![WORD]()');
	});

	test('Transform text with multiple words selected', () => {
		testWithMultipleWordsSelected(MarkdownButtonType.BOLD, '**Multi Words**');
		testWithMultipleWordsSelected(MarkdownButtonType.ITALIC, '_Multi Words_');
		testWithMultipleWordsSelected(MarkdownButtonType.CODE, '```\nMulti Words\n```');
		testWithMultipleWordsSelected(MarkdownButtonType.HIGHLIGHT, '<mark>Multi Words</mark>');
		testWithMultipleWordsSelected(MarkdownButtonType.LINK, '[Multi Words]()');
		testWithMultipleWordsSelected(MarkdownButtonType.UNORDERED_LIST, '- Multi Words');
		testWithMultipleWordsSelected(MarkdownButtonType.ORDERED_LIST, '1. Multi Words');
		testWithMultipleWordsSelected(MarkdownButtonType.IMAGE, '![Multi Words]()');
	});

	test('Transform text with multiple lines selected', () => {
		testWithMultipleLinesSelected(MarkdownButtonType.BOLD, '**Multi\nLines\nSelected**');
		testWithMultipleLinesSelected(MarkdownButtonType.ITALIC, '_Multi\nLines\nSelected_');
		testWithMultipleLinesSelected(MarkdownButtonType.CODE, '```\nMulti\nLines\nSelected\n```');
		testWithMultipleLinesSelected(MarkdownButtonType.HIGHLIGHT, '<mark>Multi\nLines\nSelected</mark>');
		testWithMultipleLinesSelected(MarkdownButtonType.LINK, '[Multi\nLines\nSelected]()');
		testWithMultipleLinesSelected(MarkdownButtonType.UNORDERED_LIST, '- Multi\n- Lines\n- Selected');
		testWithMultipleLinesSelected(MarkdownButtonType.ORDERED_LIST, '1. Multi\n1. Lines\n1. Selected');
		testWithMultipleLinesSelected(MarkdownButtonType.IMAGE, '![Multi\nLines\nSelected]()');
	});

	function testWithNoSelection(type: MarkdownButtonType, expectedValue: string, setValue = false): void {
		if (setValue) {
			textModel.setValue('');
		}
		markdownTextTransformer.transformText(type);
		assert.equal(textModel.getValue(), expectedValue, `${MarkdownButtonType[type]} with no selection failed`);
	}

	function testWithSingleWordSelected(type: MarkdownButtonType, expectedValue: string): void {
		let value = 'WORD';
		textModel.setValue(value);
		widget.setSelection({ startColumn: 1, startLineNumber: 1, endColumn: 5, endLineNumber: 1 });
		assert.equal(textModel.getValueInRange(widget.getSelection()), value, 'Expected selection is not found');
		markdownTextTransformer.transformText(type);
		assert.equal(textModel.getValue(), expectedValue, `${MarkdownButtonType[type]} with single word selection failed`);
	}

	function testWithMultipleWordsSelected(type: MarkdownButtonType, expectedValue: string): void {
		let value = 'Multi Words';
		textModel.setValue(value);
		widget.setSelection({ startColumn: 1, startLineNumber: 1, endColumn: 12, endLineNumber: 1 });
		assert.equal(textModel.getValueInRange(widget.getSelection()), value, 'Expected multi-word selection is not found');
		markdownTextTransformer.transformText(type);
		assert.equal(textModel.getValue(), expectedValue, `${MarkdownButtonType[type]} with multiple word selection failed`);
	}

	function testWithMultipleLinesSelected(type: MarkdownButtonType, expectedValue: string): void {
		let value = 'Multi\nLines\nSelected';
		textModel.setValue(value);
		widget.setSelection({ startColumn: 1, startLineNumber: 1, endColumn: 9, endLineNumber: 3 });
		assert.equal(textModel.getValueInRange(widget.getSelection()), value, 'Expected multi-line selection is not found');
		markdownTextTransformer.transformText(type);
		assert.equal(textModel.getValue(), expectedValue, `${MarkdownButtonType[type]} with multiple line selection failed`);
	}
});

