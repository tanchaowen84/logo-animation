import fs from 'fs/promises';
import path from 'path';

const GENERATED_DIR = path.join(process.cwd(), 'remotion', 'generated');
const MANIFEST_JSON_PATH = path.join(GENERATED_DIR, 'manifest.json');
const MANIFEST_TS_PATH = path.join(GENERATED_DIR, '_manifest.ts');

export interface GeneratedManifestEntry {
  taskId: string;
  compositionId: string;
  modulePath: string;
  durationInFrames: number;
  fps: number;
  width: number;
  height: number;
  defaultProps: Record<string, unknown>;
}

async function ensureGeneratedDir() {
  await fs.mkdir(GENERATED_DIR, { recursive: true });
}

async function readManifest(): Promise<GeneratedManifestEntry[]> {
  try {
    const content = await fs.readFile(MANIFEST_JSON_PATH, 'utf-8');
    const parsed = JSON.parse(content) as GeneratedManifestEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function createTsContent(entries: GeneratedManifestEntry[]): string {
  const imports: string[] = ["import type { ComponentType } from 'react';"];
  const definitions: string[] = [];

  entries.forEach((entry, index) => {
    const importVar = `GeneratedComp_${index}`;
    const moduleImportPath = entry.modulePath.replace(/\\/g, '/').replace(/\.tsx?$/, '');
    imports.push(`import ${importVar} from './${moduleImportPath}';`);
    const defaultProps = JSON.stringify(entry.defaultProps ?? {}, null, 2);
    definitions.push(
      `  {
    id: ${JSON.stringify(entry.compositionId)},
    component: ${importVar} as ComponentType<Record<string, unknown>>,
    durationInFrames: ${entry.durationInFrames},
    fps: ${entry.fps},
    width: ${entry.width},
    height: ${entry.height},
    defaultProps: ${defaultProps},
  }`
    );
  });

  const header = `export interface GeneratedCompositionDefinition {
  id: string;
  component: ComponentType<Record<string, unknown>>;
  durationInFrames: number;
  fps: number;
  width: number;
  height: number;
  defaultProps: Record<string, unknown>;
}
`;

  const body = `export const generatedCompositions: GeneratedCompositionDefinition[] = [
${definitions.join(',\n')}
];
`;

  return [imports.join('\n'), '', header, body].join('\n');
}

async function writeManifest(entries: GeneratedManifestEntry[]) {
  await ensureGeneratedDir();
  const sorted = [...entries].sort((a, b) => a.compositionId.localeCompare(b.compositionId));
  await fs.writeFile(MANIFEST_JSON_PATH, JSON.stringify(sorted, null, 2));

  const tsContent = createTsContent(sorted);
  await fs.writeFile(MANIFEST_TS_PATH, tsContent, 'utf-8');
}

export async function upsertManifestEntry(entry: GeneratedManifestEntry) {
  await ensureGeneratedDir();
  const entries = await readManifest();
  const existingIndex = entries.findIndex((item) => item.taskId === entry.taskId);
  if (existingIndex >= 0) {
    entries[existingIndex] = entry;
  } else {
    entries.push(entry);
  }
  await writeManifest(entries);
}

export async function removeManifestEntry(taskId: string) {
  await ensureGeneratedDir();
  const entries = await readManifest();
  const filtered = entries.filter((item) => item.taskId !== taskId);
  await writeManifest(filtered);
}

export async function ensureManifestFiles() {
  await ensureGeneratedDir();
  try {
    await fs.access(MANIFEST_TS_PATH);
  } catch (error) {
    await writeManifest([]);
  }
}
