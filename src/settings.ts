export interface ObsidianAISettings {
  inboxFolder: string;
  sessionsFolder: string;
}

export const DEFAULT_SETTINGS: ObsidianAISettings = {
  inboxFolder: 'inbox',
  sessionsFolder: 'sessions',
};
