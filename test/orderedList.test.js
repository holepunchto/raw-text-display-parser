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

const mentionDisplay = (start) => ({
  start,
  end: start + 4,
  length: 4,
  type: MENTION,
  memberId: 'member-id'
})

const emojiDisplay = (start) => ({
  start,
  end: start + 2,
  content: 'smile',
  length: 2,
  type: EMOJI
})

const getList = (length) => {
  let _text = ''
  const _display = []
  for (let _index = 1; _index <= length; _index++) {
    _display.push(_text.length)
    _text += `${_index}. ${String.fromCharCode(96 + _index)}${_index < length ? '\n' : ''}`
  }

  return { text: _text, display: _display }
}

const makeParser = ({ text = '', display = [] }) => {
  const p = new Parser({
    text,
    display: display.map((start, index) =>
      orderedListDisplay(start, index + 1)
    ),
    onlist: (start, end, type, index) => p.setList(start, end, type, index),
    onlink: (link) => p.setLink(link, link),
    onmention: (mention) => p.setMention(mention, '@bob', 'member-id'),
    onemoji: (emoji) => p.setEmoji(emoji, ':smile:', '😄')
  })
  return p
}

test('ordered-list general case', (t) => {
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

test('remove space inside mark remove the display', (t) => {
  const p = makeParser({})

  p.resync('1. ')
  t.is(p.text, '1. ')
  t.is(p.position, 3)
  t.alike(p.display, [orderedListDisplay(0, 1)])

  p.resync('1.')
  t.is(p.text, '1.')
  t.is(p.position, 2)
  t.alike(p.display, [])

  p.resync('1. ')
  t.is(p.text, '1. ')
  t.is(p.position, 3)
  t.alike(p.display, [orderedListDisplay(0, 1)])

  p.resync('1. \n')
  t.is(p.text, '')
  t.is(p.position, 0)
  t.alike(p.display, [])
})

test('paste the whole ordered-list', (t) => {
  const p = makeParser({})

  p.resync('1. first line\n2. second line')
  t.is(p.text, '1. first line\n2. second line')
  t.is(p.position, 28)
  t.alike(p.display, [orderedListDisplay(0, 1), orderedListDisplay(14, 2)])
})

test('reentry a new ordered-list', (t) => {
  const p = makeParser({})

  p.resync('1. ')
  t.is(p.text, '1. ')
  t.is(p.position, 3)
  t.alike(p.display, [orderedListDisplay(0, 1)])

  p.resync('1. http://a.io')
  t.is(p.text, '1. http://a.io')
  t.is(p.position, 14)
  t.alike(p.display, [orderedListDisplay(0, 1), linkDisplay(3, 'http://a.io')])

  p.resync('1. http://a.io\n1. ')
  t.is(p.text, '1. http://a.io\n2. ')
  t.is(p.position, 18)
  t.alike(p.display, [
    orderedListDisplay(0, 1),
    linkDisplay(3, 'http://a.io'),
    orderedListDisplay(15, 2)
  ])
})

test('list general case newline at the end', (t) => {
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
})

test('a line that only starts with a mark but has no display is not an item', (t) => {
  const p = makeParser({ text: '1. a' })

  p.resync('1. a\n')
  t.is(p.text, '1. a\n')
  t.is(p.position, 5)
  t.alike(p.display, [])
})

test('enter before the start of the first item adds a plain line above it', (t) => {
  const p = makeParser({ text: '1. a', display: [0] })

  p.setPosition(0)
  p.resync('\n1. a')
  t.is(p.text, '\n1. a')
  t.is(p.position, 1)
  t.alike(p.display, [orderedListDisplay(1, 1)])
})

test('enter at the start of the first item adds a new line above it', (t) => {
  const p = makeParser({ text: '1. a', display: [0] })

  p.setPosition(3)
  p.resync('1. \na')
  t.is(p.text, '1. \n2. a')
  t.is(p.position, 7)
  t.alike(p.display, [orderedListDisplay(0, 1), orderedListDisplay(4, 2)])
})

test('list mark only converts at the start of a line', (t) => {
  const p = makeParser({})

  p.resync('a 1. ')
  t.is(p.text, 'a 1. ')
  t.is(p.position, 5)
  t.alike(p.display, [])

  p.resync('a 1. \n1. ')
  t.is(p.text, 'a 1. \n1. ')
  t.is(p.position, 9)
  t.alike(p.display, [orderedListDisplay(6, 1)])

  p.resync('a 1. \n1. b 1. ')
  t.is(p.text, 'a 1. \n1. b 1. ')
  t.is(p.position, 14)
  t.alike(p.display, [orderedListDisplay(6, 1)])

  p.resync('a 1. \n1. b 1. \n1. ')
  t.is(p.text, 'a 1. \n1. b 1. \n2. ')
  t.is(p.position, 18)
  t.alike(p.display, [orderedListDisplay(6, 1), orderedListDisplay(15, 2)])
})

test('list items survive edits on other lines and drop when their mark is broken', (t) => {
  const p = makeParser({})

  p.resync('1. ')
  t.is(p.text, '1. ')
  t.is(p.position, 3)
  t.alike(p.display, [orderedListDisplay(0, 1)])

  p.resync('1. x')
  p.resync('1. x\n')
  t.is(p.text, '1. x\n2. ')
  t.is(p.position, 8)
  t.alike(p.display, [orderedListDisplay(0, 1), orderedListDisplay(5, 2)])

  // a mention inside the first item shifts the second item
  p.setPosition(4)
  p.resync('1. x @bo\n2. ')
  t.is(p.text, '1. x @bob\n2. ')
  t.is(p.position, 9)
  t.alike(p.display, [
    orderedListDisplay(0, 1),
    mentionDisplay(5),
    orderedListDisplay(10, 2)
  ])

  // deleting the space after the second mark breaks that item only
  p.setPosition(13)
  p.resync('1. x @bob\n2.')
  t.is(p.text, '1. x @bob\n2.')
  t.is(p.position, 12)
  t.alike(p.display, [orderedListDisplay(0, 1), mentionDisplay(5)])

  // a mark typed mid-line is plain text
  p.resync('1. x @bob\n2.1. ')
  t.is(p.text, '1. x @bob\n2.1. ')
  t.is(p.position, 15)
  t.alike(p.display, [orderedListDisplay(0, 1), mentionDisplay(5)])
})

test('list continues on a new line', (t) => {
  const p = makeParser({})

  p.resync('x')
  p.resync('x\n')
  t.is(p.text, 'x\n')
  t.alike(p.display, [])

  p.resync('x\n1. ')
  p.resync('x\n1. a')
  t.alike(p.display, [orderedListDisplay(2, 1)])

  // enter at the end of an item adds the next mark on the new line
  p.resync('x\n1. a\n')
  t.is(p.text, 'x\n1. a\n2. ')
  t.is(p.position, 10)
  t.alike(p.display, [orderedListDisplay(2, 1), orderedListDisplay(7, 2)])

  // enter in the middle of an item splits it into two items
  p.resync('x\n1. a\n2. bc')
  p.resync('x\n1. a\n2. b\nc')
  t.is(p.text, 'x\n1. a\n2. b\n3. c')
  t.is(p.position, 15)
  t.alike(p.display, [
    orderedListDisplay(2, 1),
    orderedListDisplay(7, 2),
    orderedListDisplay(12, 3)
  ])
})

test('list continues on a new line in the middle', (t) => {
  const p = makeParser({})

  p.resync('1. ')
  t.is(p.text, '1. ')
  t.is(p.position, 3)
  t.alike(p.display, [orderedListDisplay(0, 1)])

  p.resync('1. a')
  p.resync('1. a\n')
  t.is(p.text, '1. a\n2. ')
  t.is(p.position, 8)
  t.alike(p.display, [orderedListDisplay(0, 1), orderedListDisplay(5, 2)])

  p.resync('1. a\n2. b')
  p.setPosition(4)
  p.resync('1. a\n\n2. b')
  t.is(p.text, '1. a\n2. \n3. b')
  t.is(p.position, 8)
  t.alike(p.display, [
    orderedListDisplay(0, 1),
    orderedListDisplay(5, 2),
    orderedListDisplay(9, 3)
  ])
})

test('list continues on a new line at the end', (t) => {
  const p = makeParser({})

  p.resync('1. ')
  t.is(p.text, '1. ')
  t.is(p.position, 3)
  t.alike(p.display, [orderedListDisplay(0, 1)])

  p.resync('1. a')
  p.resync('1. a\n')
  t.is(p.text, '1. a\n2. ')
  t.is(p.position, 8)
  t.alike(p.display, [orderedListDisplay(0, 1), orderedListDisplay(5, 2)])

  p.resync('1. a\n2. b')
  t.alike(p.display, [orderedListDisplay(0, 1), orderedListDisplay(5, 2)])
  p.resync('1. a\n2. b\n')
  t.is(p.text, '1. a\n2. b\n3. ')
  t.is(p.position, 13)
  t.alike(p.display, [
    orderedListDisplay(0, 1),
    orderedListDisplay(5, 2),
    orderedListDisplay(10, 3)
  ])
})

test('list end after 2 consecutive new lines', (t) => {
  const p = makeParser({ text: '1. a', display: [0] })

  p.resync('1. a\n')
  t.is(p.text, '1. a\n2. ')
  t.is(p.position, 8)
  t.alike(p.display, [orderedListDisplay(0, 1), orderedListDisplay(5, 2)])

  p.resync('1. a\n2. \n')
  t.is(p.text, '1. a\n')
  t.is(p.position, 5)
  t.alike(p.display, [orderedListDisplay(0, 1)])
})

test('list end in the middle keeps the other items', (t) => {
  const p = makeParser({ text: '1. a\n2. \n3. b', display: [0, 5, 9] })

  p.setPosition(8)
  p.resync('1. a\n2. \n\n3. b')
  t.is(p.text, '1. a\n\n1. b')
  t.is(p.position, 5)
  t.alike(p.display, [orderedListDisplay(0, 1), orderedListDisplay(6, 1)])
})

test('list end with empty item and backspace', (t) => {
  const p = makeParser({ text: '1. a\n2. \n3. b', display: [0, 5, 9] })

  p.setPosition(8)
  p.resync('1. a\n2.\n3. b')
  t.is(p.text, '1. a\n2.\n1. b')
  t.is(p.position, 7)
  t.alike(p.display, [orderedListDisplay(0, 1), orderedListDisplay(8, 1)])
})

test('backspace on the only item replaces the text', (t) => {
  const p = makeParser({ text: '1. ', display: [0] })

  p.setPosition(3)
  p.resync('1.')
  t.is(p.text, '1.')
  t.is(p.position, 2)
  t.alike(p.display, [])
})

test('list lifecycle with a mention and a link inside items', (t) => {
  const p = makeParser({})

  p.resync('1. ')
  p.resync('1. @bo')
  t.is(p.text, '1. @bob ')
  t.alike(p.display, [orderedListDisplay(0, 1), mentionDisplay(3)])

  p.resync('1. @bob \n')
  t.is(p.text, '1. @bob \n2. ')
  t.is(p.position, 12)

  p.resync('1. @bob \n2. http://a.io')
  t.alike(p.display, [
    orderedListDisplay(0, 1),
    mentionDisplay(3),
    orderedListDisplay(9, 2),
    linkDisplay(12, 'http://a.io')
  ])

  p.resync('1. @bob \n2. http://a.io\n')
  t.is(p.text, '1. @bob \n2. http://a.io\n3. ')
  t.is(p.position, 27)

  p.resync('1. @bob \n2. http://a.io\n3. \n')
  t.is(p.text, '1. @bob \n2. http://a.io\n')
  t.is(p.position, 24)

  p.resync('1. @bob \n2. http://a.io\nx')
  t.is(p.text, '1. @bob \n2. http://a.io\nx')
  t.is(p.position, 25)
  t.alike(p.display, [
    orderedListDisplay(0, 1),
    mentionDisplay(3),
    orderedListDisplay(9, 2),
    linkDisplay(12, 'http://a.io')
  ])
})

test('editing in the middle of a list with an emoji item', (t) => {
  const p = makeParser({})

  p.resync('1. ')
  t.is(p.text, '1. ')
  t.is(p.position, 3)
  t.alike(p.display, [orderedListDisplay(0, 1)])

  p.resync('1. :smile:')
  t.is(p.text, '1. 😄')
  t.is(p.position, 5)
  t.alike(p.display, [orderedListDisplay(0, 1), emojiDisplay(3)])

  p.resync('1. 😄\n')
  t.is(p.text, '1. 😄\n2. ')
  t.is(p.position, 9)
  t.alike(p.display, [
    orderedListDisplay(0, 1),
    emojiDisplay(3),
    orderedListDisplay(6, 2)
  ])

  p.resync('1. 😄\n2. b')
  t.is(p.text, '1. 😄\n2. b')
  t.is(p.position, 10)
  t.alike(p.display, [
    orderedListDisplay(0, 1),
    emojiDisplay(3),
    orderedListDisplay(6, 2)
  ])

  // enter at the end of the first item inserts an item between the two
  p.setPosition(5)
  p.resync('1. 😄\n\n2. b')
  t.is(p.text, '1. 😄\n2. \n3. b')
  t.is(p.position, 9)
  t.alike(p.display, [
    orderedListDisplay(0, 1),
    emojiDisplay(3),
    orderedListDisplay(6, 2),
    orderedListDisplay(10, 3)
  ])

  // backspace on that empty item removes its mark and splits the list
  p.setPosition(9)
  p.resync('1. 😄\n2.\n3. b')
  t.is(p.text, '1. 😄\n2.\n1. b')
  t.is(p.position, 8)
  t.alike(p.display, [
    orderedListDisplay(0, 1),
    emojiDisplay(3),
    orderedListDisplay(9, 1)
  ])

  // typing space after `2.` on that empty line do not makes it an item again
  p.setPosition(8)
  p.resync('1. 😄\n2. \n1. b')
  t.is(p.text, '1. 😄\n2. \n1. b')
  t.is(p.position, 9)
  t.alike(p.display, [
    orderedListDisplay(0, 1),
    emojiDisplay(3),
    orderedListDisplay(10, 1)
  ])
})

test('a mark arriving in one batch before existing text converts', (t) => {
  const p = makeParser({ text: 'x' })

  p.setPosition(0)
  p.resync('1. x')
  t.is(p.text, '1. x')
  t.is(p.position, 3)
  t.alike(p.display, [orderedListDisplay(0, 1)])
})

test('a mark typed mid-line stays text', (t) => {
  const p = makeParser({ text: 'x' })

  p.resync('x1. y')
  t.is(p.text, 'x1. y')
  t.alike(p.display, [])
})

test('backspace at the start of an item body removes its mark', (t) => {
  const p = makeParser({ text: '1. a', display: [0] })

  p.setPosition(3)
  p.resync('1.a')
  t.is(p.text, '1.a')
  t.is(p.position, 2)
  t.alike(p.display, [])
})

test('backspace joining two items drops the second mark', (t) => {
  const p = makeParser({ text: '1. a\n2. b', display: [0, 5] })

  p.setPosition(5)
  p.resync('1. a2. b')
  t.is(p.text, '1. a2. b')
  t.is(p.position, 4)
  t.alike(p.display, [orderedListDisplay(0, 1)])
})

test('forward delete joining two items drops the second mark', (t) => {
  const p = makeParser({ text: '1. a\n2. b', display: [0, 5] })

  p.selectRange(4, 5)
  p.resync('1. a2. b')
  t.is(p.text, '1. a2. b')
  t.is(p.position, 4)
  t.alike(p.display, [orderedListDisplay(0, 1)])
})

test('joining a plain line and an item drops the mark', (t) => {
  const p = makeParser({ text: 'x\n1. a', display: [2] })

  p.setPosition(2)
  p.resync('x1. a')
  t.is(p.text, 'x1. a')
  t.is(p.position, 1)
  t.alike(p.display, [])
})

test('typing before the mark drops the mark', (t) => {
  const p = makeParser({ text: '1. a', display: [0] })

  p.setPosition(0)
  p.resync('x1. a')
  t.is(p.text, 'x1. a')
  t.is(p.position, 1)
  t.alike(p.display, [])
})

test('backspace in the middle of the mark drops the mark', (t) => {
  const p = makeParser({ text: '1. a', display: [0] })

  p.setPosition(2)
  p.resync('1 a')
  t.is(p.text, '1 a')
  t.is(p.position, 1)
  t.alike(p.display, [])
})

test('several stray marks, dropped middle, others and cursor kept', (t) => {
  const p = makeParser({ text: '1. a\n2. b\n3. c', display: [0, 5, 10] })

  p.setPosition(8)
  p.resync('1. a\n2.b\n3. c')
  t.is(p.text, '1. a\n2.b\n1. c')
  t.is(p.position, 7)
  t.alike(p.display, [orderedListDisplay(0, 1), orderedListDisplay(9, 1)])
})

test('enter on a whitespace-only item continues the list', (t) => {
  const p = makeParser({})

  p.resync('1. ')
  t.is(p.text, '1. ')
  t.is(p.position, 3)
  t.alike(p.display, [orderedListDisplay(0, 1)])

  p.resync('1.  ')
  t.is(p.text, '1.  ')
  t.is(p.position, 4)
  t.alike(p.display, [orderedListDisplay(0, 1)])

  p.resync('1.  \n')
  t.is(p.text, '1.  \n2. ')
  t.is(p.position, 8)
  t.alike(p.display, [orderedListDisplay(0, 1), orderedListDisplay(5, 2)])
})

test('enter on a whitespace-only item in the middle keeps the all items', (t) => {
  const p = makeParser({ text: '1. a\n2.  \n3. b', display: [0, 5, 10] })

  p.setPosition(9)
  p.resync('1. a\n2.  \n\n3. b')
  t.is(p.text, '1. a\n2.  \n3. \n4. b')
  t.is(p.position, 13)
  t.alike(p.display, [
    orderedListDisplay(0, 1),
    orderedListDisplay(5, 2),
    orderedListDisplay(10, 3),
    orderedListDisplay(14, 4)
  ])
})

test('enter replacing a selection inside an item continues the list', (t) => {
  const p = makeParser({})

  p.resync('1. ')
  p.resync('1. ab')
  p.selectRange(3, 5)
  p.resync('1. cd')
  t.is(p.text, '1. cd')
  t.is(p.position, 5)
  t.alike(p.display, [orderedListDisplay(0, 1)])

  p.selectRange(4, 5)
  p.resync('1. c\n')
  t.is(p.text, '1. c\n2. ')
  t.is(p.position, 8)
  t.alike(p.display, [orderedListDisplay(0, 1), orderedListDisplay(5, 2)])
})

test('enter at the start of an item body splits it into an empty item and the item', (t) => {
  const p = makeParser({ text: '1. a', display: [0] })

  p.setPosition(3)
  p.resync('1. \na')
  t.is(p.text, '1. \n2. a')
  t.is(p.position, 7)
  t.alike(p.display, [orderedListDisplay(0, 1), orderedListDisplay(4, 2)])
})

test('typing in the middle of the mark drops the mark', (t) => {
  const p = makeParser({ text: '1. a', display: [0] })

  p.setPosition(1)
  p.resync('1x. a')
  t.is(p.text, '1x. a')
  t.is(p.position, 2)
  t.alike(p.display, [])
})

test('backspace on an empty item, just keep the typed text', (t) => {
  const p = makeParser({ text: '1. ', display: [0] })

  p.setPosition(3)
  p.resync('1.')
  t.is(p.text, '1.')
  t.is(p.position, 2)
  t.alike(p.display, [])
})

test('backspace joining two items keeps the second mark as text', (t) => {
  const p = makeParser({ text: '1. a\n2. b', display: [0, 5] })

  p.setPosition(5)
  p.resync('1. a2. b')
  t.is(p.text, '1. a2. b')
  t.is(p.position, 4)
  t.alike(p.display, [orderedListDisplay(0, 1)])
})

test('a mark left by backspace becomes an item again when the space is retyped', (t) => {
  const p = makeParser({ text: '1. a', display: [0] })

  p.setPosition(3)
  p.resync('1.a')
  t.is(p.text, '1.a')
  t.is(p.position, 2)
  t.alike(p.display, [])

  p.resync('1. a')
  t.is(p.text, '1. a')
  t.is(p.position, 3)
  t.alike(p.display, [orderedListDisplay(0, 1)])
})

test('typing inside the mark turns it into plain text', (t) => {
  const p = makeParser({ text: '1. a', display: [0] })

  p.setPosition(1)
  p.resync('1x. a')
  t.is(p.text, '1x. a')
  t.is(p.position, 2)
  t.alike(p.display, [])
})

test('joining a plain line into an item keeps the item below intact', (t) => {
  const p = makeParser({ text: 'x\n1. a\n2. b', display: [2, 7] })

  p.setPosition(2)
  p.resync('x1. a\n2. b')
  t.is(p.text, 'x1. a\n1. b')
  t.is(p.position, 1)
  t.alike(p.display, [orderedListDisplay(6, 1)])
})

test('backspace on an empty item ends the list: drop its mark', (t) => {
  const p = makeParser({
    text: 'x\n1. a\n2. b\n3. c',
    display: [2, 7, 12]
  })

  p.setPosition(11)
  p.resync('x\n1. a\n2. \n3. c')
  t.is(p.text, 'x\n1. a\n2. \n3. c')

  p.resync('x\n1. a\n2.\n3. c')
  t.is(p.text, 'x\n1. a\n2.\n1. c')
  t.is(p.position, 9)
  t.alike(p.display, [orderedListDisplay(2, 1), orderedListDisplay(10, 1)])
})

test('deleting over a selection that runs from inside one mark into the next item', (t) => {
  const p = makeParser({ text: '1. a\n2. b', display: [0, 5] })

  // select " a\n2. " (from after the first dot to after the second mark) and delete it
  p.selectRange(2, 8)
  p.resync('1.b')
  t.is(p.text, '1.b')
  t.is(p.position, 2)
  t.alike(p.display, [])
})

test('typing over a selection that runs from inside one mark into the next item', (t) => {
  const p = makeParser({ text: '1. a\n2. b', display: [0, 5] })

  // select " a\n2. " (from after the first dot to after the second mark) and type a space
  p.selectRange(2, 8)
  p.resync('1. b')
  t.is(p.text, '1. b')
  t.is(p.position, 3)
  t.alike(p.display, [orderedListDisplay(0, 1)])
})

test('paste the whole ordered-list', (t) => {
  const p = makeParser({})

  p.resync('1. line 1\n2. line 2\n3. line 3')
  t.is(p.text, '1. line 1\n2. line 2\n3. line 3')
  t.is(p.position, 29)
  t.alike(p.display, [
    orderedListDisplay(0, 1),
    orderedListDisplay(10, 2),
    orderedListDisplay(20, 3)
  ])
})

test('paste the whole ordered-list after existing text', (t) => {
  const p = makeParser({ text: 'intro' })

  p.resync('intro\n1. line 1\n\n2. line 2\n')
  t.is(p.text, 'intro\n1. line 1\n\n1. line 2\n')
  t.is(p.position, 27)
  t.alike(p.display, [orderedListDisplay(6, 1), orderedListDisplay(17, 1)])
})

test('paste the whole ordered-list after existing text with 1. ', (t) => {
  const p = makeParser({ text: '1. intro' })

  p.resync('1. intro\n1. line 1\n\n2. line 2\n')
  t.is(p.text, '1. intro\n1. line 1\n\n1. line 2\n')
  t.is(p.position, 30)
  t.alike(p.display, [orderedListDisplay(9, 1), orderedListDisplay(20, 1)])
})

test('paste the whole ordered-list into the middle of an existing list', (t) => {
  const p = makeParser({ text: '1. a\n2. d', display: [0, 5] })

  // cursor at the end of the first item, paste two more items
  p.setPosition(4)
  p.resync('1. a\n2. b\n3. c\n2. d')
  t.is(p.text, '1. a\n2. b\n3. c\n4. d')
  t.is(p.position, 14)
  t.alike(p.display, [
    orderedListDisplay(0, 1),
    orderedListDisplay(5, 2),
    orderedListDisplay(10, 3),
    orderedListDisplay(15, 4)
  ])
})

test('paste the whole ordered-list onto an empty item', (t) => {
  const p = makeParser({ text: '1. ', display: [0] })

  p.setPosition(3)
  p.resync('1. 1. a\n2. b')
  t.is(p.text, '1. 1. a\n2. b')
  t.is(p.position, 12)
  t.alike(p.display, [orderedListDisplay(0, 1), orderedListDisplay(8, 2)])
})

test('paste a list with a mention, an emoji and a link over a selection, then keep typing', (t) => {
  const p = makeParser({
    text: 'todo:\nold'
  })

  p.selectRange(6, 9)
  p.resync('todo:\n1. @bo\n2. :smile: http://a.io\n\n3. done')
  t.is(p.text, 'todo:\n1. @bob\n2. 😄 http://a.io\n\n1. done')
  t.is(p.position, 40)
  t.alike(p.display, [
    orderedListDisplay(6, 1),
    mentionDisplay(9),
    orderedListDisplay(14, 2),
    emojiDisplay(17),
    linkDisplay(20, 'http://a.io'),
    orderedListDisplay(33, 1)
  ])

  p.resync('todo:\n1. @bob\n2. 😄 http://a.io\n\n1. done\n')
  t.is(p.text, 'todo:\n1. @bob\n2. 😄 http://a.io\n\n1. done\n2. ')
  t.is(p.position, 44)

  p.resync('todo:\n1. @bob\n2. 😄 http://a.io\n\n1. done\n2. \n')
  t.is(p.text, 'todo:\n1. @bob\n2. 😄 http://a.io\n\n1. done\n')
  t.is(p.position, 41)
  t.is(p.display.length, 6)
})

test('editing a middle line leaves an untouched mark line above it alone', (t) => {
  const p = makeParser({ text: '1. a\nx\ny' })

  p.setPosition(6)
  p.resync('1. a\nxz\ny')
  t.is(p.text, '1. a\nxz\ny')
  t.alike(p.display, [])
})

test('editing the last line leaves an untouched mark line above it alone', (t) => {
  const p = makeParser({ text: '1. a\nx\ny' })

  p.setPosition(8)
  p.resync('1. a\nx\nyz')
  t.is(p.text, '1. a\nx\nyz')
  t.alike(p.display, [])
})

test('an edit on the empty last line leaves an untouched mark line above it alone', (t) => {
  const p = makeParser({ text: '1. a\nx' })

  p.setPosition(6)
  p.resync('1. a\n')
  t.is(p.text, '1. a\n')
  t.is(p.position, 5)
  t.alike(p.display, [])
})

test('paste a list over a selection that is shorter than the paste', (t) => {
  const p = makeParser({ text: 'abc' })

  p.selectRange(0, 3)
  p.resync('1. a\n2. b')
  t.is(p.text, '1. a\n2. b')
  t.is(p.position, 9)
  t.alike(p.display, [orderedListDisplay(0, 1), orderedListDisplay(5, 2)])
})

test('paste a list over a selection that is longer than the paste', (t) => {
  const p = makeParser({ text: 'hello world' })

  p.selectRange(0, 11)
  p.resync('1. a\n2. b')
  t.is(p.text, '1. a\n2. b')
  t.is(p.position, 9)
  t.alike(p.display, [orderedListDisplay(0, 1), orderedListDisplay(5, 2)])
})

test('paste a list whose first item shrinks while it is converted', (t) => {
  const p = makeParser({})

  p.resync('1. :smile:\n2. x')
  t.is(p.text, '1. 😄\n2. x')
  t.is(p.position, 10)
  t.alike(p.display, [
    orderedListDisplay(0, 1),
    emojiDisplay(3),
    orderedListDisplay(6, 2)
  ])
})

test('an unconverted mark line below the cursor does not hang without a list handler', (t) => {
  const p = makeParser({ text: 'x\n1. b' })

  p.setPosition(1)
  p.resync('xy\n1. b')
  t.is(p.text, 'xy\n1. b')
  t.alike(p.display, [])
})

test('deleting the whole first list line keeps the next item intact', (t) => {
  const p = makeParser({ text: '1. a\n2. b', display: [0, 5] })

  p.selectRange(0, 5)
  p.resync('2. b')
  t.is(p.text, '1. b')
  t.is(p.position, 0)
  t.alike(p.display, [orderedListDisplay(0, 1)])
})

test('one edit touching two items leaves no orphan mark', (t) => {
  const p = makeParser({ text: '1. a\n2. b', display: [0, 5] })

  p.selectRange(2, 8)
  p.resync('1. x\n2.b')

  t.is(p.text, '1. x\n2.b')
  t.is(p.position, 7)
  t.alike(p.display, [])
})

test('re-index when remove middle item', (t) => {
  const p = makeParser({
    text: '1. a\n2. b\n3. c\n4. d',
    display: [0, 5, 10, 15]
  })

  p.selectRange(6, 8)
  p.resync('1. a\n2b\n3. c\n4. d')
  t.is(p.text, '1. a\n2b\n1. c\n2. d')
  t.is(p.position, 6)
  t.alike(p.display, [
    orderedListDisplay(0, 1),
    orderedListDisplay(8, 1),
    orderedListDisplay(13, 2)
  ])

  p.selectRange(4, 7)
  p.resync('1. a\n1. c\n2. d')
  t.is(p.text, '1. a\n2. c\n3. d')
  t.is(p.position, 4)
  t.alike(p.display, [
    orderedListDisplay(0, 1),
    orderedListDisplay(5, 2),
    orderedListDisplay(10, 3)
  ])
})

test('re-index when adding middle item', (t) => {
  const p = makeParser({
    text: '1. a\n2. b\n3. c',
    display: [0, 5, 10]
  })

  p.setPosition(4)
  p.resync('1. a\n\n2. b\n3. c')
  t.is(p.text, '1. a\n2. \n3. b\n4. c')
  t.is(p.position, 8)
  t.alike(p.display, [
    orderedListDisplay(0, 1),
    orderedListDisplay(5, 2),
    orderedListDisplay(9, 3),
    orderedListDisplay(14, 4)
  ])
})

test('paste an ordered list whose last item is empty', (t) => {
  const p = makeParser({})

  p.resync('1. a\n2. ')
  t.is(p.text, '1. a\n2. ')
  t.alike(p.display, [orderedListDisplay(0, 1), orderedListDisplay(5, 2)])
})

test('paste a long ordered list with 12 items', (t) => {
  const p = makeParser({})

  p.resync(getList(12).text)
  t.is(p.text, getList(12).text)
  t.alike(
    p.display,
    getList(12).display.map((e, i) => orderedListDisplay(e, i + 1))
  )
})

test('add new item and delete after that in the middle of long ordered list', (t) => {
  const p = makeParser(getList(12))

  p.setPosition(9)
  p.resync(
    '1. a\n2. b\n\n3. c\n4. d\n5. e\n6. f\n7. g\n8. h\n9. i\n10. j\n11. k\n12. l'
  )
  t.is(
    p.text,
    '1. a\n2. b\n3. \n4. c\n5. d\n6. e\n7. f\n8. g\n9. h\n10. i\n11. j\n12. k\n13. l'
  )
  t.is(p.position, 13)
  t.alike(p.display, [
    orderedListDisplay(0, 1),
    orderedListDisplay(5, 2),
    orderedListDisplay(10, 3),
    orderedListDisplay(14, 4),
    orderedListDisplay(19, 5),
    orderedListDisplay(24, 6),
    orderedListDisplay(29, 7),
    orderedListDisplay(34, 8),
    orderedListDisplay(39, 9),
    orderedListDisplay(44, 10),
    orderedListDisplay(50, 11),
    orderedListDisplay(56, 12),
    orderedListDisplay(62, 13)
  ])

  p.resync(
    '1. a\n2. b\n3. \n\n4. c\n5. d\n6. e\n7. f\n8. g\n9. h\n10. i\n11. j\n12. k\n13. l'
  )
  t.is(
    p.text,
    '1. a\n2. b\n\n1. c\n2. d\n3. e\n4. f\n5. g\n6. h\n7. i\n8. j\n9. k\n10. l'
  )
  t.is(p.position, 10)
  t.alike(p.display, [
    orderedListDisplay(0, 1),
    orderedListDisplay(5, 2),
    orderedListDisplay(11, 1),
    orderedListDisplay(16, 2),
    orderedListDisplay(21, 3),
    orderedListDisplay(26, 4),
    orderedListDisplay(31, 5),
    orderedListDisplay(36, 6),
    orderedListDisplay(41, 7),
    orderedListDisplay(46, 8),
    orderedListDisplay(51, 9),
    orderedListDisplay(56, 10)
  ])

  p.resync(
    '1. a\n2. b\n1. c\n2. d\n3. e\n4. f\n5. g\n6. h\n7. i\n8. j\n9. k\n10. l'
  )
  t.is(p.text, getList(12).text)
  t.is(p.position, 9)
  t.alike(
    p.display,
    getList(12).display.map((e, i) => orderedListDisplay(e, i + 1))
  )
})

test('"Infinity. " is not an ordered-list mark', (t) => {
  const p = makeParser({})

  p.resync('Infinity. hello')
  t.is(p.text, 'Infinity. hello')
  t.alike(p.display, [])
})

test('paste 2 items after an 8-item list: re-index to 9, 10 keeps the cursor at the end', (t) => {
  const p = makeParser({
    text: getList(8).text + '\n',
    display: getList(8).display
  })

  p.resync(getList(8).text + '\n1. i\n2. j')
  t.is(p.text, getList(10).text)
  t.is(p.position, p.text.length)
  t.is(p.word, 'j')
  t.is(p.start, p.text.length - 1)
  t.is(p.end, p.text.length)
  t.alike(
    p.display,
    getList(10).display.map((e, i) => orderedListDisplay(e, i + 1))
  )
})

test('paste a 9-item list after an existing item: cursor after re-index', (t) => {
  const p = makeParser({ text: '1. x\n', display: [0] })

  p.resync('1. x\n' + getList(9).text)
  t.is(p.text, '1. x\n2. a\n3. b\n4. c\n5. d\n6. e\n7. f\n8. g\n9. h\n10. i')
  t.is(p.position, 50)
})

test('paste 12 items into the middle of a list: cursor ends after the pasted block', (t) => {
  const p = makeParser({ text: '1. a\n2. y\n3. z', display: [0, 5, 10] })

  p.setPosition(4)
  p.resync('1. a\n' + getList(12).text + '\n2. y\n3. z')
  t.is(
    p.text,
    '1. a\n2. a\n3. b\n4. c\n5. d\n6. e\n7. f\n8. g\n9. h\n10. i\n11. j\n12. k\n13. l\n14. y\n15. z'
  )
  t.is(p.position, 68)
})

test('an emoji at the end of the pasted 10th item keeps the cursor after it', (t) => {
  const p = makeParser({
    text: getList(8).text + '\n',
    display: getList(8).display
  })

  p.resync(getList(8).text + '\n1. i\n2. :smile:')
  t.is(p.text, getList(8).text + '\n9. i\n10. 😄')
  t.is(p.position, p.text.length)
  t.alike(p.display.at(-1), emojiDisplay(49))
})

test('deleting the first item of a 12-item list refreshes the current word', (t) => {
  const p = makeParser(getList(12))

  p.selectRange(0, 5)
  p.resync(getList(12).text.slice(5))
  t.is(
    p.text,
    '1. b\n2. c\n3. d\n4. e\n5. f\n6. g\n7. h\n8. i\n9. j\n10. k\n11. l'
  )
  t.is(p.position, 0)
})
