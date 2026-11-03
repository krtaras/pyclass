/**
 * Only URLs that passed YouTube oEmbed at authoring time.
 * Re-verify with: curl -G --data-urlencode "url=..." https://www.youtube.com/oembed
 */
export const V = {
  /** UA: Знайомство з мовою програмування Python */
  uaIntro: "https://www.youtube.com/watch?v=XBbIkZK388U",
  /** EN: Python for Beginners - Learn Coding with Python in 1 Hour (Mosh) */
  moshHour: "https://www.youtube.com/watch?v=kqtD5dpn9C8",
  /** EN: Strings - Working with Textual Data (Corey Schafer) */
  strings: "https://www.youtube.com/watch?v=k9TUPpGqYTo",
  /** EN: Integers and Floats (Corey Schafer) */
  numbers: "https://www.youtube.com/watch?v=khKv-8q7YmY",
  /** EN: Conditionals and Booleans (Corey Schafer) */
  conditionals: "https://www.youtube.com/watch?v=DZwmZ8Usvnk",
  /** EN: How to Use If Else Statements (CS Dojo) */
  ifelse: "https://www.youtube.com/watch?v=AWek49wXGzI",
  /** EN: Loops and Iterations - For/While (Corey Schafer) */
  loops: "https://www.youtube.com/watch?v=6iF8Xb7Z3wQ",
  /** EN: Learn Python for loops in 5 minutes */
  forLoops: "https://www.youtube.com/watch?v=KWgYha0clzw",
} as const;
