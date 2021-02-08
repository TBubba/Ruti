import { create_template, FromTTypeArg } from '../../src';

const config_arg = {
  /** Volume of the audio. */
  volume: 'number',
  /** Automatically play the video/audio. */
  auto_play: 'boolean',
  /** Language of the subtitles (none if undefined). */
  subtitles_language: ['string', 'undefined'],
} as const;

export const config_template = create_template(config_arg);

export type ConfigData = FromTTypeArg<typeof config_arg>

export function createConfigData(): ConfigData {
  return {
    volume: 0.5,
    auto_play: false,
    subtitles_language: undefined,
  };
}
