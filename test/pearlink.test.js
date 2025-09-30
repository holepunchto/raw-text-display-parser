const test = require('brittle')
const Parser = require('..')

test('setPearLink creates pear-link display entry', (t) => {
  const parser = new Parser()
  parser.appendText('pear://example')
  const success = parser.setPearLink('pear://example')
  t.pass(success)
  t.is(parser.display, {
    type: 'pear-link',
    start: 0,
    end: 14,
    content: 'pear://example',
    link: 'pear://example'
  })
})
