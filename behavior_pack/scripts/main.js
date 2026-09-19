import { world, system, EntityComponentTypes, Player } from "@minecraft/server";

/**
 * Mob Possession (Bedrock)
 *
 * The Java version of this mod uses mixins to make vanilla's own riding
 * physics drive any mob. Bedrock has no mixins - but it turns out Bedrock
 * already ships the exact building block we need, built in: the
 * "minecraft:behavior.player_ride_tamed" goal, the same one that makes a
 * saddled horse obey WASD. Any mob can use it, not just horses.
 *
 * So the whole trick here is data, not code:
 * - entities/chicken.json defines a "mobpossession:possessed" component
 *   group that adds minecraft:rideable (now allowing a player rider),
 *   minecraft:input_ground_controlled, and minecraft:behavior.player_ride_tamed.
 * - This script just decides *when* to turn that group on and off, by
 *   triggering the "mobpossession:enter_possession" / "..exit_possession"
 *   entity events defined in that same file.
 *
 * Movement, camera, gravity, collision: all vanilla, for free, same as
 * riding a horse - because as far as the engine is concerned, that's
 * exactly what's happening.
 *
 * Known limitation for v0.1: only chickens are wired up as a proof of
 * concept. Adding another mob means copying its real vanilla entity file
 * into entities/ and adding the same "mobpossession:possessed" group -
 * there's no single switch that applies to every mob at once the way the
 * Java mixin does.
 *
 * Known rough edge: possessing is triggered from an *after*-interact event,
 * so the very first right-click just grants the mob the ability to be
 * ridden - you may need to click it again right after to actually mount.
 * Worth revisiting once this has been tested for real.
 */

// mobId -> playerId, so we know whose ride to watch and whose mob to hand back.
const possessions = new Map();

world.afterEvents.playerInteractWithEntity.subscribe((event) => {
	const { player, target, itemStack } = event;

	if (itemStack !== undefined) return; // holding something - let normal interaction happen
	if (target.typeId !== "minecraft:chicken") return; // only chickens for now

	const riding = player.getComponent(EntityComponentTypes.Riding);
	if (riding !== undefined) return; // already riding/possessing something

	if (possessions.has(target.id)) return; // someone already possessing this one

	target.triggerEvent("mobpossession:enter_possession");
	possessions.set(target.id, player.id);

	player.onScreenDisplay.setActionBar(
		`You are now controlling the chicken! Sneak to get out.`
	);
});

// Vanilla already lets you dismount by sneaking - we don't have to make that
// happen ourselves. We just watch for it happening and clean up afterward.
system.runInterval(() => {
	for (const [mobId, playerId] of possessions) {
		const player = world.getEntity(playerId);
		if (!(player instanceof Player)) {
			possessions.delete(mobId);
			continue;
		}

		const riding = player.getComponent(EntityComponentTypes.Riding);
		const stillPossessing = riding !== undefined && riding.entityRidingOn?.id === mobId;
		if (stillPossessing) continue;

		possessions.delete(mobId);

		const mob = world.getEntity(mobId);
		if (mob !== undefined) {
			mob.triggerEvent("mobpossession:exit_possession");
		}

		player.onScreenDisplay.setActionBar(`You let go of the mob.`);
	}
}, 4);
