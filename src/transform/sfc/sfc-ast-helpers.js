import * as t from '@babel/types';

export function genSFCRenderMethod(path, state, argument) {
  // computed props
  const computedProps = Object.keys(state.computeds);
  let blocks = [];

  if (computedProps.length) {
    computedProps.forEach(prop => {
      const v = state.computeds[prop];
      blocks = blocks.concat(v['_statements']);
    });
  }
  if (argument) blocks = blocks.concat(argument);

  const render = t.classMethod(
    'method',
    t.identifier('render'),
    [],
    t.blockStatement(blocks)
  );

  path.node.body.push(render);
}
