const test = require('brittle')

const Parser = require('..')
const { DISPLAY_TYPES } = require('../utils')
const { HTTP_LINK, MENTION, EMOJI, ORDERED_LIST_ITEM } = DISPLAY_TYPES

const orderedListDisplay = (start, index) => {
  const content = `${index}. `
  const length = content.length
  return {
    start,
    end: start + length,
    content,
    length,
    type: ORDERED_LIST_ITEM,
    index
  }
}

const linkDisplay = (start, content) => ({
  start,
  end: start + content.length,
  content,
  length: content.length,
  type: HTTP_LINK
})

const makeParser = ({ text = '', display = [] }) => {
  const p = new Parser({
    text,
    display: display.map(orderedListDisplay),
    onlist: (start, end, type, index) => p.setList(start, end, type, index),
    onlink: (link) => p.setLink(link, link),
    onmention: (mention) => p.setMention(mention, '@bob', 'member-id'),
    onemoji: (emoji) => p.setEmoji(emoji, ':smile:', '😄')
  })
  return p
}

test('list general case', (t) => {
  const p = makeParser({})

  p.resync('1. ')
  t.is(p.text, '1. ')
  t.is(p.position, 3)
  t.alike(p.display, [orderedListDisplay(0, 1)])

  p.resync('1. http://a.io')
  t.is(p.text, '1. http://a.io')
  t.is(p.position, 14)
  t.alike(p.display, [orderedListDisplay(0, 1), linkDisplay(3, 'http://a.io')])

  p.resync('1. http://a.io\n')
  t.is(p.text, '1. http://a.io\n2. ')
  t.is(p.position, 18)
  t.alike(p.display, [
    orderedListDisplay(0, 1),
    linkDisplay(3, 'http://a.io'),
    orderedListDisplay(15, 2)
  ])

  p.resync('1. http://a.io\n2. a')
  p.resync('1. http://a.io\n2. a\n')
  t.is(p.text, '1. http://a.io\n2. a\n3. ')
  t.is(p.position, 23)
  t.alike(p.display, [
    orderedListDisplay(0, 1),
    linkDisplay(3, 'http://a.io'),
    orderedListDisplay(15, 2),
    orderedListDisplay(20, 3)
  ])
})
