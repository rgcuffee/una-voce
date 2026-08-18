# Una Voce Social Studio

This is the editable workspace for Una Voce social artwork, carousel slides, captions, and crop review.

The current approved baseline contains nine launch posts and 45 carousel slides. It is the reference implementation of the Una Voce editorial system going forward.

## Open it

- Run `npm run social` to open the studio directly.
- Or run `npm run dev` and open `/social/`.
- In development, the app also links to the studio from **More**.

The default local URL is `http://localhost:5173/social/`.

## Export production artwork

Run:

```sh
npm run social:export:first3
```

This exports Posts 01 through 03 as complete 1080 × 1350 PNG carousels. It also writes individual caption files, a combined caption file, a manifest, and a ZIP package to `exports/instagram/`.

## Current direction

The studio should feel like a very good Catholic publication: part contemporary prayer book, part monastery noticeboard, and part high-end literary journal.

The system is cohesive without being a rigid template. Frames, post numbers, cross marks, footers, and familiar title positions are optional tools. Roughly 25 to 35 percent of the artwork should visibly break the standard composition.

The approved launch sequence is:

1. What is Una Voce?
2. What is the Liturgy of the Hours?
3. No, you do not have to pray all seven.
4. The easiest place to begin.
5. Morning Prayer, Evening Prayer, or Night Prayer?
6. There is more than one way to pray the Hours.
7. What does it mean to pray with the whole Church?
8. What is a Devotion?
9. Prayer can become a rhythm.

The visible Instagram grid renders newest first, so Post 01 appears at the bottom right.

## Edit designs

Add design records to `designs.js`. The preview shell supports:

- 4:5 artwork and centered 1:1 feed-crop review
- Multi-slide carousel navigation
- Rendered caption copy
- Direct links to a design and slide through URL parameters

Preserve the existing studio behavior when iterating on artwork. Use the current carousels as a quality and pacing benchmark rather than copying any one layout across the set.

Every new or revised design should:

- Follow the project-wide editorial standards.
- Avoid em dashes in final copy.
- Remain legible in both 4:5 and 1:1 previews.
- Use strong hierarchy and phone-readable body copy.
- Treat motifs as authored editorial illustration or liturgical diagrams.
- Avoid faux-real objects, generic people icons, gamification, and SaaS-style campaign language.

## Files

- `index.html`: workspace and viewer structure
- `styles.css`: studio interface, artboard shell, and crop styles
- `artwork.css`: approved social artwork system, editorial layouts, and motifs
- `designs.js`: the approved launch sequence, carousel copy, captions, and slide markup
- `app.js`: collection, preview, and URL-state behavior
- `../docs/brand/README.md`: brand-documentation entry point
- `../docs/brand/UNA_VOCE_EDITORIAL_STANDARDS.md`: project-wide writing and editorial rules
- `../docs/brand/UNA_VOCE_INSTAGRAM_VISUAL_GUIDE.md`: written social system
- `../docs/brand/UNA_VOCE_INSTAGRAM_VISUAL_DIRECTION_REFERENCE.png`: approved visual reference board

## Review before handoff

1. Review the complete 3x3 grid in 4:5.
2. Confirm Post 01 is bottom right.
3. Review the complete grid in 1:1.
4. Open every carousel and review pacing from first slide to invitation.
5. Check all important text and motifs against the square crop.
6. Review captions for tone, accuracy, and unnecessary repetition.
7. Search final copy for em dashes.
8. Run `npm run build` before handoff.
