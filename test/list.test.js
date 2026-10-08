const test = require('brittle')

const Parser = require('..')
const { DISPLAY_TYPES } = require('@holepunchto/keet-core-api')
const { HTTP_LINK, MENTION, EMOJI, UNORDERED_LIST } = DISPLAY_TYPES

const unorderedListDisplay = (start) => ({
  start,
  end: start + 2,
  content: '• ',
  length: 2,
  type: UNORDERED_LIST
})

const makeParser = ({ text = '', display = [] }) => {
  const p = new Parser({
    text,
    display: display.map(unorderedListDisplay),
    onlist: (start, end, type) => p.setList(start, end, type),
    onlink: (link) => p.setLink(link, link),
    onmention: (mention) => p.setMention(mention, '@bob', 'member-id'),
    onemoji: (emoji) => p.setEmoji(emoji, ':smile:', '😄')
  })
  return p
}

test('list general case', (t) => {
  const p = makeParser({})

  p.resync('- ')
  t.is(p.text, '• ')
  t.is(p.position, 2)
  t.alike(p.display, [unorderedListDisplay(0)])

  p.resync('• http://a.io')
  t.is(p.text, '• http://a.io')
  t.is(p.position, 13)
  t.alike(p.display, [
    unorderedListDisplay(0),
    { start: 2, end: 13, content: 'http://a.io', length: 11, type: HTTP_LINK }
  ])

  p.resync('• http://a.io\n- ')
  t.is(p.text, '• http://a.io\n• ')
  t.is(p.position, 16)
  t.alike(p.display, [
    unorderedListDisplay(0),
    { start: 2, end: 13, content: 'http://a.io', length: 11, type: HTTP_LINK },
    unorderedListDisplay(14)
  ])
})

test('a line that only starts with a bullet but has no display is not an item', (t) => {
  const p = makeParser({ text: '• a' })

  p.resync('• a\n')
  t.is(p.text, '• a\n')
  t.is(p.position, 4)
  t.alike(p.display, [])
})

test('enter before the start of the first item adds a plain line above it', (t) => {
  const p = makeParser({ text: '• a', display: [0] })

  p.setPosition(0)
  p.resync('\n• a')
  t.is(p.text, '\n• a')
  t.is(p.position, 1)
  t.alike(p.display, [unorderedListDisplay(1)])
})

test('enter at the start of the first item adds a new line above it', (t) => {
  const p = makeParser({ text: '• a', display: [0] })

  p.setPosition(2)
  p.resync('• \na')
  t.is(p.text, '• \n• a')
  t.is(p.position, 5)
  t.alike(p.display, [unorderedListDisplay(0), unorderedListDisplay(3)])
})

test('list mark only converts at the start of a line', (t) => {
  const p = makeParser({})

  p.resync('a - ')
  t.is(p.text, 'a - ')
  t.is(p.position, 4)
  t.alike(p.display, [])

  p.resync('a - \n- ')
  t.is(p.text, 'a - \n• ')
  t.is(p.position, 7)
  t.alike(p.display, [unorderedListDisplay(5)])

  p.resync('a - \n• b * ')
  t.is(p.text, 'a - \n• b * ')
  t.is(p.position, 11)
  t.alike(p.display, [unorderedListDisplay(5)])

  p.resync('a - \n• b * \n- ')
  t.is(p.text, 'a - \n• b * \n• ')
  t.is(p.position, 14)
  t.alike(p.display, [unorderedListDisplay(5), unorderedListDisplay(12)])
})

test('list items survive edits on other lines and drop when their mark is broken', (t) => {
  const p = makeParser({})

  p.resync('- ')
  t.is(p.text, '• ')
  t.is(p.position, 2)
  t.alike(p.display, [unorderedListDisplay(0)])

  p.resync('• x\n- ')
  t.is(p.text, '• x\n• ')
  t.alike(p.display, [unorderedListDisplay(0), unorderedListDisplay(4)])

  // a mention inside the first item shifts the second item
  p.resync('• x @bo\n• ')
  t.is(p.text, '• x @bob\n• ')
  t.is(p.position, 8)
  t.alike(p.display, [
    unorderedListDisplay(0),
    { start: 4, end: 8, length: 4, type: MENTION, memberId: 'member-id' },
    unorderedListDisplay(9)
  ])

  // deleting the space after the second bullet breaks that item only
  p.resync('• x @bob\n•')
  t.is(p.text, '• x @bob\n-')
  t.is(p.position, 10)
  t.alike(p.display, [
    unorderedListDisplay(0),
    { start: 4, end: 8, length: 4, type: MENTION, memberId: 'member-id' }
  ])

  // a mark typed mid-line is plain text
  p.resync('• x @bob\n--')
  t.is(p.text, '• x @bob\n--')
  t.alike(p.display, [
    unorderedListDisplay(0),
    { start: 4, end: 8, length: 4, type: MENTION, memberId: 'member-id' }
  ])
})

test('list continues on a new line', (t) => {
  const p = makeParser({})

  p.resync('x')
  p.resync('x\n')
  t.is(p.text, 'x\n')
  t.alike(p.display, [])

  p.resync('x\n- ')
  p.resync('x\n• a')
  t.alike(p.display, [unorderedListDisplay(2)])

  // enter at the end of an item adds the marker on the new line
  p.resync('x\n• a\n')
  t.is(p.text, 'x\n• a\n• ')
  t.is(p.position, 8)
  t.alike(p.display, [unorderedListDisplay(2), unorderedListDisplay(6)])

  // enter in the middle of an item splits it into two items
  p.resync('x\n• a\n• bc')
  p.resync('x\n• a\n• b\nc')
  t.is(p.text, 'x\n• a\n• b\n• c')
  t.is(p.position, 12)
  t.alike(p.display, [
    unorderedListDisplay(2),
    unorderedListDisplay(6),
    unorderedListDisplay(10)
  ])
})

test('list continues on a new line in the middle', (t) => {
  const p = makeParser({})

  p.resync('- ')
  t.is(p.text, '• ')
  t.is(p.position, 2)
  t.alike(p.display, [unorderedListDisplay(0)])

  p.resync('• a\n- ')
  t.is(p.text, '• a\n• ')
  t.is(p.position, 6)
  t.alike(p.display, [unorderedListDisplay(0), unorderedListDisplay(4)])

  p.resync('• a\n• b')
  p.setPosition(3)
  p.resync('• a\n\n• b')
  t.is(p.text, '• a\n• \n• b')
  t.is(p.position, 6)
  t.alike(p.display, [
    unorderedListDisplay(0),
    unorderedListDisplay(4),
    unorderedListDisplay(7)
  ])
})

test('list continues on a new line at the end', (t) => {
  const p = makeParser({})

  p.resync('- ')
  t.is(p.text, '• ')
  t.is(p.position, 2)
  t.alike(p.display, [unorderedListDisplay(0)])

  p.resync('• a\n- ')
  t.is(p.text, '• a\n• ')
  t.is(p.position, 6)
  t.alike(p.display, [unorderedListDisplay(0), unorderedListDisplay(4)])

  p.resync('• a\n• b')
  t.alike(p.display, [unorderedListDisplay(0), unorderedListDisplay(4)])
  p.resync('• a\n• b\n')
  t.is(p.text, '• a\n• b\n• ')
  t.is(p.position, 10)
  t.alike(p.display, [
    unorderedListDisplay(0),
    unorderedListDisplay(4),
    unorderedListDisplay(8)
  ])
})

test('list end after 2 consecutive new lines', (t) => {
  const p = makeParser({ text: '• a', display: [0] })

  p.resync('• a\n- ')
  t.is(p.text, '• a\n• ')
  t.is(p.position, 6)
  t.alike(p.display, [unorderedListDisplay(0), unorderedListDisplay(4)])

  p.resync('• a\n• \n')
  t.is(p.text, '• a\n')
  t.is(p.position, 4)
  t.alike(p.display, [unorderedListDisplay(0)])
})

test('list end in the middle keeps the other items', (t) => {
  const p = makeParser({ text: '• a\n• \n• b', display: [0, 4, 7] })

  p.setPosition(6)
  p.resync('• a\n• \n\n• b')
  t.is(p.text, '• a\n\n• b')
  t.is(p.position, 4)
  t.alike(p.display, [unorderedListDisplay(0), unorderedListDisplay(5)])
})

test('list end with empty item and backspace', (t) => {
  const p = makeParser({ text: '• a\n• \n• b', display: [0, 4, 7] })

  p.setPosition(6)
  p.resync('• a\n•\n• b')
  t.is(p.text, '• a\n-\n• b')
  t.is(p.position, 5)
  t.alike(p.display, [unorderedListDisplay(0), unorderedListDisplay(6)])
})

test('backspace on the only item replaces the text', (t) => {
  const p = makeParser({ text: '• ', display: [0] })

  p.setPosition(2)
  p.resync('•')
  t.is(p.text, '-')
  t.is(p.position, 1)
  t.alike(p.display, [])
})

test('list lifecycle with a mention and a link inside items', (t) => {
  const p = makeParser({})

  p.resync('- ')
  p.resync('• @bo')
  t.is(p.text, '• @bob ')
  t.alike(p.display, [
    unorderedListDisplay(0),
    { type: MENTION, start: 2, end: 6, length: 4, memberId: 'member-id' }
  ])

  p.resync('• @bob \n')
  t.is(p.text, '• @bob \n• ')
  t.is(p.position, 10)

  p.resync('• @bob \n• http://a.io')
  t.alike(p.display, [
    unorderedListDisplay(0),
    { type: MENTION, start: 2, end: 6, length: 4, memberId: 'member-id' },
    unorderedListDisplay(8),
    { type: HTTP_LINK, start: 10, end: 21, content: 'http://a.io', length: 11 }
  ])

  p.resync('• @bob \n• http://a.io\n')
  t.is(p.text, '• @bob \n• http://a.io\n• ')
  t.is(p.position, 24)

  p.resync('• @bob \n• http://a.io\n• \n')
  t.is(p.text, '• @bob \n• http://a.io\n')
  t.is(p.position, 22)

  p.resync('• @bob \n• http://a.io\nx')
  t.is(p.text, '• @bob \n• http://a.io\nx')
  t.is(p.position, 23)
  t.alike(p.display, [
    unorderedListDisplay(0),
    { type: MENTION, start: 2, end: 6, length: 4, memberId: 'member-id' },
    unorderedListDisplay(8),
    { type: HTTP_LINK, start: 10, end: 21, content: 'http://a.io', length: 11 }
  ])
})

test('editing in the middle of a list with an emoji item', (t) => {
  const p = makeParser({})

  p.resync('- ')
  p.resync('• :smile:')
  t.is(p.text, '• 😄')
  t.alike(p.display, [
    unorderedListDisplay(0),
    { type: EMOJI, start: 2, end: 4, content: 'smile', length: 2 }
  ])

  p.resync('• 😄\n')
  p.resync('• 😄\n• b')
  t.is(p.text, '• 😄\n• b')

  // enter at the end of the first item inserts an item between the two
  p.setPosition(4)
  p.resync('• 😄\n\n• b')
  t.is(p.text, '• 😄\n• \n• b')
  t.is(p.position, 7)
  t.alike(p.display, [
    unorderedListDisplay(0),
    { type: EMOJI, start: 2, end: 4, content: 'smile', length: 2 },
    unorderedListDisplay(5),
    unorderedListDisplay(8)
  ])

  // backspace on that empty item removes its marker
  p.setPosition(7)
  p.resync('• 😄\n•\n• b')
  t.is(p.text, '• 😄\n-\n• b')
  t.is(p.position, 6)
  t.alike(p.display, [
    unorderedListDisplay(0),
    { type: EMOJI, start: 2, end: 4, content: 'smile', length: 2 },
    unorderedListDisplay(7)
  ])

  // typing space after `- ` on that empty line makes it an item again
  p.setPosition(6)
  p.resync('• 😄\n- \n• b')
  t.is(p.text, '• 😄\n• \n• b')
  t.is(p.position, 7)
  t.alike(p.display, [
    unorderedListDisplay(0),
    { type: EMOJI, start: 2, end: 4, content: 'smile', length: 2 },
    unorderedListDisplay(5),
    unorderedListDisplay(8)
  ])
})

test('a mark arriving in one batch before existing text converts', (t) => {
  const p = makeParser({ text: 'x' })

  p.setPosition(0)
  p.resync('- x')
  t.is(p.text, '• x')
  t.is(p.position, 2)
  t.alike(p.display, [unorderedListDisplay(0)])
})

test('a mark typed mid-line stays text', (t) => {
  const p = makeParser({ text: 'x' })

  p.resync('x- y')
  t.is(p.text, 'x- y')
  t.alike(p.display, [])
})

test('backspace at the start of an item body removes its marker', (t) => {
  const p = makeParser({ text: '• a', display: [0] })

  p.setPosition(2)
  p.resync('•a')
  t.is(p.text, '-a')
  t.is(p.position, 1)
  t.alike(p.display, [])
})

test('backspace joining two items drops the second marker', (t) => {
  const p = makeParser({ text: '• a\n• b', display: [0, 4] })

  p.setPosition(4)
  p.resync('• a• b')
  t.is(p.text, '• a- b')
  t.is(p.position, 3)
  t.alike(p.display, [unorderedListDisplay(0)])
})

test('forward delete joining two items drops the second marker', (t) => {
  const p = makeParser({ text: '• a\n• b', display: [0, 4] })

  p.selectRange(3, 4)
  p.resync('• a• b')
  t.is(p.text, '• a- b')
  t.is(p.position, 3)
  t.alike(p.display, [unorderedListDisplay(0)])
})

test('joining a plain line and an item drops the marker', (t) => {
  const p = makeParser({ text: 'x\n• a', display: [2] })

  p.setPosition(2)
  p.resync('x• a')
  t.is(p.text, 'x- a')
  t.is(p.position, 1)
  t.alike(p.display, [])
})

test('typing before the bullet drops the marker', (t) => {
  const p = makeParser({ text: '• a', display: [0] })

  p.setPosition(0)
  p.resync('x• a')
  t.is(p.text, 'x- a')
  t.is(p.position, 1)
  t.alike(p.display, [])
})

test('backspace in the middle of the bullet drops the marker', (t) => {
  const p = makeParser({ text: '• a', display: [0] })

  p.setPosition(1)
  p.resync('•a')
  t.is(p.text, '-a')
  t.is(p.position, 1)
  t.alike(p.display, [])
})

test('several stray markers, dropped middle, others and cursor kept', (t) => {
  const p = makeParser({ text: '• a\n• b\n• c', display: [0, 4, 8] })

  p.setPosition(6)
  p.resync('• a\n•b\n• c')
  t.is(p.text, '• a\n-b\n• c')
  t.is(p.position, 5)
  t.alike(p.display, [unorderedListDisplay(0), unorderedListDisplay(7)])
})

test('enter on a whitespace-only item continues the list', (t) => {
  const p = makeParser({})

  p.resync('- ')
  t.is(p.text, '• ')
  t.is(p.position, 2)
  t.alike(p.display, [unorderedListDisplay(0)])

  p.resync('•  ')
  t.is(p.text, '•  ')
  t.is(p.position, 3)
  t.alike(p.display, [unorderedListDisplay(0)])

  p.resync('•  \n')
  t.is(p.text, '•  \n• ')
  t.is(p.position, 6)
  t.alike(p.display, [unorderedListDisplay(0), unorderedListDisplay(4)])
})

test('enter on a whitespace-only item in the middle keeps the all items', (t) => {
  const p = makeParser({ text: '• a\n•  \n• b', display: [0, 4, 8] })

  p.setPosition(7)
  p.resync('• a\n•  \n\n• b')
  t.is(p.text, '• a\n•  \n• \n• b')
  t.is(p.position, 10)
  t.alike(p.display, [
    unorderedListDisplay(0),
    unorderedListDisplay(4),
    unorderedListDisplay(8),
    unorderedListDisplay(11)
  ])
})

test('enter replacing a selection inside an item continues the list', (t) => {
  const p = makeParser({})

  p.resync('- ')
  p.resync('• ab')
  p.selectRange(2, 4)
  p.resync('• cd')
  t.is(p.text, '• cd')
  t.is(p.position, 4)
  t.alike(p.display, [unorderedListDisplay(0)])

  p.selectRange(3, 4)
  p.resync('• c\n')
  t.is(p.text, '• c\n• ')
  t.is(p.position, 6)
  t.alike(p.display, [unorderedListDisplay(0), unorderedListDisplay(4)])
})

test('enter at the start of an item body splits it into an empty item and the item', (t) => {
  const p = makeParser({ text: '• a', display: [0] })

  p.setPosition(2)
  p.resync('• \na')
  t.is(p.text, '• \n• a')
  t.is(p.position, 5)
  t.alike(p.display, [unorderedListDisplay(0), unorderedListDisplay(3)])
})

test('typing in the middle of the bullet drops the marker', (t) => {
  const p = makeParser({ text: '• a', display: [0] })

  p.setPosition(1)
  p.resync('•x a')
  t.is(p.text, '-x a')
  t.is(p.position, 2)
  t.alike(p.display, [])
})

test('backspace on an empty item, just replace remark with original char', (t) => {
  const p = makeParser({ text: '• ', display: [0] })

  p.setPosition(2)
  p.resync('•')
  t.is(p.text, '-')
  t.is(p.position, 1)
  t.alike(p.display, [])
})

test('backspace joining two items keeps the second mark as a dash', (t) => {
  const p = makeParser({ text: '• a\n• b', display: [0, 4] })

  p.setPosition(4)
  p.resync('• a• b')
  t.is(p.text, '• a- b')
  t.is(p.position, 3)
  t.alike(p.display, [unorderedListDisplay(0)])
})

test('a dash left by backspace becomes an item again when the space is retyped', (t) => {
  const p = makeParser({ text: '• a', display: [0] })

  p.setPosition(2)
  p.resync('•a')
  t.is(p.text, '-a')
  t.is(p.position, 1)
  t.alike(p.display, [])

  p.resync('- a')
  t.is(p.text, '• a')
  t.is(p.position, 2)
  t.alike(p.display, [unorderedListDisplay(0)])
})

test('typing inside the marker turns it into a dash', (t) => {
  const p = makeParser({ text: '• a', display: [0] })

  p.setPosition(1)
  p.resync('•x a')
  t.is(p.text, '-x a')
  t.is(p.position, 2)
  t.alike(p.display, [])
})

test('joining a plain line into an item keeps the item below intact', (t) => {
  const p = makeParser({ text: 'x\n• a\n• b', display: [2, 6] })

  p.setPosition(2)
  p.resync('x• a\n• b')
  t.is(p.text, 'x- a\n• b')
  t.is(p.position, 1)
  t.alike(p.display, [unorderedListDisplay(5)])
})

test('backspace on an empty item ends the list: drop its marker', (t) => {
  const p = makeParser({ text: 'x\n• a\n• b\n• c', display: [2, 6, 10] })

  p.setPosition(9)
  p.resync('x\n• a\n• \n• c')
  t.is(p.text, 'x\n• a\n• \n• c')

  p.resync('x\n• a\n•\n• c')
  t.is(p.text, 'x\n• a\n-\n• c')
  t.is(p.position, 7)
  t.alike(p.display, [unorderedListDisplay(2), unorderedListDisplay(8)])
})
