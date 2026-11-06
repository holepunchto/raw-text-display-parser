const test = require('brittle')

const { makeParser, linkDisplay } = require('./helpers')

test('setLink creates http-link display entry', (t) => {
  const p = makeParser()
  const link = 'http://example.com'
  p.appendText(link)
  t.alike(p.display, [linkDisplay(0, link)])
})

test('setLink with text before link', (t) => {
  const p = makeParser()
  const text = 'Hello http://example.com'
  const link = 'http://example.com'
  p.resync(text)
  t.alike(p.display, [linkDisplay(6, link)])
})

test('setLink with text after link', (t) => {
  const p = makeParser()
  const text = 'http://example.com world'
  const link = 'http://example.com'
  p.resync(text)
  t.alike(p.display, [linkDisplay(0, link)])
})

test('setLink with text before and after link', (t) => {
  const p = makeParser()
  const text = 'Hello http://example.com world'
  const link = 'http://example.com'
  p.resync(text)
  t.alike(p.display, [linkDisplay(6, link)])
})

test('setLink with text line before link', (t) => {
  const p = makeParser()
  const text = 'Hello\nhttp://example.com'
  const link = 'http://example.com'
  p.resync(text)
  t.alike(p.display, [linkDisplay(6, link)])
})

test('setLink with text line after link', (t) => {
  const p = makeParser()
  const text = 'http://example.com\nworld'
  const link = 'http://example.com'
  p.resync(text)
  t.alike(p.display, [linkDisplay(0, link)])
})

test('setLink with text lines before and after link', (t) => {
  const p = makeParser()
  const text = 'Hello\nhttp://example.com\nworld'
  p.resync(text)
  t.alike(p.display, [linkDisplay(6, 'http://example.com')])
})

test('move the caret and setLink with text lines before and after link', (t) => {
  const p = makeParser()
  p.resync('Hello\n\nworld')
  p.setPosition(6)
  p.resync('Hello\nhttp://example.com\nworld')
  t.alike(p.display, [linkDisplay(6, 'http://example.com')])
})

test('resync fires onlink for every link in a multi-link paste', (t) => {
  const links = []
  const p = makeParser({
    onlink(link) {
      links.push(link)
    }
  })

  const link1 = 'http://example.com'
  const link2 = 'https://other.com'
  const link3 = 'www.third.com'
  p.resync(`${link1}\n${link2}\n${link3}`)

  t.is(links.length, 3)
  t.is(links[0], link1)
  t.is(links[1], link2)
  t.is(links[2], link3)
})

test('resync fires onlink for every link separated by spaces', (t) => {
  const links = []
  const p = makeParser({
    onlink(link) {
      links.push(link)
    }
  })

  const link1 = 'http://example.com'
  const link2 = 'https://other.com'
  p.resync(`${link1} ${link2}`)

  t.is(links.length, 2)
  t.is(links[0], link1)
  t.is(links[1], link2)
})

test('resync does not re-fire onlink for already preserved display entries', (t) => {
  const links = []
  const p = makeParser({
    onlink(link) {
      links.push(link)
    }
  })

  const link1 = 'http://example.com'
  const link2 = 'https://other.com'

  // establish link1 as already parsed in display
  p.text = link1 + ' some text'
  p.display = [linkDisplay(0, link1)]
  p.position = p.text.length

  links.length = 0 // reset after setup

  p.resync(link1 + ' some text ' + link2)

  t.is(links.length, 1)
  t.is(links[0], link2)
})

test('resync fires onlink for all links mixed with plain text', (t) => {
  const links = []
  const p = makeParser({
    onlink(link) {
      links.push(link)
    }
  })

  const link1 = 'http://example.com'
  const link2 = 'https://other.com'
  p.resync(`hello ${link1} world ${link2} bye`)

  t.is(links.length, 2)
  t.is(links[0], link1)
  t.is(links[1], link2)
})
