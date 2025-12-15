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

test('setLink with text before link', (t) => {
  const p = new Parser()
  const text = 'Hello http://example.com'
  const link = 'http://example.com'
  p.appendText(text)
  p.setPosition(12) // position inside the link
  p.setLink(link, link)
  t.alike(p.display, [
    {
      type: DISPLAY_TYPES.HTTP_LINK,
      start: 6,
      end: 24,
      content: link,
      length: 18
    }
  ])
})

test('setLink with text after link', (t) => {
  const p = new Parser()
  const text = 'http://example.com world'
  const link = 'http://example.com'
  p.appendText(text)
  p.setPosition(5) // position inside the link
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

test('setLink with text before and after link', (t) => {
  const p = new Parser()
  const text = 'Hello http://example.com world'
  const link = 'http://example.com'
  p.appendText(text)
  p.setPosition(12) // position inside the link
  p.setLink(link, link)
  t.alike(p.display, [
    {
      type: DISPLAY_TYPES.HTTP_LINK,
      start: 6,
      end: 24,
      content: link,
      length: 18
    }
  ])
})

test('setLink with text line before link', (t) => {
  const p = new Parser()
  const text = 'Hello\nhttp://example.com'
  const link = 'http://example.com'
  p.appendText(text)
  p.setPosition(8) // position inside the link
  p.setLink(link, link)
  t.alike(p.display, [
    {
      type: DISPLAY_TYPES.HTTP_LINK,
      start: 6,
      end: 24,
      content: link,
      length: 18
    }
  ])
})

test('setLink with text line after link', (t) => {
  const p = new Parser()
  const text = 'http://example.com\nworld'
  const link = 'http://example.com'
  p.appendText(text)
  p.setPosition(5) // position inside the link
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

test('setLink with text lines before and after link', (t) => {
  const p = new Parser()
  const text = 'Hello\nhttp://example.com\nworld'
  const link = 'http://example.com'
  p.appendText(text)
  p.setPosition(8) // position inside the link
  p.setLink(link, link)
  t.alike(p.display, [
    {
      type: DISPLAY_TYPES.HTTP_LINK,
      start: 6,
      end: 24,
      content: link,
      length: 18
    }
  ])
})
