export type ResumeSectionKind =
  'summary' | 'experience' | 'education' | 'skills' | 'projects' | 'custom';

export interface ResumeEntry {
  readonly heading: string;
  readonly subheading?: string;
  readonly date?: string;
  readonly details?: readonly string[];
}

export interface ResumeSection {
  readonly id: string;
  readonly kind: ResumeSectionKind;
  readonly title: string;
  readonly entries: readonly ResumeEntry[];
}

export interface ResumeDocument {
  readonly name: string;
  readonly contact: readonly string[];
  readonly sections: readonly ResumeSection[];
}

export interface ResumeLayoutOptions {
  readonly pageWidth?: number;
  readonly pageHeight?: number;
  readonly margin?: number;
  readonly fontSize?: number;
  readonly lineHeight?: number;
  readonly maxSections?: number;
  readonly maxEntries?: number;
  readonly maxCharacters?: number;
}

export interface ResumeBlock {
  readonly id: string;
  readonly kind: 'identity' | 'contact' | 'section' | 'entry' | 'detail';
  readonly text: string;
  readonly page: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface ResumeLayout {
  readonly pageWidth: number;
  readonly pageHeight: number;
  readonly pages: number;
  readonly blocks: readonly ResumeBlock[];
  readonly overflow: readonly { readonly id: string; readonly page: number }[];
}

const defaults = { pageWidth: 612, pageHeight: 792, margin: 48, fontSize: 10, lineHeight: 14 };
const maxLimits = { maxSections: 100, maxEntries: 1000, maxCharacters: 100_000 };

function bounded(
  value: number | undefined,
  fallback: number,
  ceiling: number,
  name: string,
): number {
  const result = value ?? fallback;
  if (!Number.isFinite(result) || result <= 0 || result > ceiling)
    throw new RangeError(`${name} must be positive and at most ${ceiling}.`);
  return result;
}

function cleanText(value: unknown, name: string, maximum = 4000): string {
  if (
    typeof value !== 'string' ||
    value.length > maximum ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(value)
  )
    throw new TypeError(`${name} must be plain text of at most ${maximum} characters.`);
  return value;
}

function validateDocument(input: ResumeDocument, limits: ResumeLayoutOptions): ResumeDocument {
  if (
    !input ||
    typeof input !== 'object' ||
    !Array.isArray(input.contact) ||
    !Array.isArray(input.sections)
  )
    throw new TypeError('Expected a resume with contact and section arrays.');
  const maxSections = bounded(
    limits.maxSections,
    maxLimits.maxSections,
    maxLimits.maxSections,
    'maxSections',
  );
  const maxEntries = bounded(
    limits.maxEntries,
    maxLimits.maxEntries,
    maxLimits.maxEntries,
    'maxEntries',
  );
  const maxCharacters = bounded(
    limits.maxCharacters,
    maxLimits.maxCharacters,
    maxLimits.maxCharacters,
    'maxCharacters',
  );
  if (input.sections.length > maxSections) throw new RangeError('Section limit exceeded.');
  if (input.contact.length > 100) throw new RangeError('Contact limit exceeded.');
  let entries = 0;
  let characters = cleanText(input.name, 'name', 200).length;
  const ids = new Set<string>();
  const sections = input.sections.map((section) => {
    if (!section || !Array.isArray(section.entries)) throw new TypeError('Invalid resume section.');
    if (!/^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$/u.test(section.id) || ids.has(section.id))
      throw new TypeError('Section ids must be unique and use safe identifier characters.');
    ids.add(section.id);
    if (
      !['summary', 'experience', 'education', 'skills', 'projects', 'custom'].includes(section.kind)
    )
      throw new TypeError('Unknown resume section kind.');
    const title = cleanText(section.title, 'section title', 200);
    characters += title.length;
    const normalizedEntries = section.entries.map((entry: ResumeEntry) => {
      entries += 1;
      if (entries > maxEntries) throw new RangeError('Entry limit exceeded.');
      const heading = cleanText(entry.heading, 'entry heading', 500);
      const subheading =
        entry.subheading === undefined ? undefined : cleanText(entry.subheading, 'subheading');
      const date = entry.date === undefined ? undefined : cleanText(entry.date, 'date', 200);
      const details = entry.details?.map((detail: string) => cleanText(detail, 'detail'));
      characters += heading.length + (subheading?.length ?? 0) + (date?.length ?? 0);
      for (const detail of details ?? []) characters += detail.length;
      if (details && details.length > 100) throw new RangeError('Detail limit exceeded.');
      return Object.freeze({
        heading,
        ...(subheading === undefined ? {} : { subheading }),
        ...(date === undefined ? {} : { date }),
        ...(details === undefined ? {} : { details: Object.freeze(details) }),
      });
    });
    return Object.freeze({
      id: section.id,
      kind: section.kind,
      title,
      entries: Object.freeze(normalizedEntries),
    });
  });
  const contact = input.contact.map((value) => cleanText(value, 'contact', 500));
  characters += contact.reduce((sum, value) => sum + value.length, 0);
  if (characters > maxCharacters) throw new RangeError('Character limit exceeded.');
  return Object.freeze({
    name: cleanText(input.name, 'name', 200),
    contact: Object.freeze(contact),
    sections: Object.freeze(sections),
  });
}

/** Validates and snapshots structured resume data; it does not assert ATS compatibility. */
export function createResume(
  input: ResumeDocument,
  limits: ResumeLayoutOptions = {},
): ResumeDocument {
  return validateDocument(input, limits);
}

/** Produces approximate deterministic text blocks; no font engine or ATS guarantee is implied. */
export function layoutResume(
  input: ResumeDocument,
  options: ResumeLayoutOptions = {},
): ResumeLayout {
  const resume = validateDocument(input, options);
  const pageWidth = bounded(options.pageWidth, defaults.pageWidth, 10_000, 'pageWidth');
  const pageHeight = bounded(options.pageHeight, defaults.pageHeight, 10_000, 'pageHeight');
  const margin = options.margin ?? defaults.margin;
  const fontSize = bounded(options.fontSize, defaults.fontSize, 200, 'fontSize');
  const lineHeight = bounded(options.lineHeight, defaults.lineHeight, 500, 'lineHeight');
  if (!Number.isFinite(margin) || margin < 0 || margin * 2 >= pageWidth || margin * 2 >= pageHeight)
    throw new RangeError('Margins must leave positive page content space.');
  const width = pageWidth - 2 * margin;
  const bottom = pageHeight - margin;
  const blocks: ResumeBlock[] = [];
  const overflow: { id: string; page: number }[] = [];
  let page = 1;
  let y = margin;
  const add = (id: string, kind: ResumeBlock['kind'], text: string, emphasis = false) => {
    const charsPerLine = Math.max(1, Math.floor(width / (fontSize * 0.55)));
    const height = Math.max(
      lineHeight,
      Math.ceil(Math.max(1, text.length) / charsPerLine) * lineHeight,
    );
    if (y + height > bottom && y > margin) {
      page += 1;
      y = margin;
    }
    blocks.push(Object.freeze({ id, kind, text, page, x: margin, y, width, height }));
    if (y + height > bottom) overflow.push(Object.freeze({ id, page }));
    y += height + (emphasis ? lineHeight * 0.35 : lineHeight * 0.2);
  };
  add('identity', 'identity', resume.name, true);
  if (resume.contact.length) add('contact', 'contact', resume.contact.join(' · '));
  for (const section of resume.sections) {
    add(`${section.id}:title`, 'section', section.title, true);
    for (let index = 0; index < section.entries.length; index += 1) {
      const entry = section.entries[index]!;
      add(
        `${section.id}:entry:${index}`,
        'entry',
        [entry.heading, entry.subheading, entry.date].filter(Boolean).join(' — '),
      );
      for (let detail = 0; detail < (entry.details?.length ?? 0); detail += 1)
        add(
          `${section.id}:entry:${index}:detail:${detail}`,
          'detail',
          `• ${entry.details![detail]}`,
        );
    }
  }
  return Object.freeze({
    pageWidth,
    pageHeight,
    pages: blocks.length ? page : 0,
    blocks: Object.freeze(blocks),
    overflow: Object.freeze(overflow),
  });
}

/** Returns a JSON-safe deep copy suitable for storage or transport. */
export function exportResumeJson(input: ResumeDocument): string {
  return JSON.stringify(validateDocument(input, {}), null, 2);
}
