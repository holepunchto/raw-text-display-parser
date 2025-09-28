const Parser = require('..')

let calledWith = null
const p = new Parser({
  onmention: (word) => (calledWith = word)
})

p.appendText('00 @user')
console.assert(
  calledWith === '@user',
  '❌ onmention should be called with "@user"'
)
// Apply 1st mention
p.setMention('@user', '@user1 name end', '001')
console.assert(
  p.text === '00 @user1 name end',
  `❌ p.text should be "@user1 name end", got "${p.text}"`
)
console.assert(
  JSON.stringify(p.display) ===
    JSON.stringify([
      {
        type: 'mention',
        start: 3,
        end: 18,
        content: '@user1 name end',
        id: '001'
      }
    ]),
  '❌ display should have one mention entry and match'
)
console.assert(
  p.text.slice(p.display[0].start, p.display[0].end) === '@user1 name end',
  '❌ mention range should match text "@user1 name end"'
)

p.appendText(' 111 @user2')
// Apply 2nd mention
p.setMention('@user2', '@user2 nameee end', '002')
console.assert(
  p.text === '00 @user1 name end 111 @user2 nameee end',
  `❌ p.text should be "00 @user1 name end 111 @user2 nameee end", got "${p.text}"`
)
console.assert(
  JSON.stringify(p.display) ===
    JSON.stringify([
      {
        type: 'mention',
        start: 3,
        end: 18,
        content: '@user1 name end',
        id: '001'
      },
      {
        type: 'mention',
        start: 23,
        end: 40,
        content: '@user2 nameee end',
        id: '002'
      }
    ]),
  '❌ display should have two mention entries and match'
)
console.assert(
  p.text.slice(p.display[1].start, p.display[1].end) === '@user2 nameee end',
  '❌ mention range should match text "@user2 nameee end"'
)

p.setPosition(7)
p.backspace()
p.backspace()

console.assert(
  p.text === '00 @ur1 name end 111 @user2 nameee end',
  `❌ p.text should be "00 @ur1 name end 111 @user2 nameee end", got "${p.text}"`
)
console.assert(
  JSON.stringify(p.display) ===
    JSON.stringify([
      {
        type: 'mention',
        start: 21,
        end: 38,
        content: '@user2 nameee end',
        id: '002'
      }
    ]),
  '❌ display should have one mention entry and match'
)
console.assert(
  p.text.slice(p.display[0].start, p.display[0].end) === '@user2 nameee end',
  '❌ mention range should match text "@user2 nameee end"'
)

p.setPosition(7)
p.backspace()
p.backspace()
// Reapply 1st mention
p.setMention('@u', '@user1 name end', '001')
console.assert(
  p.text === '00 @user1 name end name end 111 @user2 nameee end',
  `❌ p.text should be "00 @user1 name end name end 111 @user2 nameee end", got "${p.text}"`
)
console.assert(
  JSON.stringify(p.display) ===
    JSON.stringify([
      {
        type: 'mention',
        start: 3,
        end: 18,
        content: '@user1 name end',
        id: '001'
      },
      {
        type: 'mention',
        start: 32,
        end: 49,
        content: '@user2 nameee end',
        id: '002'
      }
    ]),
  '❌ display should have two mention entries and match'
)
console.assert(
  p.text.slice(p.display[0].start, p.display[0].end) === '@user1 name end',
  '❌ mention range should match text "@user1 name end"'
)
console.assert(
  p.text.slice(p.display[1].start, p.display[1].end) === '@user2 nameee end',
  '❌ mention range should match text "@user2 nameee end"'
)

console.log('✅ testMention passed')
