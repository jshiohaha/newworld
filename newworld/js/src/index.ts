export const sum = (a: number, b: number) => {
  if ('development' === process.env.NODE_ENV) {
    console.log('boop bop mcbooper boopity boop');
  }
  return a + b;
};
