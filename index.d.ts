declare namespace RawTextDisplayParser {
  /** Values of `DISPLAY_TYPES` in `utils.js` */
  interface DisplayTypes {
    readonly MENTION: 1
    readonly HTTP_LINK: 2
    readonly PEAR_LINK: 3
    readonly BOLD: 4
    readonly ITALIC: 5
    readonly CODE: 6
    readonly EMOJI: 7
    readonly CODE_BLOCK: 8
    readonly STRIKE_THROUGH: 9
    readonly TRANSLATION: 10
    readonly ORDERED_LIST_ITEM: 11
    readonly UNORDERED_LIST_ITEM: 12
  }

  type DisplayType = DisplayTypes[keyof DisplayTypes]

  type ListItemType =
    DisplayTypes['UNORDERED_LIST_ITEM'] | DisplayTypes['ORDERED_LIST_ITEM']

  interface Display {
    type: DisplayType
    start: number
    end: number
    length: number
    content?: string
    /** type: DisplayTypes['MENTION'] only */
    memberId?: string
    /** type: DisplayTypes['ORDERED_LIST_ITEM'] only */
    index?: number
  }

  interface Range {
    start: number
    end: number
  }

  interface Options {
    /** Initial text, defaults to `''` */
    text?: string
    /** Initial displays, defaults to `[]` */
    display?: Display[]
    /** Scheme matched by `onpearlink`, defaults to `'pear'` */
    protocol?: string
    /** Fired when the current word starts with `@` */
    onmention?: (word: string) => void
    /** Fired when the current word starts with `http://`, `https://` or `www.` */
    onlink?: (word: string) => void
    /** Fired when the current word starts with `<protocol>://` */
    onpearlink?: (word: string) => void
    /** Fired when the current word starts with `:` */
    onemoji?: (word: string) => void
    /** Fired when the current word contains a unicode emoji */
    ondefaultemoji?: (emoji: string) => void
    /** Fired when the current word matches nothing else */
    onclear?: (word: string) => void
    /** Fired when a line starts with `- ` or `<n>. `; `index` is only set for ordered lists */
    onlist?: (
      start: number,
      end: number,
      type: ListItemType,
      index?: number
    ) => void
  }

  interface ResultData {
    text: string
    display: Display[]
  }
}

declare class RawTextDisplayParser {
  constructor(options?: RawTextDisplayParser.Options)

  text: string
  display: RawTextDisplayParser.Display[]
  protocol: string
  /** Cursor offset in `text` */
  position: number
  /** Current selection, `null` when collapsed */
  range: RawTextDisplayParser.Range | null
  /** Word under the cursor */
  word: string
  /** Start offset of `word` */
  start: number
  /** End offset of `word` */
  end: number

  onmention: RawTextDisplayParser.Options['onmention']
  onlink: RawTextDisplayParser.Options['onlink']
  onpearlink: RawTextDisplayParser.Options['onpearlink']
  onemoji: RawTextDisplayParser.Options['onemoji']
  ondefaultemoji: RawTextDisplayParser.Options['ondefaultemoji']
  onclear: RawTextDisplayParser.Options['onclear']
  onlist: RawTextDisplayParser.Options['onlist']

  /** Replace text and displays, moving the cursor to the end */
  reset(options?: Partial<RawTextDisplayParser.ResultData>): void
  /** Move the cursor and collapse the selection */
  setPosition(position: number): void
  /** Select `[start, end)` and move the cursor to `start` */
  selectRange(start: number, end: number): void
  /** Delete the selection, or the character before the cursor */
  backspace(): void
  /** Insert `text` at the cursor, replacing the selection if any */
  appendText(text: string): void
  /**
   * Sync the parser with the host's full text after an edit made outside the parser.
   * Diffs against the current text, shifts displays and re-dispatches affected words.
   */
  resync(text: string): void
  /**
   * Returns the text and displays. If `text` differs from the parser's text the
   * displays are dropped.
   */
  flush(text?: string): RawTextDisplayParser.ResultData

  /**
   * Mark the current word as an emoji. Returns `false` if `input` is not the current word.
   * - custom emoji: `setEmoji(':party:', ':party:')`
   * - unicode emoji from a shortcode: `setEmoji(':smile:', ':smile:', '😄')`
   * - unicode emoji typed directly: `setEmoji('😄', 'smile', '😄', true)`
   */
  setEmoji(
    input: string,
    code: string,
    emoji?: string,
    isDefaultEmoji?: boolean
  ): boolean
  /** Mark `[start, end)` as the unicode emoji `shortcode` without dispatching */
  setUnicodeEmoji(start: number, end: number, shortcode: string): boolean
  /** Mark the current word as a mention, replacing it with `name` when they differ */
  setMention(input: string, name: string, memberId: string): boolean
  /** Mark the current word as an http link */
  setLink(input: string, link: string): boolean
  /** Mark the current word as a `<protocol>://` link */
  setPearLink(link: string): boolean
  /** Replace `[start, end)` with the list marker and mark it; `index` is required for ordered lists */
  setList(
    start: number,
    end: number,
    type: RawTextDisplayParser.ListItemType,
    index?: number
  ): boolean
  isPearLink(word: string): boolean
}

export = RawTextDisplayParser
