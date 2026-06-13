// app.config.js
// Injiziert den Google-Maps-Android-Key aus der Umgebung (.env),
// damit der Schlüssel NICHT im (öffentlichen) Repo landet.
// Lokal anlegen:  echo 'GOOGLE_MAPS_API_KEY=DEIN_KEY' > .env   (und .env in .gitignore)
module.exports = ({ config }) => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || '';
  return {
    ...config,
    android: {
      ...(config.android || {}),
      config: {
        ...((config.android && config.android.config) || {}),
        googleMaps: { apiKey },
      },
    },
  };
};
