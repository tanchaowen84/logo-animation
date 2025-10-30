import path from 'path';
import { Config } from '@remotion/cli/config';

Config.overrideWebpackConfig((currentConfig) => {
  return {
    ...currentConfig,
    resolve: {
      ...currentConfig.resolve,
      alias: {
        ...(currentConfig.resolve?.alias ?? {}),
        '@runtime': path.resolve(process.cwd(), 'remotion', 'runtime'),
      },
    },
  };
});
