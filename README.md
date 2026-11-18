# Picky Eater Planner (niche project)

Same engine as `../niche-engine` (render cards, post to Instagram daily with GitHub Actions). Setup steps for the Instagram token, GitHub repo and secrets are in `../niche-engine/README.md`.

- `config.json`: brand, hashtags, disclaimer, colors, image URL base
- `content/queue.json`: 30 queued posts. `node src/render.js` makes the cards, `node src/post.js --dry-run` previews the next post
- `products/`: `build_sheet.py` (workbook), `build_print.js` (PDF and listing images), `listing-draft.md`
- `products/build_more.js`: Lunchbox Planner and Mealtime Charts PDFs plus their listing images and a bundle image; `products/listing-drafts-lunchbox-charts-bundle.md` has their listing drafts
- `mockups/`: listing images for all products (planner: 00-03, lunch-, charts-, bundle-)

Rebuild: `python products/build_sheet.py` and `node products/build_print.js`.

Compliance: keep all wording about organizing and tracking. No health, growth or weight claims.
