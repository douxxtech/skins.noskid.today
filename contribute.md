# Contributing to Certificate Skins

Thanks for wanting to make this thing better! Here's how you can help out.

## Ways to contribute

### Creating new skins

This is probably the easiest way to contribute. Just make cool SVG designs!

**What you need:**
- Any SVG editor (Inkscape, Illustrator, even a text editor if you're hardcore)
- Basic understanding of SVG
- Creativity

**Steps:**
1. Create an SVG file with your design
2. Use these placeholders where you want dynamic content:
   - `{{USER}}` - The username
   - `{{CERTNB}}` - Certificate number (just the number, no formatting)
   - `{{PERCENT}}` - Score percentage (just the number, no % sign)
   - `{{DATE}}` - Creation date (YYYY-MM-DD format)
3. Make a PNG preview of your skin (same filename, different extension)
4. Put both files in their respective folders (`/skins/` for SVG, `/preview/` for PNG)

**Example SVG snippet:**
```svg
<text x="100" y="50">Certificate #{{CERTNB}}</text>
<text x="100" y="80">Awarded to {{USER}}</text>
<text x="100" y="110">Score: {{PERCENT}}%</text>
<text x="100" y="140">Date: {{DATE}}</text>
```

**Tips:**
- Keep it readable - people actually want to show these off
- Test with different username lengths (short vs long names)
- Make sure text doesn't overflow or look weird
- Preview PNG should be around 800x600px or similar
- SVG should be scalable and look good at different sizes

### 🐛 Bug fixes

Found something broken? Cool, fix it and send a PR.

**Common issues to look out for:**
- File upload edge cases
- SVG parsing problems
- PNG generation failures
- API response handling
- Frontend responsive issues

### 💡 Feature ideas

Got ideas? Open an issue first to discuss it. Some things we might want:

- Better skin preview system
- Better error handling
- Performance improvements

### 📝 Documentation

This README and other docs can always be better. Fix typos, add examples, make things clearer.

## Development setup

```bash
git clone https://github.com/douxxtech/skins.noskid.today
cd skins.noskid.today
sudo apt install librsvg2-bin  # if you're on ubuntu/debian
php -S 0.0.0.0:80
```

## File structure

```
/
├── skins/
│   ├── index.php          # Skins list API
│   ├── skin1.svg          # Skin templates
│   └── skin2.svg
└── preview/
    ├── skin1.png          # Preview images
    └── skin2.png
```

## Skin requirements

- **SVG file**: Must be valid SVG with placeholder variables
- **PNG preview**: Same filename as SVG but .png extension
- **Both files**: Need to exist for the skin to show up in the interface
- **Readable**: Don't make text too small or use weird fonts
- **Professional-ish**: Keep it somewhat clean, this isn't DeviantArt

## Testing your skins

1. Add your SVG to `/skins/` folder
2. Add preview PNG to `/preview/` folder  
3. Refresh the site - it should appear in the skin list
4. Test with different certificate data
5. Make sure the generated PNG looks good

## Code style

We're not super strict but:
- Keep PHP code readable
- Use proper error handling
- Don't break existing functionality
- Test your changes

## Submitting changes

1. Fork the repo
2. Make your changes
3. Test everything works
4. Create a pull request
5. Describe what you changed and why

## What we won't accept

- Broken skins that don't work
- Inappropriate content (racism, slurs, etc)
- Code that breaks existing functionality
- Huge changes without prior discussion

## Questions?

Open an issue or check the main [noskid.today](https://github.com/douxxtech/noskid.today) repo.
