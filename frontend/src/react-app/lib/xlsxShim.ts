/**
 * xlsxShim.ts
 * Re-exports xlsx modules to resolve build-time path issues.
 */
import * as xlsx from 'xlsx';
export default xlsx;
export const { utils, writeFile, read } = xlsx;
