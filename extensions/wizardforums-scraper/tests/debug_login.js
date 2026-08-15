const { parseHTML } = require('linkedom');
const XF = require('../lib/xf-parse.js');
for (const html of ['<body>You must log in or register to view this page</body>', '<html><body>You must log in or register to view this page</body></html>']) {
  const d = parseHTML(html).document;
  console.log({html, documentHTML: d.toString(), bodyHTML: d.body && d.body.toString(), bodyText: d.body && d.body.textContent, wallDoc: XF.isLoginWall(d), wallBody: XF.isLoginWall(d.body)});
}
