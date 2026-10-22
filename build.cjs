const fs = require('node:fs');
const html = fs.readFileSync('index.html', 'utf8')
  .replace('<script src="operands.js"></script>', () => `<script>\n${fs.readFileSync('operands.js', 'utf8')}\n</script>`)
  .replace('<script src="multiply.js"></script>', () => `<script>\n${fs.readFileSync('multiply.js', 'utf8')}\n</script>`)
  .replace('<script src="app.js"></script>', () => `<script>\n${fs.readFileSync('app.js', 'utf8')}\n</script>`);
fs.writeFileSync('multiply-practice.html', html);
console.log('Built multiply-practice.html — standalone, works offline.');
const divisionHtml = fs.readFileSync('division.html', 'utf8')
  .replace('<script src="operands.js"></script>', () => `<script>\n${fs.readFileSync('operands.js', 'utf8')}\n</script>`)
  .replace('<script src="division.js"></script>', () => `<script>\n${fs.readFileSync('division.js', 'utf8')}\n</script>`)
  .replace('<script src="division-app.js"></script>', () => `<script>\n${fs.readFileSync('division-app.js', 'utf8')}\n</script>`);
fs.writeFileSync('division-practice.html', divisionHtml);
console.log('Built division-practice.html — standalone, works offline.');
const floatingHtml = fs.readFileSync('floating.html', 'utf8')
  .replace('<script src="floating.js"></script>', () => `<script>\n${fs.readFileSync('floating.js', 'utf8')}\n</script>`)
  .replace('<script src="floating-app.js"></script>', () => `<script>\n${fs.readFileSync('floating-app.js', 'utf8')}\n</script>`);
fs.writeFileSync('floating-practice.html', floatingHtml);
console.log('Built floating-practice.html — standalone, works offline.');
const halfAdditionHtml = fs.readFileSync('half-addition.html', 'utf8')
  .replace('<script src="floating.js"></script>', () => `<script>\n${fs.readFileSync('floating.js', 'utf8')}\n</script>`)
  .replace('<script src="half-addition.js"></script>', () => `<script>\n${fs.readFileSync('half-addition.js', 'utf8')}\n</script>`)
  .replace('<script src="half-addition-app.js"></script>', () => `<script>\n${fs.readFileSync('half-addition-app.js', 'utf8')}\n</script>`);
fs.writeFileSync('half-addition-practice.html', halfAdditionHtml);
console.log('Built half-addition-practice.html — standalone, works offline.');
const halfMultiplicationHtml = fs.readFileSync('half-multiplication.html', 'utf8')
  .replace('<script src="floating.js"></script>', () => `<script>\n${fs.readFileSync('floating.js', 'utf8')}\n</script>`)
  .replace('<script src="half-addition.js"></script>', () => `<script>\n${fs.readFileSync('half-addition.js', 'utf8')}\n</script>`)
  .replace('<script src="half-multiplication.js"></script>', () => `<script>\n${fs.readFileSync('half-multiplication.js', 'utf8')}\n</script>`)
  .replace('<script src="half-multiplication-app.js"></script>', () => `<script>\n${fs.readFileSync('half-multiplication-app.js', 'utf8')}\n</script>`);
fs.writeFileSync('half-multiplication-practice.html', halfMultiplicationHtml);
console.log('Built half-multiplication-practice.html — standalone, works offline.');

let mockTestHtml = fs.readFileSync('mock-test.html', 'utf8');
for (const name of ['multiply','division','floating','half-addition','half-multiplication','mock-test','mock-test-app']) {
  mockTestHtml = mockTestHtml.replace(`<script src="${name}.js"></script>`, () => `<script>\n${fs.readFileSync(name + '.js', 'utf8')}\n</script>`);
}
fs.writeFileSync('mock-test-practice.html', mockTestHtml);
console.log('Built mock-test-practice.html — standalone, works offline.');
