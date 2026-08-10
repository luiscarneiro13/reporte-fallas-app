module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        'babel-preset-expo',
        {
          // Zustand persist (ESM) uses import.meta.env — breaks Expo web without this
          unstable_transformImportMeta: true,
        },
      ],
    ],
    plugins: [],
  };
};
