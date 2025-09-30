const test = require('brittle')

const Parser = require('..')
const { DISPLAY_TYPES } = require('@holepunchto/keet-core-api')

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

  p.setLink(link, link)
  t.alike(p.display, [
    {
      type: DISPLAY_TYPES.HTTP_LINK,
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
      type: DISPLAY_TYPES.PEAR_LINK,
      start: 0,
      end: 15,
      content: link,
      length: link.length
    }
  ])
})

test('resync when select a range input and paste', function (t) {
  const p = new Parser()

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

test('resync when select a range input and paste a link', function (t) {
  let params = null
  const p = new Parser({
    onlink(link) {
      params = link
    }
  })

  p.appendText('12 1234567 1234')

  // select the range 3-11 and paste link
  p.selectRange(3, 11)
  const link = 'http://example.com'
  p.resync(`12 ${link} 1234`)
  t.is(p.position, 21)
  t.is(p.text, `12 ${link} 1234`)
  t.is(params, link)
  p.setLink(link, link)

  t.alike(p.display, [
    {
      type: DISPLAY_TYPES.HTTP_LINK,
      start: 3,
      end: 21,
      content: link,
      length: link.length
    }
  ])
})

test('resync when select a range input and paste a link should keep old display', function (t) {
  const p = new Parser()

  const link = 'http://example.com'
  p.appendText(link)
  t.is(p.text, link)
  p.setLink(link, link)
  p.appendText(' 123 ')
  p.appendText(link)
  t.is(p.text, `${link} 123 ${link}`)
  p.setLink(link, link)

  t.alike(p.display, [
    {
      type: DISPLAY_TYPES.HTTP_LINK,
      start: 0,
      end: 18,
      content: link,
      length: link.length
    },
    {
      type: DISPLAY_TYPES.HTTP_LINK,
      start: 23,
      end: 41,
      content: link,
      length: link.length
    }
  ])

  // select the range 19-23 and paste 'xxxxxxxx'
  p.selectRange(19, 23)
  p.resync(`${link} xxxxxxxx ${link}`)

  t.is(p.position, 27)
  t.alike(p.display, [
    {
      type: DISPLAY_TYPES.HTTP_LINK,
      start: 0,
      end: 18,
      content: link,
      length: link.length
    },
    {
      type: DISPLAY_TYPES.HTTP_LINK,
      start: 28,
      end: 46,
      content: link,
      length: link.length
    }
  ])

  // select the range 19-28 and paste 'a'
  p.selectRange(19, 23)
  p.resync(`${link} a ${link}`)

  t.is(p.position, 20)
  t.alike(p.display, [
    {
      type: DISPLAY_TYPES.HTTP_LINK,
      start: 0,
      end: 18,
      content: link,
      length: link.length
    },
    {
      type: DISPLAY_TYPES.HTTP_LINK,
      start: 21,
      end: 39,
      content: link,
      length: link.length
    }
  ])
})

test('resync for append case', function (t) {
  const display = [
    {
      type: 1,
      start: 0,
      end: 19,
      length: 19,
      memberId: '001'
    },
    {
      type: 1,
      start: 24,
      end: 40,
      length: 16,
      memberId: '002'
    }
  ]
  const p = new Parser({
    display,
    text: '@Silly Water Dragon 123 @Handsome Dragon'
  })

  p.resync('@Silly Water Dragon 123 @Handsome Dragon ')
  t.is(p.position, 41)
  t.alike(p.display, display)
})

test('resync for remove all text case', function (t) {
  const p = new Parser({
    display: [],
    text: '1'
  })

  p.resync('')
  t.is(p.position, 0)
})
