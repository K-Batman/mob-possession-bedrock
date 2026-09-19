# Mob Possession (Bedrock)

A Bedrock add-on version of Kaius Cole's Mob Possession mod. Right-click a
mob to possess it, sneak to get out - same idea as the Java/Fabric version,
built completely differently because Bedrock has no Java, no mixins, and no
bytecode injection. Add-ons are JSON (behavior packs) plus a JavaScript/
TypeScript API (`@minecraft/server`).

## How it actually works

Java's version needed mixins to fake vanilla riding physics onto arbitrary
mobs. Bedrock doesn't need that trick - it already ships the exact building
block for free: `minecraft:behavior.player_ride_tamed`, the same AI goal
that makes a saddled horse obey WASD. It's not horse-specific; any mob can
use it.

So this whole mod is mostly **data**, not code:

- `behavior_pack/entities/chicken.json` is the *real* vanilla chicken
  definition (copied from Mojang's official `bedrock-samples` repo,
  v1.26.50.4) with one addition: a `mobpossession:possessed` component
  group that adds a player-ridable `minecraft:rideable`,
  `minecraft:input_ground_controlled`, and
  `minecraft:behavior.player_ride_tamed`.
- `behavior_pack/scripts/main.js` just decides *when* to switch that group
  on and off, by triggering the `mobpossession:enter_possession` /
  `..exit_possession` entity events defined in the same JSON file.

Movement, camera, gravity, collision - all vanilla, for free, because as far
as the engine is concerned you really are just riding a very cooperative
chicken.

## Known limitations (v0.1 - genuinely untested)

I don't have a way to launch Minecraft Bedrock in the environment I built
this in, so unlike the Java version (which I could actually compile and
verify against the real game jar), **this hasn't been run yet.** The JSON
is copied from Mojang's real vanilla files and the script type-checks
clean against the real `@minecraft/server` v2.10.0 API types, but the first
real test is you, in-game.

Specific things I expect might need fixing once you try it:

- **Only chickens are wired up.** Adding another mob means copying its real
  vanilla entity file from Mojang's `bedrock-samples` repo into `entities/`
  and adding the same `mobpossession:possessed` group - there's no single
  switch that applies to every mob at once, the way the Java mixin did.
- **Possible double-click to mount.** The script reacts to an *after*-
  interact event, so the very first right-click just grants the ability to
  be ridden - you might need to click the chicken again right after to
  actually mount it. If that's annoying, tell me and we'll try the
  before-event instead.
- **Exiting relies on vanilla's own sneak-to-dismount** - the script
  doesn't force it, just watches for it and hands the chicken's AI back
  afterward. Should just work, but worth confirming.
- No flight, no special abilities, no aquatic air-bar yet - those were the
  fun parts of the Java version and would need their own Bedrock-specific
  approach (probably fine for ground mobs, likely much harder or impossible
  for Wither-style abilities since those are hardcoded, not scriptable).

## Trying it

1. Zip the contents of `behavior_pack/` (not the folder itself) into a
   `.mcpack`, or point Minecraft's "Import" at the folder directly.
2. Add it to a world, and turn on **Beta APIs** in that world's experiments
   (required for the Script API to run).
3. Right-click a chicken with an empty hand.

## Credits

Vanilla `chicken.json` is Mojang's, from the official
[bedrock-samples](https://github.com/Mojang/bedrock-samples) repository,
used here as the base for the possession component group, per Mojang's
add-on development terms.
