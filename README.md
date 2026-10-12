# nyc-data-general

Interactive maps and visualizations of New York City open data. Navigable from
the borough level down to individual police precincts.

**Live site: https://nomotonyc.github.io/nyc-data-general/**

Three broad categories of data are planned:

| Category | Coverage |
| --- | --- |
| Demographic | Population, density, and composition by geography. |
| Fire | Incidents and causes, from the Bureau of Fire Investigations. |
| Medical | Emergency medical response and public health indicators. |

Data comes from [NYC Open Data](https://data.cityofnewyork.us/).

## Development

```sh
npm install
npm run dev      # http://localhost:5173/nyc-data-general/
```

```sh
npm run build    # type-check and bundle to dist/
npm run preview  # serve the production build locally
npm run lint
```

### Phones and touch

Below 1100px the columns stack; at 640px and below the page is the map and the
panel, with the map's settings behind a button. Touch is told apart from a mouse
per press, not by screen size: a tap shows a place's card, and a second tap (or
the card's button) focuses or pins it.

To try it on a laptop, open Chrome DevTools (⌥⌘I) and its device toolbar
(⌘⇧M), and pick a phone: the trackpad then sends touch events. On a phone on
the same Wi-Fi, run `npx vite --host` and open the Network address it prints.

## Deployment

Pushing to `main` triggers `.github/workflows/pages.yml`, which builds the app
and publishes `dist/` to GitHub Pages.
