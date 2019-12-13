import babelTraverse from '@babel/traverse';

/**
 * 用于去除ts类型检测
 * @export
 * @param {*} ast
 * @returns
 */
export default function(ast) {
  babelTraverse(ast, {
    ExportNamedDeclaration(exportPath) {
      let declaration = exportPath.get('declaration');
      if (
        declaration &&
        (declaration.isTSInterfaceDeclaration() ||
          declaration.isTSTypeAliasDeclaration())
      ) {
        exportPath.remove();
      }
    },
    TSTypeParameterInstantiation(path) {
      path.remove();
    },
    TSTypeAnnotation(path) {
      path.remove();
    },
    TSAsExpression(path) {
      path.replaceWith(path.get('expression'));
    }
  });
  return ast;
}
