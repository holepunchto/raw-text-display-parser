const test = require('brittle')

const Parser = require('..')
const { DISPLAY_TYPES } = require('@holepunchto/keet-core-api')

test('setPearLink creates pear-link display entry', (t) => {
  const p = new Parser()
  const pearlink = 'pear://example'
  p.appendText(pearlink)
  const success = p.setPearLink(pearlink)
  t.pass(success)
  t.alike(p.display, [
    {
      type: DISPLAY_TYPES.PEAR_LINK,
      start: 0,
      end: 14,
      content: pearlink,
      length: 14
    }
  ])
})
