---
"multipasta": patch
---

accept characters above U+00FF in content-disposition parameter values, so browser-serialized UTF-8 filenames (emoji, CJK, U+202F in macOS screenshot names) parse as file parts instead of degrading to nameless fields
