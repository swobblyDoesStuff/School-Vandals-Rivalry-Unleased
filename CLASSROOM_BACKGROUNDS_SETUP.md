# CLASSROOM BACKGROUND SETUP

The game is now ready for your custom classroom background images!

## What to Do

1. **Copy your 20 classroom background images** to:
   ```
   c:\Users\swobb\Downloads\school-vandals_-rivalry-unleashed (2)\public\assets\classrooms\
   ```

2. **Rename them exactly** as follows (numbered 1-20 for classroom levels):
   - `Classroom1.png`
   - `Classroom2.png`
   - `Classroom3.png`
   - ... continuing through...
   - `Classroom20.png`

## Image Specifications

- **Size**: 800×400 pixels (perfect!)
- **Format**: PNG
- **Transparency**: Optional (background image fills entire area)

## How It Works

- Each classroom level (1-20) displays its corresponding background
- If you have more than 20 classrooms, it cycles: classroom 21 uses Classroom1.png, etc.
- The background displays behind the classroom title and desks
- Falls back to a default gradient if any image is missing or fails to load
- Hot reload: Changes appear instantly in the browser (no restart needed)

## File Structure

```
public/assets/
├── desks/
│   └── Desk.png
├── weapons/
│   ├── Crayon.png
│   └── ... (15 weapons + Locked.png)
├── tags/
│   ├── Tag1.png through Tag20.png
└── classrooms/
    ├── Classroom1.png
    ├── Classroom2.png
    ├── ... through...
    └── Classroom20.png
```

Once you've copied the files, refresh the browser and navigate to any classroom to see your custom backgrounds!
