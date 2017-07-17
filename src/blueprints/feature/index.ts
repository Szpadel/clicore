import * as fs from 'fs-extra';
import * as path from 'path';
import {Blueprint, BlueprintParameter} from '../../blueprint';
import {FileGenerator} from '../../file-generator';
import {addUnconditionalFeature} from '../../lib/ast-tools/ast-tools';
import {Change, InsertChange} from '../../lib/ast-tools/change';
import camelcase = require('camelcase');
import uppercamelcase = require('uppercamelcase');
import decamelize = require('decamelize');
import {ValidationError} from "../../errors";

interface TemplateParams {
  [k: string]: string;
  __feature_class_name__: string; // UpperCamelCase
  __feature_dir__: string; // dash-case
  __feature_name__: string; // camelCase
}

const rootPath = path.join('src', 'logic');
const filesMap = [
  ['actions.ts.txt', 'actions.ts'],
  ['commands.ts.txt', 'commands.ts'],
  ['effects.spec.ts.txt', 'effects.spec.ts'],
  ['effects.ts.txt', 'effects.ts'],
  ['feature.ts.txt', 'feature.ts'],
  ['reducer.ts.txt', 'reducer.ts']
];

export default //noinspection JSUnusedGlobalSymbols
class FeatureBlueprint extends Blueprint {
  name = 'feature';
  description = 'Generate new feature';
  options: BlueprintParameter[] = [
    {name: 'name', type: 'string', description: 'Name of created feature', require: true, ask: true}
  ];

  featureName: string;

  private templateParams: TemplateParams;

  prepare(options: { [p: string]: string | boolean }): void {
    if (typeof options.name !== 'string' || !options.name) {
      throw new ValidationError('--name must be specified');
    }
    this.featureName = camelcase(options.name as string);

    this.templateParams = {
      __feature_class_name__: uppercamelcase(this.featureName),
      __feature_name__: this.featureName,
      __feature_dir__: decamelize(this.featureName, '-')
    };

    if (fs.existsSync(path.join(rootPath, this.templateParams.__feature_dir__))) {
      throw new ValidationError('This feature already exists');
    }
  }

  generateChanges(): Change[] {
    const changes = addUnconditionalFeature(
      path.join(rootPath, 'logic.module.ts'),
      `${this.templateParams.__feature_class_name__}Feature`,
      path.join('logic', this.templateParams.__feature_dir__, 'feature'));

    return [...this.generateFilesFromTemplates(), ...changes];
  }

  private generateFilesFromTemplates(): Change[] {
    const featureDir = path.join(rootPath, this.templateParams.__feature_dir__);
    return filesMap.map((pair) => {
      const file = new FileGenerator(path.join(__dirname, 'templates', pair[0]));
      return new InsertChange(path.join(featureDir, pair[1]), 0, file.render(this.templateParams));
    });
  }
}
