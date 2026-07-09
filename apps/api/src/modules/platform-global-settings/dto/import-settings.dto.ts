import { IsObject } from 'class-validator';

// Shape mirrors exportAll()'s output: { [category]: { [key]: value } }.
export class ImportSettingsDto {
  @IsObject()
  settings: Record<string, Record<string, any>>;
}
