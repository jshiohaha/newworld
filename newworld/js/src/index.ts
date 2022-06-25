export const sum = (a: number, b: number) => {
  console.log('hello world');
  if ('development' === process.env.NODE_ENV) {
    console.log('boop bop mcbooper boopity');
  }
  return a + b;
};
