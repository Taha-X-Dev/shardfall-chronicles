export type Boss = {
  id: number;
  name: string;
  title: string;
  realm: string;
  mechanic: string;
  reward: string;
};

export type HeroClass = {
  id: string;
  name: string;
  style: string;
};

export type WorldMap = {
  id: string;
  name: string;
  vibe: string;
  challenge: string;
  objective: string;
};

export const gameName = "Shardfall Chronicles";

export const gameIntro =
  "The Sky Prism shattered, and seven shards poisoned the realm with storms, plague, and shadow. You are the last Warden who can bind the shards and seal the Void Gate before the world collapses.";

export const bosses: Boss[] = [
  {
    id: 1,
    name: "Varkun",
    title: "The Hollow Fang",
    realm: "Ember Caverns",
    mechanic: "Rage phases and flame shockwaves",
    reward: "Crimson Shard",
  },
  {
    id: 2,
    name: "Mirelith",
    title: "Queen of Thorns",
    realm: "Weeping Wilds",
    mechanic: "Poison bloom zones and root traps",
    reward: "Verdant Shard",
  },
  {
    id: 3,
    name: "Dread Admiral Kael",
    title: "The Tempest Tyrant",
    realm: "Stormwreck Coast",
    mechanic: "Lightning chains and cannon barrages",
    reward: "Azure Shard",
  },
  {
    id: 4,
    name: "Nythra",
    title: "The Veil Seer",
    realm: "Mirror Spire",
    mechanic: "Illusion clones and fear pulse",
    reward: "Umbral Shard",
  },
  {
    id: 5,
    name: "Azhur Prime",
    title: "World Eater",
    realm: "Obsidian Crown",
    mechanic: "Void rifts and arena collapse",
    reward: "Core Shard",
  },
];

export const classes: HeroClass[] = [
  {
    id: "warden",
    name: "Warden",
    style: "Balanced sword and shield fighter",
  },
  {
    id: "arcanist",
    name: "Arcanist",
    style: "High mana caster with burst spells",
  },
  {
    id: "ranger",
    name: "Ranger",
    style: "Mobile striker with precision shots",
  },
];

export const worldMaps: WorldMap[] = [
  {
    id: "ember_caverns",
    name: "Ember Caverns",
    vibe: "Volcanic tunnels, lava glow, scorched stone.",
    challenge: "High enemy pressure and close-range fights.",
    objective: "Push into the furnace gate and clear all elites.",
  },
  {
    id: "weeping_wilds",
    name: "Weeping Wilds",
    vibe: "Foggy forests, corrupted ponds, thorn roots.",
    challenge: "Wide map with ambush routes and flanking mobs.",
    objective: "Cleanse the wild core and hold the shrine.",
  },
  {
    id: "stormwreck_coast",
    name: "Stormwreck Coast",
    vibe: "Cold shoreline, dark water, lightning sky.",
    challenge: "Medium pressure with visibility disruption.",
    objective: "Secure the lighthouse path and break the storm sigil.",
  },
  {
    id: "mirror_spire",
    name: "Mirror Spire",
    vibe: "Arcane ruins, reflective crystal ground.",
    challenge: "Hard elites with stronger scaling defense.",
    objective: "Reach the spire chamber and seal the echo rift.",
  },
];
