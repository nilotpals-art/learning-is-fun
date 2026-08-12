export const DEFAULT_PRINT_WATERMARK="Learning Is Fun";
export function printWatermarkText(instituteName:string|null|undefined){return instituteName?.trim()||DEFAULT_PRINT_WATERMARK}
