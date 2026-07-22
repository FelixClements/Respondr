const path = require('path');
const ejs = require('ejs');

async function render(template, data = {}, layout = 'layout') {
  const body = await ejs.renderFile(path.join(__dirname, '..', '..', 'views', `${template}.ejs`), data);

  if (!layout) return body;

  return ejs.renderFile(path.join(__dirname, '..', '..', 'views', `${layout}.ejs`), { ...data, body });
}

module.exports = { render };
