import * as fs from 'fs';

/**
 * Generate file content with replaced placeholders
 */
export class FileGenerator {
  private content: string;

  constructor(templateFile: string) {
    this.content = fs.readFileSync(templateFile).toString('utf8');
  }

  render(replacements: { [k: string]: string }): string {
    let content = this.content;
    Object.entries(replacements)
      .forEach((pair) => {
        content = content.replace(new RegExp(pair[0], 'g'), pair[1]);
      });
    return content;
  }
}
