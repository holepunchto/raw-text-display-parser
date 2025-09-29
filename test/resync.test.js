const test = require('brittle')

const Parser = require('..')

test('resync when paste to empty input', function (t) {
  let params = null
  const p = new Parser({
    onlink(link) {
      params = link
    }
  })

  const link = 'http://example.com'
  p.resync(link)
  t.is(params, link)
  t.is(p.text, link)

  p.setLink(link)
  t.alike(p.display, [
    {
      type: Parser.LINK_ID,
      start: 0,
      end: 18,
      content: link,
      length: link.length
    }
  ])
})

test('resync when select the whole input and paste', function (t) {
  let params = null
  const p = new Parser({
    onpearlink(link) {
      params = link
    }
  })

  p.appendText('123')
  p.selectRange(0, 3)

  const link = 'pear://keet/abc'
  p.resync(link)
  t.is(params, link)
  t.is(p.text, link)

  p.setPearLink(link)
  t.alike(p.display, [
    {
      type: Parser.PEAR_LINK_ID,
      start: 0,
      end: 15,
      content: link,
      length: link.length
    }
  ])
})
