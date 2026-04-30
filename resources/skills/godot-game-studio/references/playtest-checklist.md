# Godot Playtest Checklist

## Boot & Startup

- [ ] Game launches without errors or warnings
- [ ] Splash screen / logo displays correctly
- [ ] Title screen appears with all options functional
- [ ] Settings persist from previous session
- [ ] First-time setup flow works (if applicable)

## Core Gameplay

- [ ] All player verbs work (move, jump, attack, interact, etc.)
- [ ] Player controls feel responsive (input latency acceptable)
- [ ] Core loop is completable start to finish
- [ ] Win condition triggers correctly
- [ ] Lose condition triggers correctly
- [ ] Game over / restart works without issues
- [ ] Pause and resume work
- [ ] Tutorial / onboarding communicates mechanics clearly

## Scene Management

- [ ] All level transitions work without crashes
- [ ] Loading screens appear for transitions > 1 second
- [ ] No memory leaks between scene changes (monitor object count)
- [ ] Returning to main menu works from any state
- [ ] Scene transitions don't cause audio overlap

## Combat & Damage (if applicable)

- [ ] Damage numbers are correct
- [ ] Health displays update properly
- [ ] Death state triggers correctly for all entities
- [ ] Hit feedback is clear (visual + audio + haptic)
- [ ] Invincibility frames work
- [ ] Projectiles behave correctly
- [ ] AOE effects have correct range
- [ ] Status effects apply and expire properly

## AI & NPCs (if applicable)

- [ ] NPCs navigate without getting stuck
- [ ] Enemy AI responds appropriately to player actions
- [ ] AI doesn't walk through walls or geometry
- [ ] AI state transitions are smooth (no jittering between states)
- [ ] Boss AI phases work correctly
- [ ] NPC dialog triggers properly

## UI / HUD

- [ ] HUD is readable during gameplay
- [ ] HUD doesn't obstruct critical gameplay area
- [ ] All menus are navigable with keyboard/gamepad
- [ ] Text fits within UI containers (no overflow)
- [ ] Health/resource bars update smoothly
- [ ] Inventory UI works correctly
- [ ] Dialog system displays and advances properly
- [ ] Notification system works

## Save / Load

- [ ] Save creates a valid file
- [ ] Load restores the correct game state
- [ ] Save works at any valid save point
- [ ] Corrupt save file doesn't crash the game
- [ ] Multiple save slots work independently
- [ ] Auto-save triggers at appropriate times
- [ ] Save file size is reasonable

## Audio

- [ ] Music plays and loops correctly
- [ ] Music crossfades between areas/states
- [ ] SFX play for all player actions
- [ ] SFX play for all enemy actions
- [ ] UI sounds play for button presses
- [ ] Volume settings work for all channels
- [ ] No audio clipping or distortion
- [ ] Spatial audio (2D/3D) works correctly
- [ ] Audio stops appropriately on scene change

## Input

- [ ] Keyboard controls work
- [ ] Gamepad controls work
- [ ] Mouse controls work (if applicable)
- [ ] Touch controls work (if targeting mobile)
- [ ] Input rebinding works
- [ ] Input works correctly after scene transitions
- [ ] Multiple simultaneous inputs handled correctly
- [ ] Controller disconnect/reconnect handled gracefully

## Performance

- [ ] Stable FPS during normal gameplay
- [ ] No hitches during common actions (attacks, transitions)
- [ ] Memory stays stable over extended play
- [ ] No excessive draw calls
- [ ] Loading times are acceptable
- [ ] No frame drops during particle effects
- [ ] Large enemy counts don't tank FPS

## Visual Quality

- [ ] No visual artifacts or glitches
- [ ] Animations play correctly and blend smoothly
- [ ] Particle effects render properly
- [ ] Lighting is consistent and appropriate
- [ ] No Z-fighting on overlapping surfaces
- [ ] Camera behavior is smooth and predictable
- [ ] Screen shake / effects are not overwhelming

## Edge Cases

- [ ] Rapid input doesn't break game state
- [ ] Pausing during transitions doesn't crash
- [ ] Resizing window doesn't break layout
- [ ] Minimizing and restoring works
- [ ] Alt-tab and return works
- [ ] Game handles focus loss gracefully
- [ ] Simultaneous events don't conflict

## Platform-Specific

### Desktop
- [ ] Windowed mode works
- [ ] Fullscreen mode works
- [ ] Resolution changes apply correctly
- [ ] Multi-monitor behavior is acceptable

### Mobile (if applicable)
- [ ] Touch targets are large enough (44px minimum)
- [ ] Orientation changes handled
- [ ] Safe area / notch accounted for
- [ ] Battery usage is reasonable

### Web (if applicable)
- [ ] Loads in major browsers (Chrome, Firefox, Safari)
- [ ] Audio starts correctly (browser autoplay policy)
- [ ] Input capture works
- [ ] Performance is acceptable in browser
