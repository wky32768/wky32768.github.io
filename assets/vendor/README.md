# Local fonts and icons

These assets are served locally so page layout and icons do not depend on a
visitor reaching Google Fonts or cdnjs. Chinese text uses the site's existing
system font fallbacks.

- `fonts.css` and `fonts/`: Playfair Display (400, 600, 700) and Source Sans 3
  (400, 500, 600), obtained from the Google Fonts CSS API. Font-display is swap.
- `fontawesome/`: Font Awesome Free 6.4.0, obtained from cdnjs. The original CSS
  attribution is retained. Only WOFF2 font files are bundled; unused TTF fallback
  URLs were removed from the stylesheet.
- `Playfair-Display-OFL.txt`, `Source-Sans-3-OFL.txt`, and
  `Font-Awesome-LICENSE.txt` contain the corresponding license texts.
- `pinyin-pro.js` is the existing KTV search dependency.

Sources:

- https://fonts.google.com/specimen/Playfair+Display
- https://fonts.google.com/specimen/Source+Sans+3
- https://cdnjs.com/libraries/font-awesome/6.4.0
- https://github.com/FortAwesome/Font-Awesome/tree/6.4.0
