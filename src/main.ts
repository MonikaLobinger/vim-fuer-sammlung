import {App, Editor, MarkdownView, Modal, Notice, Plugin} from 'obsidian';
import { VimSammlungSettings,
         VimSammlungSettingTab,
         VimStatusPrompt ,
         VimStatusPromptMap,
         vimStatus
        } from './settings';
import { defineAndMapObsidianVimAction, defineAndMapObsidianVimMotion } from './utils/obsidianVimCommand';
import { VimApi } from './utils/vimApi';

const DEFAULT_SETTINGS: VimSammlungSettings = {
  exmpSetting: 'default',
  vimStatusPromptMap: {
    normal:  '🟢',
    insert:  '🟠',
    visual:  '🟡',
    replace: '🔴',
  },
}
const vimStatusCssClass = "vim-sammlung-statusbar";
export default class VimSammlung extends Plugin {
  settings: VimSammlungSettings;
  private initialized = false;
  private codeMirrorVimObject: any = null;
  private vimChordStatusBar: HTMLElement = null;
  private vimStatusBar: HTMLElement = null;
  private currentVimStatus: vimStatus = vimStatus.normal;
  private isInsertMode: boolean = false;
  private getActiveView(): MarkdownView {
    return this.app.workspace.getActiveViewOfType(MarkdownView);
  }
  getActiveObsidianEditor(): ObsidianEditor {
    return this.getActiveView().editor;
  }
  private getCodeMirror(view: MarkdownView): CodeMirror.Editor {
    return (view as any).editMode?.editor?.cm?.cm;
  }
  prepareChordDisplay() {
    this.vimChordStatusBar = this.addStatusBarItem();

    // Move vimChordStatusBar to the leftmost position and center it.
    let parent = this.vimChordStatusBar.parentElement;
    this.vimChordStatusBar.parentElement.insertBefore(this.vimChordStatusBar, parent.firstChild);
    this.vimChordStatusBar.style.marginRight = "auto";

    const view = this.getActiveView();
    if (!view) return;
    //xx let cmEditor = this.getCodeMirror(view);
    //xx cmEditor.off('vim-keypress', this.onVimKeypress);
    //xx cmEditor.on('vim-keypress', this.onVimKeypress);
    //xx cmEditor.off('vim-command-done', this.onVimCommandDone);
    //xx cmEditor.on('vim-command-done', this.onVimCommandDone);
  }
  prepareVimModeDisplay() {
    console.log("prepareVimModeDisplay")
    this.vimStatusBar = this.addStatusBarItem()
    let parent = this.vimStatusBar.parentElement;
    parent.insertBefore(this.vimStatusBar, parent.firstChild);
    this.vimStatusBar.addClass(vimStatusCssClass);
    this.vimStatusBar.style.marginRight = "auto";

    this.vimStatusBar.setText(
      this.settings.vimStatusPromptMap[this.currentVimStatus]
    );
    this.vimStatusBar.dataset.vimMode = this.currentVimStatus;
  }
  updateVimStatusBar() {
    console.log("updateVimStatusbar " + this.currentVimStatus)
    this.vimStatusBar.setText(
      this.settings.vimStatusPromptMap[this.currentVimStatus]
    );
    this.vimStatusBar.dataset.vimMode = this.currentVimStatus;
  }
  logVimModeChange = async (cm: any) => {
    console.log("logVimModeChange ")
    console.log(cm)
    if (!cm) return;
    this.isInsertMode = cm.mode === 'insert';
    switch (cm.mode) {
      case "insert":
        this.currentVimStatus = vimStatus.insert;
        break;
      case "normal":
        this.currentVimStatus = vimStatus.normal;
        break;
      case "visual":
        this.currentVimStatus = vimStatus.visual;
        break;
      case "replace":
        this.currentVimStatus = vimStatus.replace;
        break;
      default:
        break;
    }
    this.updateVimStatusBar();
  }
  async updateVimEvents() {
    console.log("updateVimEvents")
    if (!(this.app as Any).isVimEnabled())
      return;
    console.log("vim is enabled")
    let view = this.getActiveView();
    if (view) {
      const cmEditor = this.getCodeMirror(view);

      // See https://codemirror.net/doc/manual.html#vimapi_events for events.
      this.isInsertMode = false;
      this.currentVimStatus = vimStatus.normal;
      this.updateVimStatusBar();
      console.log("In updateVimEvents cmEditor: " +  cmEditor)
      if (!cmEditor) return;
      cmEditor.off('vim-mode-change', this.logVimModeChange);
      cmEditor.on('vim-mode-change', this.logVimModeChange);

      this.currentKeyChord = [];
      //xx cmEditor.off('vim-keypress', this.onVimKeypress);
      //xx cmEditor.on('vim-keypress', this.onVimKeypress);
      //xx cmEditor.off('vim-command-done', this.onVimCommandDone);
      //xx cmEditor.on('vim-command-done', this.onVimCommandDone);
      //xx CodeMirror.off(cmEditor.getInputField(), 'keydown', this.onKeydown);
      //xx CodeMirror.on(cmEditor.getInputField(), 'keydown', this.onKeydown);
    }
  }
  async initialize() {
    if (this.initialized)
      return;

    this.codeMirrorVimObject = (window as any).CodeMirrorAdapter?.Vim;

    this.prepareChordDisplay();
    this.prepareVimModeDisplay();

    this.app.workspace.on("active-leaf-change", async () => {
      this.updateVimEvents();
    });
    this.app.workspace.on("file-open", async () => {
      this.updateVimEvents();
    });

    this.initialized = true;
  }
  async onload() {
    console.log("VimSammlung OnLoad")
    await this.loadSettings();
    await this.initialize();
    this.addRibbonIcon('dice', 'VimSammlung', (evt: MouseEvent) => {
      new Notice('HoHo!');
    });
    this.addCommand({
      id: 'open-modal-simple',
      name: 'Open modal (simple)',
      callback: () => {
        new VimSammlungModal(this.app).open();
      }
    });
    this.addCommand({
      id: 'replace-selected',
      name: 'Replace selected content',
      editorCallback: (editor: Editor, view: MarkdownView) => {
        editor.replaceSelection('Beispiel fuer editor command');
      }
    });
    this.addCommand({
      id: 'open-modal-complex',
      name: 'Open modal (complex)',
      checkCallback: (checking: boolean) => {
        const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (markdownView) {
          if (!checking) {
            new VimSammlungModal(this.app).open();
          }
          return true;
        }
        return false;
      }
    });
    this.addSettingTab(new VimSammlungSettingTab(this.app, this));
    this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
      new Notice("Click");
    });
    this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
    console.log("VimSammlung Loaded")
  }
  onunload() {
    console.log("VimSammlung OnUnload")
    this.vimStatusBar.remove()
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<VimSammlungSettings>);
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
}

class VimSammlungModal extends Modal {
  constructor(app: App) {
    super(app);
  }
  onOpen() {
    let {contentEl} = this;
    contentEl.setText('Woah!');
  }
  onClose() {
    const {contentEl} = this;
    contentEl.empty();
  }
}
