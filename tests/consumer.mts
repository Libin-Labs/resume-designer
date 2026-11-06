import {
  createResume,
  exportResumeJson,
  layoutResume,
  type ResumeDocument,
  type ResumeEntry,
  type ResumeSection,
  type ResumeSectionKind,
  type ResumeLayoutOptions,
  type ResumeBlock,
  type ResumeLayout,
} from '@lp-labs/resume-designer';
const kind: ResumeSectionKind = 'experience';
const entry: ResumeEntry = { heading: 'Developer' };
const section: ResumeSection = { id: 'work', kind, title: 'Work', entries: [entry] };
const resume: ResumeDocument = { name: 'Example', contact: [], sections: [section] };
const options: ResumeLayoutOptions = { pageHeight: 792 };
const layout: ResumeLayout = layoutResume(createResume(resume), options);
const block: ResumeBlock | undefined = layout.blocks[0];
const json: string = exportResumeJson(resume);
void block;
void json;
// @ts-expect-error a section kind must be supported
const invalidKind: ResumeSectionKind = 'unknown';
void invalidKind;
