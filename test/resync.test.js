const test = require('brittle')

const {
  makeParser,
  linkDisplay,
  pearLinkDisplay,
  mentionDisplay,
  emojiDisplay,
  customEmojiDisplay
} = require('./helpers')

test('resync when paste to empty input', function (t) {
  let params = null
  const p = makeParser({
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
  t.alike(p.display, [linkDisplay(0, link)])
})

test('resync when select the whole input and paste', function (t) {
  let params = null
  const p = makeParser({
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
  t.alike(p.display, [pearLinkDisplay(0, link)])
})

test('resync when select a range input and paste', function (t) {
  const p = makeParser()

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

  // select the range 3-10 and paste 'xxx'
  p.selectRange(3, 10)
  p.resync('12 xxx 1234')
  t.is(p.position, 6)
  t.is(p.text, '12 xxx 1234')
})

test('resync when select a range input and paste a link', function (t) {
  let params = null
  const p = makeParser({
    onlink(link) {
      params = link
    }
  })

  p.appendText('12 1234567 1234')

  // select the range 3-10 and paste link
  p.selectRange(3, 10)
  const link = 'http://example.com'
  p.resync(`12 ${link} 1234`)
  t.is(p.position, 21)
  t.is(p.text, `12 ${link} 1234`)
  t.is(params, link)
  p.setLink(link, link)

  t.alike(p.display, [linkDisplay(3, link)])
})

test('resync when select a range input and paste a link should keep old display', function (t) {
  const p = makeParser()

  const link = 'http://example.com'
  p.appendText(link)
  t.is(p.text, link)
  p.setLink(link, link)
  p.appendText(' 123 ')
  p.appendText(link)
  t.is(p.text, `${link} 123 ${link}`)
  p.setLink(link, link)

  t.alike(p.display, [linkDisplay(0, link), linkDisplay(23, link)])

  // select the range 19-22 and paste 'xxxxxxxx'
  p.selectRange(19, 22)
  p.resync(`${link} xxxxxxxx ${link}`)

  t.is(p.position, 27)
  t.alike(p.display, [linkDisplay(0, link), linkDisplay(28, link)])

  // select the range 19-27 and paste 'a'
  p.selectRange(19, 27)
  p.resync(`${link} a ${link}`)

  t.is(p.position, 20)
  t.alike(p.display, [linkDisplay(0, link), linkDisplay(21, link)])
})

test('resync for append case', function (t) {
  const display = [
    mentionDisplay(0, '@Silly Water Dragon', '001'),
    mentionDisplay(24, '@Handsome Dragon', '002')
  ]
  const p = makeParser({
    display,
    text: '@Silly Water Dragon 123 @Handsome Dragon'
  })

  p.resync('@Silly Water Dragon 123 @Handsome Dragon ')
  t.is(p.position, 41)
  t.alike(p.display, display)
})

test('resync for remove all text case', function (t) {
  const p = makeParser({
    display: [],
    text: '1'
  })

  p.resync('')
  t.is(p.position, 0)
})

test('resync link list', function (t) {
  let counter = 0
  const p = makeParser({
    onlink(link) {
      counter++
      p.setLink(link, link)
    }
  })
  const link1 = 'http://1.com'
  const link2 = 'http://2.com'
  const link3 = 'http://3.com'

  p.resync(`${link1} ${link2} ${link3}`)
  t.is(counter, 3)
  t.is(p.text, `${link1} ${link2} ${link3}`)
  t.alike(p.display, [
    linkDisplay(0, link1),
    linkDisplay(13, link2),
    linkDisplay(26, link3)
  ])
})

test('resync: repeated character keeps the cursor at the end', function (t) {
  const p = makeParser()

  p.resync('aa')
  t.is(p.text, 'aa')
  t.is(p.position, 2)

  p.resync('aaa')
  t.is(p.text, 'aaa')
  t.is(p.position, 3)
})

test('resync test remove mention', function (t) {
  const firstMentionDisplay = mentionDisplay(0, '@bob', 'member-id-0')
  const secondMentionDisplay = mentionDisplay(5, '@bob', 'member-id-0')

  const p = makeParser({
    onmention(mention) {
      p.setMention(mention, '@bob', 'member-id-0')
    }
  })

  p.resync('@b')
  t.is(p.text, '@bob ')
  t.is(p.position, 5)
  t.alike(p.display, [firstMentionDisplay])

  p.resync('@bob @bo')
  t.is(p.text, '@bob @bob ')
  t.is(p.position, 10)
  t.alike(p.display, [firstMentionDisplay, secondMentionDisplay])

  p.resync('@bob @bob hi')
  t.is(p.text, '@bob @bob hi')
  t.is(p.position, 12)
  t.alike(p.display, [firstMentionDisplay, secondMentionDisplay])

  p.resync('@bob hi')
  t.is(p.text, '@bob hi')
  t.is(p.position, 5)
  t.alike(p.display, [firstMentionDisplay])
})

test('resync test modify mention', function (t) {
  const p = makeParser({
    onmention(mention) {
      p.setMention(mention, '@bob', 'member-id-0')
    }
  })

  p.resync('@b')
  t.is(p.text, '@bob ')
  t.is(p.position, 5)
  t.alike(p.display, [mentionDisplay(0, '@bob', 'member-id-0')])

  p.resync('x @bob ')
  t.is(p.text, 'x @bob ')
  t.is(p.position, 2)
  t.alike(p.display, [mentionDisplay(2, '@bob', 'member-id-0')])
})

test('resync test middle modification', function (t) {
  const p = makeParser()

  p.resync('xaay')
  t.is(p.text, 'xaay')
  t.is(p.position, 4)
  t.alike(p.display, [])

  p.resync('xaaay')
  t.is(p.text, 'xaaay')
  t.is(p.position, 4)
  t.alike(p.display, [])
})

test('resync test start modification', function (t) {
  const p = makeParser()

  p.resync('b')
  t.is(p.text, 'b')
  t.is(p.position, 1)
  t.alike(p.display, [])

  p.resync('ab')
  t.is(p.text, 'ab')
  t.is(p.position, 1)
  t.alike(p.display, [])
})

test('resync test modify emoji', function (t) {
  const firstEmojiDisplay = emojiDisplay(2, 'grinning')

  const secondEmojiDisplay = emojiDisplay(5, 'grinning')

  const p = makeParser()

  p.resync('x 😀 😀 y')
  t.is(p.text, 'x 😀 😀 y')
  t.is(p.position, 9)
  t.alike(p.display, [firstEmojiDisplay, secondEmojiDisplay])

  p.resync('x 😀 y')
  t.is(p.text, 'x 😀 y')
  t.is(p.position, 5)
  t.alike(p.display, [firstEmojiDisplay])
})

test('resync deleting one emoji keep one emoji', function (t) {
  const p = makeParser()

  p.resync('😀😀 ')
  t.is(p.text, '😀😀 ')
  t.alike(p.display, [emojiDisplay(0, 'grinning'), emojiDisplay(2, 'grinning')])

  p.resync('😀 ')
  t.is(p.text, '😀 ')
  t.is(p.position, 2)
  t.alike(p.display, [emojiDisplay(0, 'grinning')])
})

test('resync: manual pick 2 emojis, then manual delete 1st one using backspace', function (t) {
  const p = makeParser({
    ondefaultemoji: (word) => {
      if (word === '😀') p.setEmoji(word, 'grinning', word, true)
      if (word === '🚀') p.setEmoji(word, 'rocket', word, true)
      if (word === '😃') p.setEmoji(word, 'smiley', word, true)
    }
  })

  p.resync('😀')
  t.is(p.text, '😀 ')
  t.is(p.position, 3)
  t.alike(p.display, [emojiDisplay(0, 'grinning')])

  p.resync('😀 🚀')
  t.is(p.text, '😀 🚀 ')
  t.is(p.position, 6)
  t.alike(p.display, [emojiDisplay(0, 'grinning'), emojiDisplay(3, 'rocket')])

  p.resync('😀 🚀 😃')
  t.is(p.text, '😀 🚀 😃 ')
  t.is(p.position, 9)
  t.alike(p.display, [
    emojiDisplay(0, 'grinning'),
    emojiDisplay(3, 'rocket'),
    emojiDisplay(6, 'smiley')
  ])

  // remove 3 extra spaces that auto-added by parser
  p.backspace()
  p.setPosition(6)
  p.backspace()
  p.setPosition(3)
  p.backspace()
  t.is(p.text, '😀🚀😃')
  t.alike(p.display, [
    emojiDisplay(0, 'grinning'),
    emojiDisplay(2, 'rocket'),
    emojiDisplay(4, 'smiley')
  ])

  // remove 1st emoji
  p.setPosition(2)
  p.backspace()
  t.is(p.text, '🚀😃')
  t.is(p.position, 0)
  t.alike(p.display, [emojiDisplay(0, 'rocket'), emojiDisplay(2, 'smiley')])
})

test('resync: manual pick 2 emojis, then manual delete 1st one using resync', function (t) {
  const p = makeParser({
    ondefaultemoji: (word) => {
      if (word === '😀') p.setEmoji(word, 'grinning', word, true)
      if (word === '🚀') p.setEmoji(word, 'rocket', word, true)
      if (word === '😃') p.setEmoji(word, 'smiley', word, true)
    }
  })

  p.resync('😀')
  t.is(p.text, '😀 ')
  t.is(p.position, 3)
  t.alike(p.display, [emojiDisplay(0, 'grinning')])

  p.resync('😀 🚀')
  t.is(p.text, '😀 🚀 ')
  t.is(p.position, 6)
  t.alike(p.display, [emojiDisplay(0, 'grinning'), emojiDisplay(3, 'rocket')])

  p.resync('😀 🚀 😃')
  t.is(p.text, '😀 🚀 😃 ')
  t.is(p.position, 9)
  t.alike(p.display, [
    emojiDisplay(0, 'grinning'),
    emojiDisplay(3, 'rocket'),
    emojiDisplay(6, 'smiley')
  ])

  // remove 3 extra spaces that auto-added by parser
  p.backspace()
  p.setPosition(6)
  p.backspace()
  p.setPosition(3)
  p.backspace()
  t.is(p.text, '😀🚀😃')
  t.alike(p.display, [
    emojiDisplay(0, 'grinning'),
    emojiDisplay(2, 'rocket'),
    emojiDisplay(4, 'smiley')
  ])

  // remove 1st emoji by resync
  p.resync('🚀😃')
  t.is(p.text, '🚀😃')
  t.is(p.position, 0)
  t.alike(p.display, [emojiDisplay(0, 'rocket'), emojiDisplay(2, 'smiley')])
})

test('resync deleting one of two identical adjacent emojis keeps one display', function (t) {
  const p = makeParser()

  p.appendText('😀😀 ')
  p.setUnicodeEmoji(0, 2, 'grinning')
  p.setUnicodeEmoji(2, 4, 'grinning')

  p.resync('😀 ')

  t.is(p.text, '😀 ')
  t.is(p.position, 2)
  t.alike(p.display, [emojiDisplay(0, 'grinning')])
})

test('resync typing a repeated character keeps the cursor after it', function (t) {
  const p = makeParser()

  p.appendText('aa')
  p.resync('aaa')

  t.is(p.text, 'aaa')
  t.is(p.position, 3)
})

test('resync deleting an emoji that shares a surrogate with the next keeps the next display', function (t) {
  const p = makeParser()

  p.appendText('😀😃 ')
  p.setUnicodeEmoji(0, 2, 'grinning')
  p.setUnicodeEmoji(2, 4, 'smiley')

  p.resync('😃 ')

  t.is(p.text, '😃 ')
  t.is(p.position, 0)
  t.alike(p.display, [emojiDisplay(0, 'smiley')])
})

test('resync deleting a multi-unit emoji whose prefix matches the next keeps the next display', function (t) {
  const p = makeParser()

  p.appendText('👍🏽👍 ')
  p.setUnicodeEmoji(0, 4, 'thumbsup_tone3')
  p.setUnicodeEmoji(4, 6, 'thumbsup')

  p.resync('👍 ')

  t.is(p.text, '👍 ')
  t.is(p.position, 0)
  t.alike(p.display, [emojiDisplay(0, 'thumbsup')])
})

test('resync - insert at start', (t) => {
  const p = makeParser({ text: 'world' })

  p.resync('hello world')

  t.is(p.text, 'hello world')
  t.is(p.position, 6)
})

test('resync - insert in the middle', (t) => {
  const p = makeParser({ text: 'hello world' })

  p.resync('hello big world')

  t.is(p.text, 'hello big world')
  t.is(p.position, 10)
})

test('resync - insert at end', (t) => {
  const p = makeParser({ text: 'hello' })

  p.resync('hello world')

  t.is(p.text, 'hello world')
  t.is(p.position, 11)
})

test('resync - delete at start', (t) => {
  const p = makeParser({ text: 'hello world' })

  p.resync('world')

  t.is(p.text, 'world')
  t.is(p.position, 0)
})

test('resync - delete in the middle', (t) => {
  const p = makeParser({ text: 'hello big world' })

  p.resync('hello world')

  t.is(p.text, 'hello world')
  t.is(p.position, 6)
})

test('resync - delete at end', (t) => {
  const p = makeParser({ text: 'hello world' })

  p.resync('hello')

  t.is(p.text, 'hello')
  t.is(p.position, 5)
})

test('resync - replace at start', (t) => {
  const p = makeParser({ text: 'hello world' })

  p.resync('bye world')

  t.is(p.text, 'bye world')
  t.is(p.position, 3)
})

test('resync - replace in the middle', (t) => {
  const p = makeParser({ text: 'hello big world' })

  p.resync('hello small world')

  t.is(p.text, 'hello small world')
  t.is(p.position, 11)
})

test('resync - replace at end', (t) => {
  const p = makeParser({ text: 'hello world' })

  p.resync('hello there')

  t.is(p.text, 'hello there')
  t.is(p.position, 11)
})

test('resync - insert before a display item shifts it', (t) => {
  const p = makeParser({
    text: '@alice and @bob hi',
    display: [mentionDisplay(0, '@alice'), mentionDisplay(11, '@bob')]
  })

  p.resync('Hey @alice and @bob hi')

  t.is(p.position, 4)
  t.alike(p.display, [mentionDisplay(4, '@alice'), mentionDisplay(15, '@bob')])
  t.is(p.text.slice(p.display[0].start, p.display[0].end), '@alice')
  t.is(p.text.slice(p.display[1].start, p.display[1].end), '@bob')
})

test('resync - insert after a display item leaves it alone', (t) => {
  const aliceMention = mentionDisplay(0, '@alice')
  const p = makeParser({ text: '@alice hi', display: [aliceMention] })

  p.resync('@alice hi there')

  t.is(p.position, 15)
  t.alike(p.display, [aliceMention])
})

test('resync - delete before a display item shifts it back', (t) => {
  const p = makeParser({
    text: 'Hey @alice hi',
    display: [mentionDisplay(4, '@alice')]
  })

  p.resync('@alice hi')

  t.is(p.position, 0)
  t.alike(p.display, [mentionDisplay(0, '@alice')])
})

test('resync - editing inside a display item removes it', (t) => {
  const p = makeParser({
    text: '@xlice hi',
    display: [mentionDisplay(0, '@xlice')]
  })

  p.setPosition(4)
  p.resync('@xlce hi')

  t.is(p.text, '@xlce hi')
  t.is(p.position, 3)
  t.alike(p.display, [])
})

test('resync - deleting a display item removes it', (t) => {
  const p = makeParser({
    text: '@alice hi',
    display: [mentionDisplay(0, '@alice')]
  })

  p.resync(' hi')

  t.is(p.text, ' hi')
  t.is(p.position, 0)
  t.alike(p.display, [])
})

test('resync - only items after the edit shift', (t) => {
  const aliceMention = mentionDisplay(0, '@alice')
  const p = makeParser({
    text: '@alice and @bob and @david',
    display: [
      aliceMention,
      mentionDisplay(11, '@bob'),
      mentionDisplay(20, '@david')
    ]
  })

  p.resync('@alice there and @bob and @david')

  t.is(p.position, 13)
  t.alike(p.display, [
    aliceMention,
    mentionDisplay(17, '@bob'),
    mentionDisplay(26, '@david')
  ])
  t.is(p.text.slice(p.display[0].start, p.display[0].end), '@alice')
  t.is(p.text.slice(p.display[1].start, p.display[1].end), '@bob')
  t.is(p.text.slice(p.display[2].start, p.display[2].end), '@david')
})

test('resync - edit spanning two display items removes both', (t) => {
  const p = makeParser({
    text: '@xnna and @bob',
    display: [mentionDisplay(0, '@xnna'), mentionDisplay(10, '@bob')]
  })

  p.selectRange(3, 13)
  p.resync('@xnb')

  t.is(p.text, '@xnb')
  t.is(p.position, 3)
  t.alike(p.display, [])
})

test('resync - from empty text', (t) => {
  const p = makeParser()

  p.resync('hello')

  t.is(p.text, 'hello')
  t.is(p.position, 5)
  t.alike(p.display, [])
})

test('resync - to empty text clears display', (t) => {
  const p = makeParser({
    text: '@alice hi',
    display: [mentionDisplay(0, '@alice')]
  })

  p.resync('')

  t.is(p.text, '')
  t.is(p.position, 0)
  t.alike(p.display, [])
})

test('resync - replacing the whole text clears display', (t) => {
  const p = makeParser({
    text: '@alice hi',
    display: [mentionDisplay(0, '@alice')]
  })

  p.resync('bye')

  t.is(p.text, 'bye')
  t.is(p.position, 3)
  t.alike(p.display, [])
})

test('resync - single character replace at start', (t) => {
  const p = makeParser({ text: 'hello' })

  p.resync('jello')

  t.is(p.text, 'jello')
  t.is(p.position, 1)
})

test('resync - single character replace at start mention', (t) => {
  const p = makeParser({
    text: '@alice hi',
    display: [mentionDisplay(0, '@alice')]
  })

  p.resync('j@alice hi')

  t.is(p.text, 'j@alice hi')
  t.is(p.position, 1)
  t.alike(p.display, [mentionDisplay(1, '@alice')])
})

test('resync - multi-line text', (t) => {
  const p = makeParser({
    text: 'hi\n@alice',
    display: [mentionDisplay(3, '@alice')]
  })

  p.resync('hi there\n@alice')

  t.is(p.position, 8)
  t.alike(p.display, [mentionDisplay(9, '@alice')])
  t.is(p.text.slice(9, 15), '@alice')
})

test('resync - insert immediately after an item leaves it alone', (t) => {
  const aliceMention = mentionDisplay(0, '@xlice')
  const p = makeParser({ text: '@xlice hi', display: [aliceMention] })

  p.resync('@xlice, hi')

  t.is(p.text, '@xlice, hi')
  t.is(p.position, 7)
  t.alike(p.display, [aliceMention])
})

test('resync - delete the character right before an item shifts it back', (t) => {
  const p = makeParser({
    text: 'Hey @alice',
    display: [mentionDisplay(4, '@alice')]
  })

  p.resync('Hey@alice')

  t.is(p.text, 'Hey@alice')
  t.is(p.position, 3)
  t.alike(p.display, [mentionDisplay(3, '@alice')])
})

test('resync - delete the character right after an item leaves it alone', (t) => {
  const p = makeParser({
    text: '@clio hi',
    display: [mentionDisplay(0, '@clio')]
  })

  p.setPosition(6)
  p.resync('@cliohi')

  t.is(p.position, 5)
  t.alike(p.display, [mentionDisplay(0, '@clio')])
})

test('resync - deleting the first character of an item removes it', (t) => {
  const p = makeParser({
    text: '@alice hi',
    display: [mentionDisplay(0, '@alice')]
  })

  p.resync('alice hi')

  t.is(p.text, 'alice hi')
  t.is(p.position, 0)
  t.alike(p.display, [])
})

test('resync - deleting the last character of an item removes it', (t) => {
  const p = makeParser({
    text: '@alice hi',
    display: [mentionDisplay(0, '@alice', 'member-id-a')]
  })

  p.setPosition(1)
  p.resync('@lice hi')

  t.is(p.text, '@lice hi')
  t.is(p.position, 1)
  t.alike(p.display, [])
})

test('resync - replace before an item shifts it by the length difference', (t) => {
  const p = makeParser({
    text: 'Hey @alice',
    display: [mentionDisplay(4, '@alice')]
  })

  p.resync('Yo @alice')

  t.is(p.position, 2)
  t.alike(p.display, [mentionDisplay(3, '@alice')])
})

test('resync - insert between two adjacent items', (t) => {
  const p = makeParser({
    text: '@alice@bob',
    display: [mentionDisplay(0, '@alice'), mentionDisplay(6, '@bob')]
  })

  p.resync('@alice - @bob')

  t.is(p.position, 9)
  t.alike(p.display, [mentionDisplay(0, '@alice'), mentionDisplay(9, '@bob')])
})

test('resync - consecutive edits keep items in sync', (t) => {
  const p = makeParser({
    text: '@alice',
    display: [mentionDisplay(0, '@alice', 'member-id-a')]
  })

  p.setPosition(0)
  p.resync('a @alice')
  t.is(p.position, 2)
  t.alike(p.display, [mentionDisplay(2, '@alice', 'member-id-a')])

  p.resync('ab @alice')
  t.is(p.position, 2)
  t.alike(p.display, [mentionDisplay(3, '@alice', 'member-id-a')])

  p.setPosition(9)
  p.resync('ab @alice!')
  t.is(p.position, 10)
  t.alike(p.display, [mentionDisplay(3, '@alice', 'member-id-a')])
})

test('resync - mixed item types all shift together', (t) => {
  const p = makeParser({
    text: '@alice https://x.io 😀',
    display: [
      mentionDisplay(0, '@alice'),
      linkDisplay(7, 'https://x.io'),
      emojiDisplay(20, '😀')
    ]
  })

  p.resync('ok @alice https://x.io 😀')

  t.is(p.position, 3)
  t.alike(p.display, [
    mentionDisplay(3, '@alice'),
    linkDisplay(10, 'https://x.io'),
    emojiDisplay(23, '😀')
  ])
  for (const d of p.display)
    d.content && t.is(p.text.slice(d.start, d.end), d.content)
})

test('resync insert mention in the middle', function (t) {
  const emojiDisplay = customEmojiDisplay(0, 'smile')

  const p = makeParser({
    text: ':smile:x',
    display: [emojiDisplay]
  })

  p.resync(':smile: @bo x')

  t.is(p.text, ':smile: @bob x')
  t.is(p.position, 12)
  t.alike(p.display, [emojiDisplay, mentionDisplay(8, '@bob', 'member-id-b')])
})

test('resync dispatches words after an emoji that shrinks the text', function (t) {
  const p = makeParser()

  p.resync(':smile: @bo x')

  t.is(p.text, '😄 @bob x')
  t.alike(p.display, [
    emojiDisplay(0, 'smile'),
    mentionDisplay(3, '@bob', 'member-id-b')
  ])
})

test('resync places an insert at the cursor inside a run of identical characters', function (t) {
  const p = makeParser()

  p.resync('aa @bo')
  t.is(p.text, 'aa @bob ')

  p.setPosition(1)
  p.resync('aaa @bob ')

  t.is(p.text, 'aaa @bob ')
  t.is(p.position, 2)
  t.is(p.word, 'aaa')
  t.alike(p.display, [mentionDisplay(4, '@bob', 'member-id-b')])
})

test('resync keeps the cursor on the new line after enter at the end of a line', function (t) {
  const p = makeParser()

  p.resync('a\n@bo')
  t.is(p.text, 'a\n@bob ')

  p.setPosition(1)
  p.resync('a\n\n@bob ')

  t.is(p.text, 'a\n\n@bob ')
  t.is(p.position, 2)
  t.is(p.word, '')
  t.alike(p.display, [mentionDisplay(3, '@bob', 'member-id-b')])
})

test('resync keeps the cursor on the start of a selected range', function (t) {
  const p = makeParser({
    onmention: (mention) => p.setMention(mention, '@bob')
  })

  p.resync('a\n@bo')
  t.is(p.text, 'a\n@bob ')
  t.is(p.position, 7)
  t.alike(p.display, [mentionDisplay(2, '@bob')])

  p.selectRange(0, 2)
  p.resync('@bob ')
  t.is(p.text, '@bob ')
  t.is(p.position, 0)
  t.alike(p.display, [mentionDisplay(0, '@bob')])
})

test('move to position and backspace', function (t) {
  const p = makeParser({ text: 'aaaa' })
  t.is(p.position, 4)
  t.alike(p.display, [])

  p.setPosition(2)
  p.resync('aaa')
  t.is(p.text, 'aaa')
  t.is(p.position, 1)
  t.alike(p.display, [])
})

test('move to position and type', function (t) {
  const p = makeParser({ text: 'aaaa' })
  t.is(p.position, 4)
  t.alike(p.display, [])

  p.setPosition(2)
  p.resync('aaaaa')
  t.is(p.text, 'aaaaa')
  t.is(p.position, 3)
  t.alike(p.display, [])
})

test('move to position and paste', function (t) {
  const p = makeParser({ text: 'aaaa' })
  t.is(p.position, 4)
  t.alike(p.display, [])

  p.setPosition(2)
  p.resync('aaaaaa')
  t.is(p.text, 'aaaaaa')
  t.is(p.position, 4)
  t.alike(p.display, [])
})

test('select range and backspace', function (t) {
  const p = makeParser({ text: 'aaaa' })
  t.is(p.position, 4)
  t.alike(p.display, [])

  p.selectRange(1, 3)
  p.resync('aa')
  t.is(p.text, 'aa')
  t.is(p.position, 1)
  t.alike(p.display, [])
})

test('select range and and type', function (t) {
  const p = makeParser({ text: 'aaaa' })
  t.is(p.position, 4)
  t.alike(p.display, [])

  p.selectRange(1, 3)
  p.resync('aaa')
  t.is(p.text, 'aaa')
  t.is(p.position, 2)
  t.alike(p.display, [])
})

test('move to position and paste shorter length', function (t) {
  const p = makeParser({ text: 'aaaaa' })
  t.is(p.position, 5)
  t.alike(p.display, [])

  p.selectRange(1, 4)
  p.resync('aaaa')
  t.is(p.text, 'aaaa')
  t.is(p.position, 3)
  t.alike(p.display, [])
})

test('move to position and paste same length', function (t) {
  const p = makeParser({ text: 'aaaaa' })
  t.is(p.position, 5)
  t.alike(p.display, [])

  p.selectRange(1, 4)
  p.resync('aaaaa')
  t.is(p.text, 'aaaaa')
  t.is(p.position, 4)
  t.alike(p.display, [])
})

test('move to position and paste greater length', function (t) {
  const p = makeParser({ text: 'aaaaa' })
  t.is(p.position, 5)
  t.alike(p.display, [])

  p.selectRange(1, 4)
  p.resync('aaaaaa')
  t.is(p.text, 'aaaaaa')
  t.is(p.position, 5)
  t.alike(p.display, [])
})

test('backspace one of two identical emoji with a collapsed selection', (t) => {
  const p = makeParser({
    text: '😀😀',
    display: [emojiDisplay(0, 'grinning'), emojiDisplay(2, 'grinning')]
  })

  p.selectRange(2, 2)
  p.resync('😀')
  t.is(p.text, '😀')
  t.is(p.position, 0)
  t.alike(p.display, [emojiDisplay(0, 'grinning')])
})

test('resolving a token elsewhere must not move the caret', (t) => {
  const p = makeParser({ text: 'hi :smi' })
  p.setPosition(0)
  p.resync('ahi :smi')
  t.is(p.position, 1)
})

test('resync dispatches the whole word when completing an emoji', (t) => {
  const p = makeParser({
    text: 'hi :smile',
    onemoji: (emoji) =>
      emoji === ':smile:' && p.setEmoji(emoji, ':smile:', '😄')
  })

  p.resync('hi :smile:')
  t.is(p.text, 'hi 😄')
  t.is(p.position, 5)
  t.alike(p.display, [emojiDisplay(3, 'smile')])
})

test('resync dispatches the joined word after a backspace', (t) => {
  const cleared = []
  const p = makeParser({ text: 'abc def', onclear: (w) => cleared.push(w) })

  p.setPosition(4)
  p.resync('abcdef')
  t.alike(cleared, ['abcdef'])
  t.is(p.position, 3)
  t.is(p.word, 'abcdef')
})

test('resync re-dispatches a mention extended at its end', (t) => {
  const mentions = []
  const p = makeParser({
    text: '@bob',
    onmention: (w) => mentions.push(w)
  })

  p.resync('@bobx')
  t.alike(mentions, ['@bobx'])
  t.is(p.text, '@bobx')
  t.is(p.position, 5)
})

test('resync re-dispatches a link extended at its end', (t) => {
  const p = makeParser()

  p.resync('https://a.co')
  p.resync('https://a.cox')
  t.is(p.text, 'https://a.cox')
  t.is(p.position, 13)
  t.alike(p.display, [linkDisplay(0, 'https://a.cox')])
})

test('resync re-dispatches a mention shortened by a deletion', (t) => {
  const mentions = []
  const p = makeParser({
    text: '@bobby',
    display: [mentionDisplay(0, '@bobby')],
    onmention: (w) => mentions.push(w)
  })

  p.resync('@bob')
  t.alike(mentions, ['@bob'])
  t.is(p.text, '@bob')
  t.is(p.position, 4)
  t.alike(p.display, [])
})

test('resync detects a link revealed by a deletion', (t) => {
  const links = []
  const p = makeParser({ text: 'xhttps://a.co', onlink: (w) => links.push(w) })

  p.setPosition(1)
  p.resync('https://a.co')
  t.is(p.text, 'https://a.co')
  t.is(p.position, 0)
  t.alike(links, ['https://a.co'])
})

test('resync updates the current word after a deletion', (t) => {
  const p = makeParser({ text: 'xhttps://a.co' })

  p.setPosition(1)
  p.resync('https://a.co')
  t.is(p.text, 'https://a.co')
  t.is(p.position, 0)
  t.is(p.word, 'https://a.co')
  t.is(p.start, 0)
  t.is(p.end, 12)
})

test('resync re-dispatches every word of an overlapped mention', (t) => {
  const mentions = []
  const cleared = []
  const p = makeParser({
    text: '@Alice Smith hi',
    display: [mentionDisplay(0, '@Alice Smith')],
    onmention: (w) => mentions.push(w),
    onclear: (w) => cleared.push(w)
  })

  p.setPosition(9)
  p.resync('@Alice Smxith hi')
  t.is(p.text, '@Alice Smxith hi')
  t.is(p.position, 10)
  t.alike(p.display, [])
  t.alike(mentions, ['@Alice'])
  t.alike(cleared, ['Smxith'])
})

test('resync keeps the range in sync when a callback shrinks the text', (t) => {
  const cleared = []
  const p = makeParser({
    text: 'a b',
    onemoji: (w) => p.setEmoji(w, ':smile:', '😄'),
    onclear: (w) => cleared.push(w)
  })

  p.setPosition(1)
  p.resync('a :smile: c d b')
  t.is(p.text, 'a 😄 c d b')
  t.alike(p.display, [emojiDisplay(2, 'smile')])
  t.alike(cleared, ['a', 'c', 'd'])
})

test('resync does not dispatch past the range when a callback grows the text', (t) => {
  const cleared = []
  const p = makeParser({
    text: 'a z',
    onmention: (w) => p.setMention(w, '@bobby'),
    onclear: (w) => cleared.push(w)
  })

  p.setPosition(1)
  p.resync('a @b c z')
  t.is(p.text, 'a @bobby c z')
  t.alike(p.display, [mentionDisplay(2, '@bobby')])
  t.alike(cleared, ['a', 'c'])
})

test('resync dispatches the joined word after a forward delete', (t) => {
  const cleared = []
  const p = makeParser({ text: 'abc def', onclear: (w) => cleared.push(w) })

  p.setPosition(3)
  p.resync('abcdef')
  t.alike(cleared, ['abcdef'])
  t.is(p.position, 3)
  t.is(p.word, 'abcdef')
})

test('resync re-dispatches a word extending a mention display', (t) => {
  const p = makeParser({
    text: '@bob',
    display: [mentionDisplay(0, '@bob', 'member-id')],
    onmention: (w) => p.setMention(w, '@bobx', 'member-id-x')
  })

  p.resync('@bobx')
  t.is(p.text, '@bobx')
  t.is(p.position, 5)
  t.alike(p.display, [mentionDisplay(0, '@bobx', 'member-id-x')])
})

test('resync - typing at the start of a collapsed selection keeps the mention', (t) => {
  const mentions = []
  const p = makeParser({
    text: '@bob hi',
    display: [mentionDisplay(0, '@bob')],
    onmention: (word) => mentions.push(word)
  })

  p.setPosition(0)
  p.resync(' @bob hi')

  t.is(p.position, 1)
  t.alike(p.display, [mentionDisplay(1, '@bob')])
  t.alike(mentions, [])
})

test('resync - deleting the tail of a mention re-dispatches what is left', (t) => {
  const mentions = []
  const p = makeParser({
    text: 'hey @John x',
    display: [mentionDisplay(4, '@John')],
    onmention: (word) => mentions.push(word)
  })

  p.setPosition(9)
  p.resync('hey @Jo x')

  t.alike(p.display, [])
  t.alike(mentions, ['@Jo'])
})
