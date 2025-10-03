const test = require('brittle')

const Parser = require('..')
const { DISPLAY_TYPES } = require('@holepunchto/keet-core-api')

test('setLink creates http-link display entry', (t) => {
  const p = new Parser()
  const link = 'http://example.com'
  p.appendText(link)
  p.setLink(link, link)
  t.alike(p.display, [
    {
      type: DISPLAY_TYPES.HTTP_LINK,
      start: 0,
      end: 18,
      content: link,
      length: 18
    }
  ])
})
