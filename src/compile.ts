import type { CanvasData } from './core/types';
import { importDataToCanvas } from './core/importer';

export type { CanvasData, CanvasNode, CanvasEdge, CompileSettings } from './core/types';
export { compileCanvasAll } from './core/compiler';
export { stripCanvasMetadata } from './core/exporter';
export { importJsonToCanvas, importJsonlToCanvas, importDataToCanvas, importPureCanvasData } from './core/importer';

export async function importFileToCanvas(filePath: string): Promise<CanvasData> {
  try {
    const fs = await import('fs');
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    return importDataToCanvas(filePath, fileContent);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Cannot resolve module')) {
      throw new Error('File system access not available in this environment. Use importDataToCanvas with file content instead.');
    }
    throw error;
  }
}
