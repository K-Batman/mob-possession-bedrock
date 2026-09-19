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
 *   minecraft:input_ground_controlled, minecraft:behavior.player_ride_tamed,
 *   and minecraft:is_tamed (player_ride_tamed appears to require it - see
 *   Mojang's own docs, which describe it as "after being tamed").
 * - items/mob_possession_orb.json is a plain custom item - hold it and
 *   right-click a mob to possess it, instead of needing an empty hand.
 * - This script just decides *when* to turn the possessed component group
 *   on and off, by triggering the "mobpossession:enter_possession" /
 *   "..exit_possession" entity events defined in that same JSON file.
 *
 * Movement, camera, gravity, collision: all vanilla, for free, same as
 * riding a horse - because as far as the engine is concerned, that's
 * exactly what's happening (assuming player_ride_tamed actually works
 * the way its name suggests - still unconfirmed as of v0.1).
 *
 * Get the item in-game with: /give @s mobpossession:orb
 *
 * Known limitation for v0.1: only chickens are wired up as a proof of
 * concept. Adding another mob means copying its real vanilla entity file
 * into entities/ and adding the same "mobpossession:possessed" group -
 * there's no single switch that applies to every mob at once the way the
 * Java mixin does.
 */

world.sendMessage("[Mob Possession] script loaded.");

// mobId -> playerId, so we know whose ride to watch and whose mob to hand back.
const possessions = new Map();

world.afterEvents.playerInteractWithEntity.subscribe((event) => {
	try {
		const { player, target, itemStack } = event;

		world.sendMessage(
			`[Mob Possession] interact seen: item=${itemStack?.typeId ?? "(empty hand)"} target=${target.typeId}`
		);

		if (itemStack?.typeId !== "mobpossession:orb") return; // needs the orb in hand
		if (target.typeId !== "minecraft:chicken") return; // only chickens for now

		const riding = player.getComponent(EntityComponentTypes.Riding);
		if (riding !== undefined) return; // already riding/possessing something

		if (possessions.has(target.id)) {
			player.onScreenDisplay.setActionBar(`Someone else is already possessing that.`);
			return;
		}

		target.triggerEvent("mobpossession:enter_possession");
		possessions.set(target.id, player.id);

		world.sendMessage(`[Mob Possession] triggered enter_possession on ${target.typeId}`);

		player.onScreenDisplay.setActionBar(
			`You are now controlling the chicken! Sneak to get out.`
		);
	} catch (error) {
		world.sendMessage(`[Mob Possession] ERROR in interact handler: ${error}`);
	}
});

// Vanilla already lets you dismount by sneaking - we don't have to make that
// happen ourselves. We just watch for it happening and clean up afterward.
system.runInterval(() => {
	try {
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
	} catch (error) {
		world.sendMessage(`[Mob Possession] ERROR in tick loop: ${error}`);
	}
}, 4);
