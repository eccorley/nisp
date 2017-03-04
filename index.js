const repl = require('repl');

const tokenize = (chars) => chars.replace(/\(/g, ' ( ').replace(/\)/g, ' ) ').split(' ').filter(x => !!x);

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

const List = [];
const Env = (params = [], args = [], outer = null) => {
  let obj = {
    outer: outer,
    ...params.reduce((acc, p, i) => ({ ...acc, [p]: args[i] }), {}),
  };
  obj.find = (v) => {
    if (obj[v]) {
      return obj; 
    } else {
      return outer && outer.find(v);
    }
  };
  return obj;
};

const Procedure = (params, body, env) => (...args) => evalz(body, Env(params, args, env))

const standardEnv = () => ({
  ...Env(),
  ...{
    '+': (...args) => args.reduce((acc, b) => acc + b, 0),
    '-': (...args) => args.reduce((acc, b) => acc - b, 0),
    '*': (...args) => args.reduce((a, b) => a * b),
    '/': (...args) => args.reduce((a, b) => a / b),
    '>': (x, y) => x > y,
    '<': (x, y) => x < y,
    '>=': (x, y) => x >= y,
    '<=': (x, y) => x <= y,
    '=': (x, y) => x === y,
    'append': (...args) => args.reduce((acc, b) => acc.concat(b), []),
    'apply': Function.apply,
    'begin': (...args) => args[-1],
    'car': (...args) => args[0],
    'cdr': (...args) => args.slice(1),
    'cons': (x, y) => [x].concat(y),
    'eq?': Object.is,
    'equal?': (x, y) => x === y,
    'length': (x) => x.length,
    'list': (...args) => args,
    'list?': (x) => Array.isArray(x),
    'map': Array.map,
    'not': (x) => x && null || true,
    'null?': (x) => x === [],
    'number?': (x) => typeof x === 'number',
    'pi': Math.PI,
    'procedure?': (x) => typeof x === 'function',
    'round': Math.round,
    'symbol?': (x) => typeof x === 'string',
  }
});

console.log({ ...Env(), ...{ '*': 'COOL' }});

console.log(standardEnv().find('*'));


const globalEnv = standardEnv();
console.log(Object.keys(globalEnv));

const evalz = (x, env = globalEnv) => {
  if (typeof x === 'string') {
    console.log(Object.keys(env));
    return env.find(x)[x]
  } else if (!Array.isArray(x)) {
    return x;
  } else if (x[0] === 'quote') {
    let [_, exp] = x;
    return exp;
  } else if (x[0] === 'if') {
    let [_, test, conseq, alt] = x;
    let exp = evalz(test, env) ? conseq : alt;
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
    console.log('Evaling other: ', x);
    let proc = evalz(x[0], env);
    console.log(x[0], 'Evaled to: ', proc);
    let args = x.splice(1).map(arg => evalz(arg, env));
    console.log('Calling proc: ', proc, 'with args: ', args)
    return proc(...args);
  }
}

repl.start({
  prompt: 'nelly> ',
  eval: (cmd, context, filename, callback) => {
    let val = evalz(parse(cmd));
    if (val) console.log(nelStr(val));
    callback(null);
  }
});

const nelStr = (exp) => {
  if (Array.isArray(exp)) {
    return (`( ${exp.map(e => nelStr(e)).join(' ')})`);
  } else {
    return String(exp);
  }
};
