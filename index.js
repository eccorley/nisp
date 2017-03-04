const repl = require('repl');

const tokenize = (chars) => chars
  .replace(/\(/g, ' ( ')
  .replace(/\)/g, ' ) ')
  .split(' ')
  .filter(x => !!x);

const parse = (program) => readFromTokens(tokenize(program));

const readFromTokens = (tokens) => {
  if (tokens.length === 0) {
    return Error('Unexpected EOF while reading');
  }
  let token = tokens.shift();
  if (token === '(') {
    let list = [];
    while (tokens[0] !== ')') {
      list.push(readFromTokens(tokens));
    }
    tokens.shift();
    return list;
  }
  else if (token === ')') {
    return Error('Unexpected )');
  } else {
    return atom(token);
  }
};

const atom = (token) => {
  let atom;
  if (Number(token)) {
    return Number(token);
  } else {
    return String(token);
  }
};

const ops = {
  ['+']: (...args) => args.reduce((a, b) => a + b),
  ['-']: (...args) => args.reduce((a, b) => a - b),
  ['*']: (...args) => args.reduce((a, b) => a * b),
  ['/']: (...args) => args.reduce((a, b) => a / b),
  ['>']: (x, y) => x > y ,
  ['<']: (x, y) => x < y,
  ['>=']: (x, y) => x >= y,
  ['<=']: (x, y) => x <= y,
  ['=']: (x, y) => x === y,
  ['append']: (...args) => args.reduce((acc, b) => acc.concat(b), []),
  ['apply']: Function.apply,
  ['begin']: (...args) => args[-1],
  ['car']: (list) => list[0] || null,
  ['cdr']: (list) => list.slice(1).length && list.slice(1) || null,
  ['cons']: (x, y) => [x].concat(y),
  ['eq?']: Object.is,
  ['equal?']: (x, y) => x === y,
  ['length']: (x) => x.length,
  ['list']: (...args) => args,
  ['list?']: (x) => Array.isArray(x),
  ['map']: (fn, items) => items.map(fn),
  ['not']: (x) => x && null || true,
  ['null?']: (x) => x === [],
  ['number?']: (x) => typeof x === 'number',
  ['pi']: Math.PI,
  ['procedure?']: (x) => typeof x === 'function',
  ['round']: Math.round,
  ['symbol?']: (x) => typeof x === 'string',
};

const List = [];

const Env = (params = [], args = [], outer = null) => {
  let obj = {
    ...ops,
    ...params.reduce((acc, p, i) => ({ ...acc, [p]: args[i] }), {}),
    outer,
  };
  obj.find = (v) => {
    if (obj[v] || obj[v] == 0) {
      return obj; 
    } else {
      return outer && outer.find(v) || Error('Oops');
    }
  };
  return obj;
};

const Procedure = (params, body, env) => (...args) => {
  return evalz(body, Env(params, args, env))
};

let globalEnv = Env();

const testIf = (exp, conseq, alt) => {
  if (!exp) {
    return alt;
  } else if (Array.isArray(exp)) {
    if (exp.length > 0) {
      return conseq;
    } else {
      return alt;
    }
  } else {
    return conseq;
  }
}

const evalz = (x, env = globalEnv) => {
  if (typeof x === 'string') {
    return env.find(x)[x]
  } else if (!Array.isArray(x)) {
    return x;
  } else if (x[0] === 'quote') {
    let [_, exp] = x;
    return exp;
  } else if (x[0] === 'if') {
    let [_, test, conseq, alt] = x;
    let exp = testIf(evalz(test, env));
    return evalz(exp, env);
  } else if (x[0] === 'define') {
    let [_, key, exp] = x;
    env[key] = evalz(exp, env);
  } else if (x[0] === 'set!') {
    let [_, v, exp] = x;
    env.find(v)[v] = eval(exp, env);
  } else if (x[0] === 'lambda') {
    let [_, params, body] = x;
    return Procedure(params, body, env);
  } else {
    if (x == 0) {
      return Number(0);
    }
    let proc = evalz(x[0], env);
    let args = x.slice(1);
    args = args.map(a => {
      return evalz(a, env)
    });
    return proc(...args);
  }
}

repl.start({
  prompt: 'nisp > ',
  eval: (cmd, context, filename, callback) => {
    let val = evalz(parse(cmd));
    if (val || val == 0) console.log(nelStr(val));
    callback(null);
  }
});

const nispStr = (exp) => {
  if (Array.isArray(exp)) {
    return (`( ${exp.map(e => nelStr(e)).join(' ')} )`);
  } else {
    return String(exp);
  }
};
