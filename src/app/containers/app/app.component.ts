import { first, distinctUntilChanged, map, filter, take } from 'rxjs/operators';
import { Component, ViewChild, OnDestroy } from '@angular/core';
import { Store, select } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';

import * as uuid from 'uuid/v4';

import * as fromRoot from '../../reducers';
import * as fromHeader from '../../reducers/headers/headers';
import * as fromVariable from '../../reducers/variables/variables';
import * as fromSettings from '../../reducers/settings/settings';
import * as fromCollection from '../../reducers/collection/collection';
import * as fromWindowsMeta from '../../reducers/windows-meta/windows-meta';
import * as fromEnvironments from '../../reducers/environments';

import * as queryActions from '../../actions/query/query';
import * as headerActions from '../../actions/headers/headers';
import * as variableActions from '../../actions/variables/variables';
import * as dialogsActions from '../../actions/dialogs/dialogs';
import * as layoutActions from '../../actions/layout/layout';
import * as docsActions from '../../actions/docs/docs';
import * as windowsActions from '../../actions/windows/windows';
import * as windowsMetaActions from '../../actions/windows-meta/windows-meta';
import * as settingsActions from '../../actions/settings/settings';
import * as donationActions from '../../actions/donation';
import * as windowActions from '../../actions/windows/windows';
import * as collectionActions from '../../actions/collection/collection';
import * as environmentsActions from '../../actions/environments/environments';

import { environment } from '../../../environments/environment';

import {
  WindowService,
  DonationService,
  ElectronAppService,
  KeybinderService,
  PluginRegistryService,
  QueryCollectionService
} from '../../services';

import { AltairConfig } from '../../config';
import isElectron from '../../utils/is_electron';
import { debug } from 'app/utils/logger';
import { untilDestroyed } from 'ngx-take-until-destroy';
import { PluginInstance } from 'app/services/plugin/plugin';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
})
export class AppComponent implements OnDestroy {
  windowIds$: Observable<any[]>;
  settings$: Observable<fromSettings.State>;
  collection$: Observable<fromCollection.State>;
  sortedCollections$: Observable<any[]>;
  windowsMeta$: Observable<fromWindowsMeta.State>;
  environments$: Observable<fromEnvironments.State>;
  activeEnvironment$: Observable<fromEnvironments.EnvironmentState | undefined>;

  windowIds: string[] = [];
  windows = {};
  closedWindows: any[] = [];
  activeWindowId = '';
  isElectron = isElectron;
  isWebApp: boolean;
  isReady = false; // determines if the app is fully loaded. Assets, translations, etc.
  showDonationAlert = false;

  showImportCurlDialog = false;
  showEditCollectionDialog = false;
  showCollections = false;

  appVersion = environment.version;

  installedPlugins: PluginInstance[] = [];

  constructor(
    private windowService: WindowService,
    private store: Store<fromRoot.State>,
    private translate: TranslateService,
    private donationService: DonationService,
    private electronApp: ElectronAppService,
    private keybinder: KeybinderService,
    private pluginRegistry: PluginRegistryService,
    private collectionService: QueryCollectionService,
    private altairConfig: AltairConfig,
  ) {
    this.isWebApp = altairConfig.isWebApp;
    this.settings$ = this.store.pipe(select('settings')).pipe(distinctUntilChanged());
    this.collection$ = this.store.select('collection');
    this.windowsMeta$ = this.store.select('windowsMeta');
    this.environments$ = this.store.select('environments');
    this.sortedCollections$ = this.store.select(fromRoot.selectSortedCollections);
    this.activeEnvironment$ = this.environments$.pipe(
      map(environments => {
        if (environments.activeSubEnvironment) {
          return environments.subEnvironments.find(subEnvironment => subEnvironment.id === environments.activeSubEnvironment);
        }
        return;
      })
    );

    this.setDefaultLanguage();
    this.setAvailableLanguages();

    const applicationLanguage = this.getAppLanguage();
    this.translate.use(applicationLanguage)
    .pipe(untilDestroyed(this))
    .subscribe(() => {
      this.isReady = true;
    });

    // Update the app translation if the language settings is changed.
    // TODO: Consider moving this into a settings effect.
    this.settings$.pipe(
      map(settings => settings.language),
      filter(x => !!x),
      distinctUntilChanged(),
      untilDestroyed(this),
    )
    .subscribe(language => {
      this.translate.use(language);
    });

    this.electronApp.connect();
    this.keybinder.connect();

    this.windowIds$ = this.store.select('windows').pipe(map(windows => {
      return Object.keys(windows);
    }));

    this.store
      .pipe(untilDestroyed(this))
      .subscribe(data => {
        this.windows = data.windows;
        this.windowIds = Object.keys(data.windows);
        this.closedWindows = data.local.closedWindows;
        this.showDonationAlert = data.donation.showAlert;

        this.showImportCurlDialog = data.windowsMeta.showImportCurlDialog;
        this.showEditCollectionDialog = data.windowsMeta.showEditCollectionDialog;

        // Set the window IDs in the meta state if it does not already exist
        if (data.windowsMeta.windowIds) {
          // Filter the IDs based on the windows that are valid.
          // This fixes issues with when windows are removed.
          // Before the effect gets the remove action, the store has already been updated.
          // While this is valid, it causes the component to try to retrieve the invalid window.
          this.windowIds = data.windowsMeta.windowIds.filter(id => !!(this.windows as any)[id]);
        } else {
          this.store.dispatch(new windowsMetaActions.SetWindowIdsAction( { ids: this.windowIds }));
        }

        this.activeWindowId = data.windowsMeta.activeWindowId;
        debug.log(data.windows, this.windowIds);

        // If the active window has not been set, default it
        if (this.windowIds.length && (!this.activeWindowId || !data.windows[this.activeWindowId])) {
          this.store.dispatch(new windowsMetaActions.SetActiveWindowIdAction({ windowId: this.windowIds[0] }));
        }
      });

    if (!this.windowIds.length) {
      this.newWindow();
    }

    this.store.pipe(
      take(1),
      untilDestroyed(this)
    )
    .subscribe(data => {
      if (data.settings.enableExperimental) {
        if (data.settings['plugin.list']) {
          data.settings['plugin.list'].forEach(pluginStr => {
            const pluginInfo = this.pluginRegistry.getPluginInfoFromString(pluginStr);
            if (pluginInfo) {
              this.pluginRegistry.getPlugin(pluginInfo.name, { version: pluginInfo.version });
            }
          });
        }
        // this.pluginRegistry.getPlugin('altair-graphql-plugin-graphql-explorer', { version: '0.0.6' });
        // this.pluginRegistry.getPlugin('altair-graphql-plugin-graphql-explorer', {
        //   pluginSource: 'url',
        //   version: '0.0.4',
        //   url: 'http://localhost:8002/'
        // });
      }
      this.pluginRegistry.installedPlugins()
        .pipe(
          untilDestroyed(this),
        )
        .subscribe(plugins => this.installedPlugins = Object.values(plugins));
    });
  }

  /**
   * Sets the default language
   */
  setDefaultLanguage(): void {
    // Set fallback language to default.json
    this.translate.setDefaultLang('default');
  }

  /**
   * Sets the available languages from config
   */
  setAvailableLanguages(): void {
    const availableLanguages = Object.keys(this.altairConfig.languages);
    this.translate.addLangs(availableLanguages);
  }

  /**
   * Checks if the specified language is available
   * @param language Language code
   */
  checkLanguageAvailability(language: string): boolean {
    return this.translate.getLangs().includes(language);
  }

  /**
   * Gets the language to use for the app
   */
  getAppLanguage(): string {
    const defaultLanguage = this.translate.getDefaultLang();
    const clientLanguage = this.translate.getBrowserLang();
    const isClientLanguageAvailable = this.checkLanguageAvailability(clientLanguage);

    return isClientLanguageAvailable && !this.altairConfig.isTranslateMode ? clientLanguage : defaultLanguage;
  }

  newWindow() {
    this.windowService.newWindow()
    .pipe(
      first(),
      untilDestroyed(this),
    )
    .subscribe(({ url, windowId }) => {
      this.store.dispatch(new windowsMetaActions.SetActiveWindowIdAction({ windowId }));

      if (url) {
        this.store.dispatch(new queryActions.SendIntrospectionQueryRequestAction(windowId));
      }
    });
  }

  setActiveWindow(windowId: string) {
    this.store.dispatch(new windowsMetaActions.SetActiveWindowIdAction({ windowId }));
  }

  removeWindow(windowId: string) {
    this.windowService.removeWindow(windowId);
  }

  duplicateWindow(windowId: string) {
    this.windowService.duplicateWindow(windowId);
  }

  setWindowName({ windowId = '', windowName = '' }) {
    this.store.dispatch(new layoutActions.SetWindowNameAction(windowId, windowName));
  }

  repositionWindow({ currentPosition, newPosition }: { currentPosition: number, newPosition: number }) {
    this.store.dispatch(new windowsMetaActions.RepositionWindowAction({ currentPosition, newPosition }));
  }

  reopenClosedWindow() {
    this.store.dispatch(new windowActions.ReopenClosedWindowAction());
  }

  importWindow() {
    this.store.dispatch(new windowsActions.ImportWindowAction());
  }

  importWindowFromCurl(data: string) {
    this.store.dispatch(new windowsActions.ImportWindowFromCurlAction({ data }));
  }

  showSettingsDialog() {
    this.store.dispatch(new windowsMetaActions.ShowSettingsDialogAction({ value: true }));
  }

  hideSettingsDialog() {
    this.store.dispatch(new windowsMetaActions.ShowSettingsDialogAction({ value: false }));
  }

  setSettingsJson(settingsJson: string) {
    this.store.dispatch(new settingsActions.SetSettingsJsonAction({ value: settingsJson }));
  }

  setShowImportCurlDialog(value: boolean) {
    this.store.dispatch(new windowsMetaActions.ShowImportCurlDialogAction({ value }));
  }

  onThemeChange(theme: fromSettings.SettingsTheme) {
    this.store.dispatch(new settingsActions.SetThemeAction({ value: theme }));
  }

  onLanguageChange(language: fromSettings.SettingsLanguage) {
    this.store.dispatch(new settingsActions.SetLanguageAction({ value: language }));
  }

  onAddQueryDepthLimitChange(depthLimit: number) {
    this.store.dispatch(new settingsActions.SetAddQueryDepthLimitAction({ value: depthLimit }));
  }

  onTabSizeChange(tabSize: number) {
    this.store.dispatch(new settingsActions.SetTabSizeAction({ value: tabSize }));
  }

  prettifyCode() {
    this.store.dispatch(new queryActions.PrettifyQueryAction(this.activeWindowId));
  }

  compressQuery() {
    this.store.dispatch(new queryActions.CompressQueryAction(this.activeWindowId));
  }

  clearEditor() {
    this.store.dispatch(new queryActions.SetQueryAction(``, this.activeWindowId));
  }

  copyAsCurl() {
    this.store.dispatch(new queryActions.CopyAsCurlAction(this.activeWindowId));
  }

  convertToNamedQuery() {
    this.store.dispatch(new queryActions.ConvertToNamedQueryAction(this.activeWindowId));
  }

  toggleHeader(isOpen: boolean) {
    this.store.dispatch(new dialogsActions.ToggleHeaderDialogAction(this.activeWindowId));
  }

  toggleVariableDialog(isOpen = undefined) {
    this.store.dispatch(new dialogsActions.ToggleVariableDialogAction(this.activeWindowId));
  }

  toggleSubscriptionUrlDialog(isOpen: boolean) {
    this.store.dispatch(new dialogsActions.ToggleSubscriptionUrlDialogAction(this.activeWindowId));
  }

  toggleHistoryDialog(isOpen: boolean) {
    this.store.dispatch(new dialogsActions.ToggleHistoryDialogAction(this.activeWindowId));
  }

  togglePreRequestDialog(isOpen: boolean) {
    this.store.dispatch(new dialogsActions.TogglePreRequestDialogAction(this.activeWindowId));
  }

  toggleEnvironmentManager(show: boolean) {
    this.store.dispatch(new windowsMetaActions.ShowEnvironmentManagerAction({ value: show }));
  }

  updateBaseEnvironmentJson(opts: { value: string }) {
    this.store.dispatch(new environmentsActions.UpdateBaseEnvironmentJsonAction(opts));
  }
  updateSubEnvironmentJson(opts: { id: string, value: string }) {
    this.store.dispatch(new environmentsActions.UpdateSubEnvironmentJsonAction(opts));
  }
  updateSubEnvironmentTitle(opts: { id: string, value: string }) {
    this.store.dispatch(new environmentsActions.UpdateSubEnvironmentTitleAction(opts));
  }

  addNewSubEnvironment() {
    this.store.dispatch(new environmentsActions.AddSubEnvironmentAction({ id: uuid() }));
  }
  deleteSubEnvironment(opts: { id: string }) {
    this.store.dispatch(new environmentsActions.DeleteSubEnvironmentAction(opts));
    this.selectActiveEnvironment();
  }
  selectActiveEnvironment(id?: string) {
    this.store.dispatch(new environmentsActions.SelectActiveSubEnvironmentAction({ id }));
  }

  toggleCollections() {
    this.showCollections = !this.showCollections;
  }

  loadCollections() {
    this.store.dispatch(new collectionActions.LoadCollectionsAction());
  }

  selectQueryFromCollection({
    query,
    collectionId,
    windowIdInCollection
  }: { query: fromCollection.IQuery, collectionId: number, windowIdInCollection: string }) {
    this.windowService.importWindowData({ ...query, collectionId, windowIdInCollection });
  }

  deleteQueryFromCollection({ collectionId, query }: { collectionId: number, query: fromCollection.IQuery }) {
   this.store.dispatch(new collectionActions.DeleteQueryFromCollectionAction({ collectionId, query }));
  }

  deleteCollection({ collectionId }: { collectionId: number }) {
    this.store.dispatch(new collectionActions.DeleteCollectionAction({ collectionId }));
  }

  exportCollection({ collectionId }: { collectionId: number }) {
    this.store.dispatch(new collectionActions.ExportCollectionAction({ collectionId }));
  }

  importCollection() {
    this.store.dispatch(new collectionActions.ImportCollectionAction());
  }

  toggleEditCollectionDialog({ collection }: { collection: fromCollection.IQueryCollection }) {
    this.store.dispatch(new collectionActions.SetActiveCollectionAction({ collection }));
    this.store.dispatch(new windowsMetaActions.ShowEditCollectionDialogAction({ value: true }));
  }

  setShowEditCollectionDialog(value: boolean) {
    this.store.dispatch(new windowsMetaActions.ShowEditCollectionDialogAction({ value }));
  }

  updateCollection({ collection }: { collection: fromCollection.IQueryCollection & { id: number } }) {
    this.store.dispatch(new collectionActions.UpdateCollectionAction({ collectionId: collection.id, collection }));
  }

  sortCollections({ sortBy = '' as fromCollection.SortByOptions }) {
    this.store.dispatch(new collectionActions.SortCollectionsAction({ sortBy }));
  }

  togglePluginActive(plugin: PluginInstance) {
    this.pluginRegistry.setPluginActive(plugin.name, !plugin.isActive);
  }

  async fileDropped(event: any) {
    const dataTransfer: DataTransfer = event.mouseEvent.dataTransfer;
    if (dataTransfer && dataTransfer.files && dataTransfer.files.length) {
      try {
        // Handle window import
        await this.windowService.handleImportedFile(dataTransfer.files);
      } catch (error) {
        debug.log(error);
        try {
          // Handle collection import
          await this.collectionService.handleImportedFile(dataTransfer.files)
        } catch (collectionError) {
          debug.log(collectionError);
        }
      }
    }
  }

  hideDonationAlert() {
    this.store.dispatch(new donationActions.HideDonationAlertAction());
  }

  openDonationPage(e: Event) {
    this.donationService.donated();
    this.externalLink(e, this.altairConfig.donation.url);
    this.hideDonationAlert();
  }

  openWebAppLimitationPost(e: Event) {
    this.externalLink(e, 'https://sirmuel.design/altair-graphql-web-app-limitations-b671a0a460b8');
  }

  externalLink(e: Event, url: string) {
    e.preventDefault();

    // If electron app
    if ((window as any).process && (window as any).process.versions.electron) {
      const electron = (window as any).require('electron');
      electron.shell.openExternal(url);
    } else {
      const win = window.open(url, '_blank');
      if (win) {
        win.focus();
      }
    }
  }

  trackById(index: number, item: any) {
    return item.id;
  }

  ngOnDestroy() {}
}
