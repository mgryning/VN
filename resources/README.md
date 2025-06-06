# Resources Directory

This directory contains assets for the visual novel engine.

## Structure

```
resources/
├── backgrounds/     # Background images for locations
└── characters/      # Character sprite images
```

## Background Images

Place background images in the `backgrounds/` folder. The engine will automatically detect and load them based on the location name used in your script.

### Supported Format
- `.png` (all background images must be PNG format)

### Naming Convention

For a location named `beach` in your script:
```
LOC: beach
```

The engine will look for PNG images in this order:
1. `resources/backgrounds/beach.png`
2. `resources/backgrounds/beach.png` (lowercase)
3. `resources/backgrounds/beach.png` (dash format)
4. `resources/backgrounds/beach.png` (space format)

### Alternative Names

The engine also tries these variations:
- **Lowercase**: `beach` → `beach.png`
- **Dash format**: `forest_clearing` → `forest-clearing.png`
- **Space format**: `forest_clearing` → `forest clearing.png`

### Examples

| Script Location | Image Files (any of these work) |
|----------------|--------------------------------|
| `LOC: beach` | `beach.png` |
| `LOC: forest_clearing` | `forest_clearing.png`, `forest-clearing.png`, `forest clearing.png` |
| `LOC: Castle_Hall` | `castle_hall.png`, `castle-hall.png` |

### Fallback

If no image is found, the engine automatically falls back to a gradient background based on the location name.

### Console Logging

When running in development mode, the engine logs:
- ✅ `Loaded background image: resources/backgrounds/beach.png`
- ⚠️ `No background PNG found for 'location_name', using gradient fallback`

## Adding Images

1. Place your background images in `resources/backgrounds/`
2. Name them to match your script locations
3. Run your visual novel - images will be automatically detected and loaded

## Image Guidelines

- **Resolution**: 1920x1080 (16:9) recommended for best quality
- **File size**: Keep under 2MB for good performance
- **Format**: PNG only (supports transparency)
- **Aspect ratio**: The engine will automatically scale images to fit while maintaining aspect ratio

## Character Images

Place character sprite images in the `characters/` folder. The engine will automatically detect and load them based on the character name and mood used in your script.

### Supported Format
- `.png` (all character images must be PNG format)

### Naming Convention

For a character named `ava` with mood `happy` in your script:
```
CHA: ava/happy
```

The engine will look for PNG images in this order:
1. `resources/characters/ava_happy.png`
2. `resources/characters/ava_happy.png` (lowercase)
3. `resources/characters/ava.png` (fallback without mood)

### Examples

| Script Character | Image Files (priority order) |
|-----------------|------------------------------|
| `CHA: ava/happy` | `ava_happy.png`, `ava_Happy.png`, `ava.png` |
| `CHA: Ava/content` | `Ava_content.png`, `ava_content.png`, `Ava.png`, `ava.png` |
| `CHA: alice/surprised` | `alice_surprised.png`, `alice.png` |

### Fallback

If no character image is found, the engine automatically falls back to a colored placeholder based on the character name and mood.

### Console Logging

When running in development mode, the engine logs:
- ✅ `Loaded character image: resources/characters/ava_happy.png`
- ⚠️ `No character PNG found for 'ava/happy', using placeholder`

## Adding Character Images

1. Place your character sprites in `resources/characters/`
2. Name them using the format: `charactername_mood.png`
3. Run your visual novel - images will be automatically detected and loaded

## Character Image Guidelines

- **Resolution**: 400-800px width recommended for good quality
- **File size**: Keep under 1MB for good performance
- **Format**: PNG only (supports transparency for character cutouts)
- **Transparency**: Use transparent backgrounds for character sprites
- **Aspect ratio**: Portrait orientation works best (taller than wide)