# Backpack Image Setup Instructions

## File Placement

Create a folder called `backpacks` inside the `public/assets/` directory:

```
public/
  assets/
    backpacks/    <- Create this folder
```

## Image File Names

Place your backpack images in the `public/assets/backpacks/` folder with the following names:

1. **small_backpack.png** - Image 01 (Small Backpack - 10 slots) - Starting backpack
2. **medium_backpack.png** - Image 02 (Medium Backpack - 20 slots)
3. **large_backpack.png** - Image 03 (Large Backpack - 30 slots)
4. **hiking_backpack.png** - Image 04 (Hiking Backpack - 50 slots)
5. **nike_backpack.png** - Image 05 (Nike Backpack - 100 slots)

## File Structure Example

```
public/
  assets/
    backpacks/
      small_backpack.png     (01 - Small Backpack)
      medium_backpack.png    (02 - Medium Backpack)
      large_backpack.png     (03 - Large Backpack)
      hiking_backpack.png    (04 - Hiking Backpack)
      nike_backpack.png      (05 - Nike Backpack)
```

## How It Works

- All players start with the **Small Backpack** (Level 1) which has **10 slots**
- The backpack image and name are displayed in the top-left of the Backpack Modal
- The backpack level determines how many inventory slots the player has
- Backpack upgrades can be implemented by changing the player's `backpackLevel` property (1-5)

## Backpack Levels

| Level | Name            | Slots | Image File             |
|-------|-----------------|-------|------------------------|
| 1     | Small Backpack  | 10    | small_backpack.png     |
| 2     | Medium Backpack | 20    | medium_backpack.png    |
| 3     | Large Backpack  | 30    | large_backpack.png     |
| 4     | Hiking Backpack | 50    | hiking_backpack.png    |
| 5     | Nike Backpack   | 100   | nike_backpack.png      |

## Implementation Notes

- The game automatically syncs `backpackSize` with the `backpackLevel`
- When a player loads the game, their backpack size is set based on their backpack level
- The backpack image appears in the modal header at 64x64 pixels
- The backpack name appears below the "Backpack" title

## Future Enhancement Ideas

You can implement backpack upgrades by:
1. Adding backpack upgrade items to treasures
2. Creating a shop where players can buy better backpacks with coins
3. Rewarding backpack upgrades when reaching certain player levels
4. Making backpacks purchasable in the admin console

To upgrade a player's backpack programmatically:
```typescript
newPlayer.backpackLevel = 2; // Upgrades to Medium Backpack
newPlayer.backpackSize = BACKPACK_LEVELS[2].slots; // Sets size to 20
```
