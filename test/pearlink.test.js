const test = require('brittle')
const Parser = require('..')

test('setPearLink creates pear-link display entry', (t) => {
  const p = new Parser()
  p.appendText('pear://example')
  const success = p.setPearLink('pear://example')
  t.pass(success)
  t.is(p.display, {
    type: 'pear-link',
    start: 0,
    end: 14,
    content: 'pear://example',
    link: 'pear://example'
  })
})
