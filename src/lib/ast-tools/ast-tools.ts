import * as astTools from '@angular/cli/lib/ast-tools';
import * as ts from 'typescript';
import {ValidationError} from '../../errors';
import {Change, InsertChange} from './change';

const featureFunctionName = 'includeFeatures';

export function addUnconditionalFeature(logicModulePath: string, featureModuleName: string, importPath: string): Change[] {
  const source: ts.SourceFile = astTools.getSource(logicModulePath);
  // find all function declaration
  const candidates = astTools.findNodes(source, ts.SyntaxKind.FunctionDeclaration)
  // ... with is named as ...
    .filter((node: ts.FunctionDeclaration) => node.name && node.name.text === featureFunctionName)
    // ... get it's content ...
    .map((node: ts.FunctionDeclaration) => node.body ? node.body.statements : [])
    .reduce((r, a) => r.concat(a), [] as ts.Node[]) // flatMap
    // ... get it's return statement ...
    .filter(node => node && node.kind === ts.SyntaxKind.ReturnStatement)
    .map((node: ts.ReturnStatement) => node.expression)
    // ... get it's array ...
    .filter(node => node && node.kind === ts.SyntaxKind.ArrayLiteralExpression);

  if (candidates.length !== 1) {
    throw new ValidationError(`Couldn't append feature to module declaration`);
  }

  const featuresArray = candidates[0] as ts.ArrayLiteralExpression;
  const trailingComma = featuresArray.elements.hasTrailingComma;
  const lastStatement = featuresArray.elements[featuresArray.elements.length - 1];
  const indent = getNodeIndentation(source, lastStatement);

  return [
    astTools.insertImport(logicModulePath, featureModuleName, importPath),
    new InsertChange(logicModulePath, lastStatement.end,
      (trailingComma ? '' : ',') +
      `${indent}${featureModuleName}` +
      (trailingComma ? ',' : '')
    )
  ];
}

function getNodeIndentation(source: ts.SourceFile, node: ts.Node): string {
  const text = node.getFullText(source);
  return text.match(/^\r?\n/) ? (text.match(/^\r?\n(\r?)\s+/) as string[])[0] : ' ';
}
