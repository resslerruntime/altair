
/**
 * Defines the repository of the plugin.
 * Used to know where to get the plugin from.
 */
export enum PluginSource {
  NPM = 'npm',
  GITHUB = 'github',
  URL = 'url',
}

/**
 * Specifies the type of the plugin.
 * Determines how the plugin would interact with Altair.
 */
export enum PluginType {
  SIDEBAR = 'sidebar',
}

/**
 * Specifies the capabilities (functionalities) available to the plugin.
 * In the future, this would be used to request the necessary permissions from the user.
 */
export enum PluginCapabilities {
  'query:read',
  'query:write',
  'header:read',
  'header:write',
  'environment:read',
  'environment:write',
}

export interface PluginSidebarOptions {
  element_name: string;
  icon: string;
}

/**
 * Plugin Manifest Structure
 */
export interface PluginManifest {
  // Version of manifest. Should be 1 for now.
  manifest_version: number;
  name: string;
  display_name: string;
  version: string;
  description: string;
  author_email?: string;
  author?: string;
  type: PluginType;
  sidebar_opts?: PluginSidebarOptions;
  scripts: string[];
  styles?: string[];
  // Plugin capabilities
  capabilities?: PluginCapabilities[];
}

export interface PluginInstance {
  name: string;
  display_name: string;
  type: PluginType;
  capabilities: PluginCapabilities[];
  sidebar_opts?: PluginSidebarOptions;
  props?: any;
  context?: any;
  isActive: boolean;
  manifest: PluginManifest;
}

export interface PluginRegistryMap {
  [s: string]: PluginInstance;
}

export interface GetPluginOption {
  pluginSource?: PluginSource;
  version?: string;
  [key: string]: any;
}

export interface PluginComponentDataProps {
  // SDL representing GraphQL schema for the current window
  sdl: string;
  // Query for the current window
  query: string;
}
export interface PluginComponentDataContext {
  // Sets the query in the current window
  setQuery: Function;
}
export interface PluginComponentData extends PluginInstance {
  props: PluginComponentDataProps;
  context: PluginComponentDataContext;
}

export interface PluginElement extends HTMLElement {
  props?: PluginComponentDataProps & { ctx: PluginComponentDataContext };
}

export class AltairPlugin implements PluginInstance {
  type = PluginType.SIDEBAR;
  sidebar_opts?: PluginSidebarOptions;
  isActive = false;
  // props: any;
  // context: any;
  display_name = '';
  capabilities: PluginCapabilities[] = [ PluginCapabilities['query:read'], PluginCapabilities['query:write'] ];
  constructor(public name: string, public manifest: PluginManifest) {
    this.sidebar_opts = manifest.sidebar_opts;
    this.type = manifest.type;
    this.display_name = manifest.display_name || name;
    this.capabilities = Array.from(new Set([ ...(manifest.capabilities || []), ...this.capabilities ]));
  }
}
