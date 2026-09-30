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

test('resync link list', function (t) {
  let counter = 0
  const p = new Parser({
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
    {
      type: DISPLAY_TYPES.HTTP_LINK,
      start: 0,
      end: 12,
      content: link1,
      length: link1.length
    },
    {
      type: DISPLAY_TYPES.HTTP_LINK,
      start: 13,
      end: 25,
      content: link2,
      length: link2.length
    },
    {
      type: DISPLAY_TYPES.HTTP_LINK,
      start: 26,
      end: 38,
      content: link3,
      length: link3.length
    }
  ])
})

test('resync mention at the start, before another mentioned', function (t) {
  const p = new Parser({
    onmention: (mention) => p.setMention(mention, '@alice', 'member-id-a')
  })

  p.resync('@a')
  t.is(p.text, '@alice ')
  t.is(p.position, 7)
  t.alike(p.display, [
    {
      type: DISPLAY_TYPES.MENTION,
      start: 0,
      end: 6,
      memberId: 'member-id-a',
      length: 6
    }
  ])

  p.resync('@a @alice ')
  t.is(p.text, '@alice  @alice ')
  t.is(p.position, 7)
  t.alike(p.display, [
    {
      type: DISPLAY_TYPES.MENTION,
      start: 0,
      end: 6,
      memberId: 'member-id-a',
      length: 6
    },
    {
      type: DISPLAY_TYPES.MENTION,
      start: 8,
      end: 14,
      memberId: 'member-id-a',
      length: 6
    }
  ])
})

test('resync: repeated character keeps the cursor at the end', function (t) {
  const p = new Parser()

  p.resync('aa')
  t.is(p.text, 'aa')
  t.is(p.position, 2)

  p.resync('aaa')
  t.is(p.text, 'aaa')
  t.is(p.position, 3)
})

test('resync test remove mention', function (t) {
  const firstMentionDisplay = {
    type: DISPLAY_TYPES.MENTION,
    start: 0,
    end: 4,
    length: 4,
    memberId: 'member-id-0'
  }
  const secondMentionDisplay = {
    type: DISPLAY_TYPES.MENTION,
    start: 5,
    end: 9,
    length: 4,
    memberId: 'member-id-0'
  }

  const p = new Parser({
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
  const p = new Parser({
    onmention(mention) {
      p.setMention(mention, '@bob', 'member-id-0')
    }
  })

  p.resync('@b')
  t.is(p.text, '@bob ')
  t.is(p.position, 5)
  t.alike(p.display, [
    {
      type: DISPLAY_TYPES.MENTION,
      start: 0,
      end: 4,
      length: 4,
      memberId: 'member-id-0'
    }
  ])

  p.resync('x @bob ')
  t.is(p.text, 'x @bob ')
  t.is(p.position, 2)
  t.alike(p.display, [
    {
      type: DISPLAY_TYPES.MENTION,
      start: 2,
      end: 6,
      length: 4,
      memberId: 'member-id-0'
    }
  ])
})

test('resync test middle modification', function (t) {
  const p = new Parser()

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
  const p = new Parser()

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
  const firstEmojiDisplay = {
    type: DISPLAY_TYPES.EMOJI,
    start: 2,
    end: 4,
    content: 'grinning',
    length: 2
  }

  const secondEmojiDisplay = {
    type: DISPLAY_TYPES.EMOJI,
    start: 5,
    end: 7,
    content: 'grinning',
    length: 2
  }

  const p = new Parser({
    ondefaultemoji: (word) => {
      p.setEmoji(word, 'grinning', word, true)
    }
  })

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
  const p = new Parser({
    ondefaultemoji: (word) => {
      if (word.length > 2) return
      p.setEmoji(word, 'grinning', word, true)
    }
  })

  p.resync('😀😀 ')
  t.is(p.text, '😀😀 ')
  t.alike(p.display, [])

  p.resync('😀 ')
  t.is(p.text, '😀 ')
  t.is(p.position, 2)
  t.alike(p.display, [
    {
      type: DISPLAY_TYPES.EMOJI,
      start: 0,
      end: 2,
      content: 'grinning',
      length: 2
    }
  ])
})

test('resync: manual pick 2 emojis, then manual delete 1st one using backspace', function (t) {
  const emoji = (start, content) => ({
    type: DISPLAY_TYPES.EMOJI,
    start,
    end: start + 2,
    content,
    length: 2
  })

  const p = new Parser({
    ondefaultemoji: (word) => {
      if (word === '😀') p.setEmoji(word, 'grinning', word, true)
      if (word === '🚀') p.setEmoji(word, 'rocket', word, true)
      if (word === '😃') p.setEmoji(word, 'smiley', word, true)
    }
  })

  p.resync('😀')
  t.is(p.text, '😀 ')
  t.is(p.position, 3)
  t.alike(p.display, [emoji(0, 'grinning')])

  p.resync('😀 🚀')
  t.is(p.text, '😀 🚀 ')
  t.is(p.position, 6)
  t.alike(p.display, [emoji(0, 'grinning'), emoji(3, 'rocket')])

  p.resync('😀 🚀 😃')
  t.is(p.text, '😀 🚀 😃 ')
  t.is(p.position, 9)
  t.alike(p.display, [
    emoji(0, 'grinning'),
    emoji(3, 'rocket'),
    emoji(6, 'smiley')
  ])

  // remove 3 extra spaces that auto-added by parser
  p.backspace()
  p.setPosition(6)
  p.backspace()
  p.setPosition(3)
  p.backspace()
  t.is(p.text, '😀🚀😃')
  t.alike(p.display, [
    emoji(0, 'grinning'),
    emoji(2, 'rocket'),
    emoji(4, 'smiley')
  ])

  // remove 1st emoji
  p.setPosition(2)
  p.backspace()
  t.is(p.text, '🚀😃')
  t.is(p.position, 0)
  t.alike(p.display, [emoji(0, 'rocket'), emoji(2, 'smiley')])
})

test('resync: manual pick 2 emojis, then manual delete 1st one using resync', function (t) {
  const emoji = (start, content) => ({
    type: DISPLAY_TYPES.EMOJI,
    start,
    end: start + 2,
    content,
    length: 2
  })

  const p = new Parser({
    ondefaultemoji: (word) => {
      if (word === '😀') p.setEmoji(word, 'grinning', word, true)
      if (word === '🚀') p.setEmoji(word, 'rocket', word, true)
      if (word === '😃') p.setEmoji(word, 'smiley', word, true)
    }
  })

  p.resync('😀')
  t.is(p.text, '😀 ')
  t.is(p.position, 3)
  t.alike(p.display, [emoji(0, 'grinning')])

  p.resync('😀 🚀')
  t.is(p.text, '😀 🚀 ')
  t.is(p.position, 6)
  t.alike(p.display, [emoji(0, 'grinning'), emoji(3, 'rocket')])

  p.resync('😀 🚀 😃')
  t.is(p.text, '😀 🚀 😃 ')
  t.is(p.position, 9)
  t.alike(p.display, [
    emoji(0, 'grinning'),
    emoji(3, 'rocket'),
    emoji(6, 'smiley')
  ])

  // remove 3 extra spaces that auto-added by parser
  p.backspace()
  p.setPosition(6)
  p.backspace()
  p.setPosition(3)
  p.backspace()
  t.is(p.text, '😀🚀😃')
  t.alike(p.display, [
    emoji(0, 'grinning'),
    emoji(2, 'rocket'),
    emoji(4, 'smiley')
  ])

  // remove 1st emoji by resync
  p.resync('🚀😃')
  t.is(p.text, '🚀😃')
  t.is(p.position, 0)
  t.alike(p.display, [emoji(0, 'rocket'), emoji(2, 'smiley')])
})

test('resync deleting one of two identical adjacent emojis keeps one display', function (t) {
  const p = new Parser()

  p.appendText('😀😀 ')
  p.setUnicodeEmoji(0, 2, 'grinning')
  p.setUnicodeEmoji(2, 4, 'grinning')

  p.resync('😀 ')

  t.is(p.text, '😀 ')
  t.is(p.position, 2)
  t.alike(p.display, [
    {
      type: DISPLAY_TYPES.EMOJI,
      start: 0,
      end: 2,
      content: 'grinning',
      length: 2
    }
  ])
})

test('resync typing a repeated character keeps the cursor after it', function (t) {
  const p = new Parser()

  p.appendText('aa')
  p.resync('aaa')

  t.is(p.text, 'aaa')
  t.is(p.position, 3)
})

test('resync deleting an emoji that shares a surrogate with the next keeps the next display', function (t) {
  const p = new Parser()

  p.appendText('😀😃 ')
  p.setUnicodeEmoji(0, 2, 'grinning')
  p.setUnicodeEmoji(2, 4, 'smiley')

  p.resync('😃 ')

  t.is(p.text, '😃 ')
  t.is(p.position, 0)
  t.alike(p.display, [
    {
      type: DISPLAY_TYPES.EMOJI,
      start: 0,
      end: 2,
      content: 'smiley',
      length: 2
    }
  ])
})

test('resync deleting a multi-unit emoji whose prefix matches the next keeps the next display', function (t) {
  const p = new Parser()

  p.appendText('👍🏽👍 ')
  p.setUnicodeEmoji(0, 4, 'thumbsup_tone3')
  p.setUnicodeEmoji(4, 6, 'thumbsup')

  p.resync('👍 ')

  t.is(p.text, '👍 ')
  t.is(p.position, 0)
  t.alike(p.display, [
    {
      type: DISPLAY_TYPES.EMOJI,
      start: 0,
      end: 2,
      content: 'thumbsup',
      length: 2
    }
  ])
})

test('resync - insert at start', (t) => {
  const p = new Parser({ text: 'world' })

  p.resync('hello world')

  t.is(p.text, 'hello world')
  t.is(p.position, 6)
})

test('resync - insert in the middle', (t) => {
  const p = new Parser({ text: 'hello world' })

  p.resync('hello big world')

  t.is(p.text, 'hello big world')
  t.is(p.position, 10)
})

test('resync - insert at end', (t) => {
  const p = new Parser({ text: 'hello' })

  p.resync('hello world')

  t.is(p.text, 'hello world')
  t.is(p.position, 11)
})

test('resync - delete at start', (t) => {
  const p = new Parser({ text: 'hello world' })

  p.resync('world')

  t.is(p.text, 'world')
  t.is(p.position, 0)
})

test('resync - delete in the middle', (t) => {
  const p = new Parser({ text: 'hello big world' })

  p.resync('hello world')

  t.is(p.text, 'hello world')
  t.is(p.position, 6)
})

test('resync - delete at end', (t) => {
  const p = new Parser({ text: 'hello world' })

  p.resync('hello')

  t.is(p.text, 'hello')
  t.is(p.position, 5)
})

test('resync - replace at start', (t) => {
  const p = new Parser({ text: 'hello world' })

  p.resync('bye world')

  t.is(p.text, 'bye world')
  t.is(p.position, 3)
})

test('resync - replace in the middle', (t) => {
  const p = new Parser({ text: 'hello big world' })

  p.resync('hello small world')

  t.is(p.text, 'hello small world')
  t.is(p.position, 11)
})

test('resync - replace at end', (t) => {
  const p = new Parser({ text: 'hello world' })

  p.resync('hello there')

  t.is(p.text, 'hello there')
  t.is(p.position, 11)
})

const mention = (start, content) => ({
  start,
  end: start + content.length,
  type: DISPLAY_TYPES.MENTION,
  content
})

test('resync - insert before a display item shifts it', (t) => {
  const p = new Parser({
    text: '@alice and @bob hi',
    display: [mention(0, '@alice'), mention(11, '@bob')]
  })

  p.resync('Hey @alice and @bob hi')

  t.is(p.position, 4)
  t.alike(p.display, [mention(4, '@alice'), mention(15, '@bob')])
  t.is(p.text.slice(p.display[0].start, p.display[0].end), '@alice')
  t.is(p.text.slice(p.display[1].start, p.display[1].end), '@bob')
})

test('resync - insert after a display item leaves it alone', (t) => {
  const aliceMention = mention(0, '@alice')
  const p = new Parser({ text: '@alice hi', display: [aliceMention] })

  p.resync('@alice hi there')

  t.is(p.position, 15)
  t.alike(p.display, [aliceMention])
})

test('resync - delete before a display item shifts it back', (t) => {
  const p = new Parser({
    text: 'Hey @alice hi',
    display: [mention(4, '@alice')]
  })

  p.resync('@alice hi')

  t.is(p.position, 0)
  t.alike(p.display, [mention(0, '@alice')])
})

test('resync - editing inside a display item removes it', (t) => {
  const p = new Parser({ text: '@alice hi', display: [mention(0, '@alice')] })

  p.resync('@alce hi')

  t.is(p.text, '@alce hi')
  t.is(p.position, 3)
  t.alike(p.display, [])
})

test('resync - deleting a display item removes it', (t) => {
  const p = new Parser({ text: '@alice hi', display: [mention(0, '@alice')] })

  p.resync(' hi')

  t.is(p.text, ' hi')
  t.is(p.position, 0)
  t.alike(p.display, [])
})

test('resync - only items after the edit shift', (t) => {
  const aliceMention = mention(0, '@alice')
  const p = new Parser({
    text: '@alice and @bob and @david',
    display: [aliceMention, mention(11, '@bob'), mention(20, '@david')]
  })

  p.resync('@alice there and @bob and @david')

  t.is(p.position, 13)
  t.alike(p.display, [aliceMention, mention(17, '@bob'), mention(26, '@david')])
  t.is(p.text.slice(p.display[0].start, p.display[0].end), '@alice')
  t.is(p.text.slice(p.display[1].start, p.display[1].end), '@bob')
  t.is(p.text.slice(p.display[2].start, p.display[2].end), '@david')
})

test('resync - edit spanning two display items removes both', (t) => {
  const p = new Parser({
    text: '@alice and @bob',
    display: [mention(0, '@alice'), mention(11, '@bob')]
  })

  p.resync('@alob')

  t.is(p.text, '@alob')
  t.is(p.position, 3)
  t.alike(p.display, [])
})

test('resync - from empty text', (t) => {
  const p = new Parser()

  p.resync('hello')

  t.is(p.text, 'hello')
  t.is(p.position, 5)
  t.alike(p.display, [])
})

test('resync - to empty text clears display', (t) => {
  const p = new Parser({ text: '@alice hi', display: [mention(0, '@alice')] })

  p.resync('')

  t.is(p.text, '')
  t.is(p.position, 0)
  t.alike(p.display, [])
})

test('resync - replacing the whole text clears display', (t) => {
  const p = new Parser({ text: '@alice hi', display: [mention(0, '@alice')] })

  p.resync('bye')

  t.is(p.text, 'bye')
  t.is(p.position, 3)
  t.alike(p.display, [])
})

test('resync - single character replace at start', (t) => {
  const p = new Parser({ text: 'hello' })

  p.resync('jello')

  t.is(p.text, 'jello')
  t.is(p.position, 1)
})

test('resync - single character replace at start mention', (t) => {
  const p = new Parser({ text: '@alice hi', display: [mention(0, '@alice')] })

  p.resync('j@alice hi')

  t.is(p.text, 'j@alice hi')
  t.is(p.position, 1)
  t.alike(p.display, [mention(1, '@alice')])
})

test('resync - multi-line text', (t) => {
  const p = new Parser({ text: 'hi\n@alice', display: [mention(3, '@alice')] })

  p.resync('hi there\n@alice')

  t.is(p.position, 8)
  t.alike(p.display, [mention(9, '@alice')])
  t.is(p.text.slice(9, 15), '@alice')
})

test('resync - insert immediately after an item leaves it alone', (t) => {
  const aliceMention = mention(0, '@alice')
  const p = new Parser({ text: '@alice hi', display: [aliceMention] })

  p.resync('@alice, hi')

  t.is(p.text, '@alice, hi')
  t.is(p.position, 7)
  t.alike(p.display, [aliceMention])
})

test('resync - delete the character right before an item shifts it back', (t) => {
  const p = new Parser({ text: 'Hey @alice', display: [mention(4, '@alice')] })

  p.resync('Hey@alice')

  t.is(p.text, 'Hey@alice')
  t.is(p.position, 3)
  t.alike(p.display, [mention(3, '@alice')])
})

test('resync - delete the character right after an item leaves it alone', (t) => {
  const p = new Parser({ text: '@alice hi', display: [mention(0, '@alice')] })

  p.resync('@alicehi')

  t.is(p.position, 6)
  t.alike(p.display, [mention(0, '@alice')])
})

test('resync - deleting the first character of an item removes it', (t) => {
  const p = new Parser({ text: '@alice hi', display: [mention(0, '@alice')] })

  p.resync('alice hi')

  t.is(p.text, 'alice hi')
  t.is(p.position, 0)
  t.alike(p.display, [])
})

test('resync - deleting the last character of an item removes it', (t) => {
  const p = new Parser({ text: '@alice hi', display: [mention(0, '@alice')] })

  p.resync('@alic hi')

  t.is(p.text, '@alic hi')
  t.is(p.position, 5)
  t.alike(p.display, [])
})

test('resync - replace before an item shifts it by the length difference', (t) => {
  const p = new Parser({ text: 'Hey @alice', display: [mention(4, '@alice')] })

  p.resync('Yo @alice')

  t.is(p.position, 2)
  t.alike(p.display, [mention(3, '@alice')])
})

test('resync - insert between two adjacent items', (t) => {
  const p = new Parser({
    text: '@alice@bob',
    display: [mention(0, '@alice'), mention(6, '@bob')]
  })

  p.resync('@alice - @bob')

  t.is(p.position, 9)
  t.alike(p.display, [mention(0, '@alice'), mention(9, '@bob')])
})

test('resync - consecutive edits keep items in sync', (t) => {
  const p = new Parser({ text: '@alice', display: [mention(0, '@alice')] })

  p.resync('a @alice')
  t.is(p.position, 2)
  t.alike(p.display, [mention(2, '@alice')])

  p.resync('ab @alice')
  t.is(p.position, 2)
  t.alike(p.display, [mention(3, '@alice')])

  p.resync('ab @alice!')
  t.is(p.position, 10)
  t.alike(p.display, [mention(3, '@alice')])
})

test('resync - mixed item types all shift together', (t) => {
  const p = new Parser({
    text: '@alice https://x.io 😀',
    display: [
      mention(0, '@alice'),
      {
        start: 7,
        end: 19,
        type: DISPLAY_TYPES.HTTP_LINK,
        content: 'https://x.io',
        length: 12
      },
      {
        start: 20,
        end: 22,
        type: DISPLAY_TYPES.EMOJI,
        content: '😀',
        length: 2
      }
    ]
  })

  p.resync('ok @alice https://x.io 😀')

  t.is(p.position, 3)
  t.alike(p.display, [
    mention(3, '@alice'),
    {
      start: 10,
      end: 22,
      type: DISPLAY_TYPES.HTTP_LINK,
      content: 'https://x.io',
      length: 12
    },
    {
      start: 23,
      end: 25,
      type: DISPLAY_TYPES.EMOJI,
      content: '😀',
      length: 2
    }
  ])
  for (const d of p.display) t.is(p.text.slice(d.start, d.end), d.content)
})
