# Commonplace + Zettelkasten

One static site, two apps on one address:
- `/`        Commonplace (other people's words)
- `/notes/`  Zettelkasten (your own thoughts, linked to those words)

## Deploy over your existing site (keeps your data)
Your entries live in the browser at your site's address, so deploy to the SAME Netlify site, not a new one.
1. Netlify, open your commonplace site, Deploys tab.
2. Drag this folder (unzipped) onto "Drag and drop your site output folder here".
3. Open the site. Commonplace now shows a "Notebook" link in its left rail and on Settings.
Do a Settings, Download backup before deploying, as a precaution.

## Install
- Commonplace installs from `/`. The Zettelkasten installs from `/notes/`.
- Load each once while online; after that both work offline.

## Updating
1. Change files, redeploy.
2. If you add, rename, or remove files, update the `SHELL` list in that app's `sw.js`.
3. Bump `VERSION` in that app's `sw.js` (`cp-6` for commonplace, `zk-8` for notes).
Commonplace updates apply silently. The notebook shows an "Update available" prompt.

## Deploying on Vercel instead of Netlify
`vercel.json` carries the same security policy and cache rules as `_headers`. Import the repo in Vercel with no framework, no build command, and the repo root as the output directory.
Your notes live in the browser for ONE site address. A Vercel address is a new origin, so it starts empty: download a backup from each app (commonplace Settings, notebook Settings) and import it on the new address. Both apps must stay on the same address so the notebook can read commonplace entries.

## Notes
- "Write a note about this" on a commonplace entry opens a new notebook draft with that quote already attached as its source.
- Commonplace entries show "Cited in" links to the Zettelkasten notes that use them (read-only, live).
- Each app keeps its own database, but because they share one address the notebook reads your commonplace entries live (read-only) whenever you pick a source. Nothing is copied or imported. If the commonplace book isn't found on the site, the notebook falls back to a backup zip imported in its Settings.
- Files that must stay together at the top level: `_headers` (security policy, caching) and `netlify.toml`.
- Icons are placeholders. Replace the files in `icons/` and `notes/icons/` with your own at the same sizes.
