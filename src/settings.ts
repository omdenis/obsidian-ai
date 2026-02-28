export type WhisperModel = 'turbo' | 'base' | 'small' | 'large';

export const WHISPER_MODELS: WhisperModel[] = ['turbo', 'base', 'small', 'large'];

export interface ObsidianAISettings {
  inboxFolder: string;
  sessionsFolder: string;
  whisperModel: WhisperModel;
}

export const DEFAULT_SETTINGS: ObsidianAISettings = {
  inboxFolder: 'inbox',
  sessionsFolder: 'sessions',
  whisperModel: 'turbo',
};
