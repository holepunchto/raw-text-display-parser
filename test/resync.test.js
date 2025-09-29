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
  t.is(p.position, 18)

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
  t.is(p.position, 15)

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

test('resync when select a range input and paste', function (t) {
  let params = null
  const p = new Parser({
    onlink(link) {
      params = link
    }
  })

  const link = 'http://example.com'

  // typing '12 1234 123.4567 1234'
  p.appendText('12 1234 123.4567 1234')
  // move to position 12 and backspace
  p.setPosition(12)
  p.backspace()
  t.is(p.text, '12 1234 1234567 1234')

  // select the range 3-8 and backspace
  p.selectRange(3, 8)
  p.backspace()
  t.is(p.position, 3)
  t.is(p.text, '12 1234567 1234')

  // select the range 3-11 and paste 'xxx'
  p.selectRange(3, 11)
  p.resync('12 xxx 1234')
  t.is(p.position, 6)
  t.is(p.text, '12 xxx 1234')

  console.log(p)
})
