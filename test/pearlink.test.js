const test = require('brittle')

const { makeParser, pearLinkDisplay } = require('./helpers')

test('setPearLink creates pear-link display entry', (t) => {
  const p = makeParser()
  const pearlink = 'pear://example'
  p.appendText(pearlink)
  const success = p.setPearLink(pearlink)
  t.pass(success)
  t.alike(p.display, [pearLinkDisplay(0, pearlink)])
})
