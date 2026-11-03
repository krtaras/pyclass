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
  /** EN: Lists, Tuples, and Sets (Corey Schafer) */
  lists: "https://www.youtube.com/watch?v=W8KRzm-HUcc",
  /** EN: Functions (Corey Schafer) */
  functions: "https://www.youtube.com/watch?v=9Os0o3wzS_I",
  /** EN: How To Use Functions (CS Dojo) */
  functionsCs: "https://www.youtube.com/watch?v=NSbOtYzIQI0",
  /** EN: Dictionaries (Corey Schafer) */
  dicts: "https://www.youtube.com/watch?v=daefaLgNkw0",
  /** EN: Try/Except (Corey Schafer) */
  exceptions: "https://www.youtube.com/watch?v=NIWwJbo-9_8",
  /** EN: Comments in Python (The Bad Tutorials) */
  comments: "https://www.youtube.com/watch?v=Uu7C99-hG60",
} as const;
