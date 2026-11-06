# @lp-labs/resume-designer

Structured resume data, deterministic approximate page layout, overflow diagnostics, and JSON
export. It does not render fonts or provide an ATS compatibility guarantee.

## Install and quickstart

```sh
npm install @lp-labs/resume-designer
```

```js
import { createResume, layoutResume, exportResumeJson } from '@lp-labs/resume-designer';

const resume = createResume({
  name: 'Jordan Example',
  contact: ['jordan@example.test'],
  sections: [
    {
      id: 'work',
      kind: 'experience',
      title: 'Experience',
      entries: [
        {
          heading: 'Designer',
          subheading: 'Example Studio',
          date: '2022–2025',
          details: ['Built a toolkit'],
        },
      ],
    },
  ],
});
const layout = layoutResume(resume);
console.log(layout.pages, layout.overflow);
console.log(exportResumeJson(resume));
```

## API and types

- `createResume(input, limits?): ResumeDocument` validates, copies, and freezes structured data.
- `layoutResume(input, options?): ResumeLayout` places approximate text blocks in reading order.
  Blocks are not split, and oversized blocks are returned with explicit `overflow` diagnostics.
- `exportResumeJson(input): string` returns indented JSON after validation.
- `ResumeDocument`: `name`, `contact[]`, `sections[]`.
- `ResumeSection`: unique `id`, `kind` (`summary`, `experience`, `education`, `skills`, `projects`,
  `custom`), `title`, and `entries[]`.
- `ResumeEntry`: `heading`, optional `subheading`, `date`, and `details[]`.
- `ResumeLayoutOptions`: optional page dimensions, margin, approximate font/line size, and input
  limits. `ResumeLayout` returns dimensions, page count, block placements and overflow.
- `ResumeBlock`: stable id, block kind/text, page, x/y, width and estimated height.

## Customization, errors, and limits

Use the supported section kinds or `custom` for your own labels. Layout wraps using an approximate
character-width heuristic; supply your own renderer and font metrics when exact visual fidelity is
required. The package makes no claims about ATS parsing, ranking, or acceptance.

Defaults and hard ceilings: 100 sections, 1,000 entries, 100,000 text characters; 4,000 characters
per detail/contact text; at most 100 details per entry. Page dimensions are positive and at most
10,000 units; margins must leave content space. Limits can be lowered but not raised. Duplicate or
unsafe section IDs and malformed values throw `TypeError`; invalid dimensions and exceeded limits
throw `RangeError`. Work and memory are linear in the bounded text and entry count.

## Modules and development

Independent ESM and CommonJS builds with declarations; no runtime or peer dependencies.
CommonJS: `const { createResume } = require('@lp-labs/resume-designer')`.
TypeScript ^5.9.3 and Prettier ^3.6.2 are development-only.
Run `npm run build`, `npm run typecheck`, `npm test`, `npm run format`, `npm run format:check`.

## Support

If this library is useful to you, consider supporting its maintenance with a [donation via PayPal](https://www.paypal.me/LibinPrasanth).

## Author

Created by [Libin Prasanth](https://www.linkedin.com/in/libinprasanth/). Connect on LinkedIn for updates and discussion.
