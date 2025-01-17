import * as settings from '../../actions/settings/settings';
import { getAltairConfig } from '../../config';
import { jsonc } from 'app/utils';

const config = getAltairConfig();
export type SettingsTheme = 'light' | 'dark' | 'dracula';
export type SettingsLanguage = keyof typeof config.languages;

export interface State {

  /**
   * Specifies the theme
   * Options: 'light', 'dark', 'dracula'
   */
  theme: SettingsTheme;

  /**
   * Specifies the language e.g. 'en-US', 'fr-FR', 'ru-RU', etc
   */
  language: SettingsLanguage;

  /**
   * Specifies how deep the 'Add query' functionality would go
   */
  addQueryDepthLimit: number;

  /**
   * Specifies the tab size in the editor
   */
  tabSize: number;

  /**
   * Enable experimental features in Altair.
   * Note: The features might be unstable.
   */
  enableExperimental?: boolean;

  // 'theme.foreground': string;
  // 'theme.header.background': string;

  /**
   * Specifies the base font size
   * (Default size - 24)
   */
  'theme.fontsize'?: number;

  /**
   * Specifies the font family for the editors
   */
  'theme.editorFontFamily'?: string;

  /**
   * Specifies if the push notifications should be disabled
   */
  disablePushNotification?: boolean;

  /**
   * Specifies a list of enabled plugins (requires enableExperimental to be true)
   */
  'plugin.list'?: string[];
}

export const getInitialState = (): State => {
  const altairConfig = getAltairConfig();
  return {
    theme: <SettingsTheme>altairConfig.defaultTheme,
    language: <SettingsLanguage>altairConfig.default_language,
    addQueryDepthLimit: altairConfig.add_query_depth_limit,
    tabSize: altairConfig.tab_size,
  };
};

export function settingsReducer(state = getInitialState(), action: settings.Action): State {
  switch (action.type) {
    case settings.SET_SETTINGS_JSON:
      const newState = { ...getInitialState(), ...jsonc(action.payload.value) };

      // Removes old isShown state
      delete newState.isShown;

      return newState;
    case settings.SET_THEME:
      return { ...state, theme: action.payload.value };
    case settings.SET_LANGUAGE:
      return { ...state, language: action.payload.value };
    case settings.SET_ADD_QUERY_DEPTH_LIMIT:
      return { ...state, addQueryDepthLimit: action.payload.value };
    case settings.SET_TAB_SIZE_ACTION:
      return { ...state, tabSize: action.payload.value };
    default:
      return state;
  }
}
