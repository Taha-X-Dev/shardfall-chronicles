const pool = require("../utils/pgClient");

const toInt = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const getPlayerById = async (playerId, client) => {
  const queryClient = client || pool;
  const { rows } = await queryClient.query(
    "SELECT id, name, level, experience, health, mana, coins FROM players WHERE id = $1;",
    [playerId],
  );
  return rows[0] || null;
};

const getEnemyById = async (enemyId) => {
  const { rows } = await pool.query(
    "SELECT id, name, level, health, attack FROM enemies WHERE id = $1;",
    [enemyId],
  );
  return rows[0] || null;
};

const getBossById = async (bossId) => {
  const { rows } = await pool.query(
    "SELECT id, name, level, health, attack FROM bosses WHERE id = $1;",
    [bossId],
  );
  return rows[0] || null;
};

const computeLevel = (currentLevel, currentExp, gainedExp) => {
  let level = Number(currentLevel) || 1;
  const expValue = Number(currentExp) || 0;
  const gainedValue = Number(gainedExp) || 0;
  let experience = expValue + gainedValue;
  let leveledUp = false;

  const step = 5;
  while (experience >= step) {
    experience -= step;
    level += 1;
    leveledUp = true;
  }

  return { level, experience, leveledUp };
};

const simulateBattle = ({ player, enemy, boss }) => {
  const opponent = boss || enemy;
  const opponentLabel = boss ? "boss" : "enemy";

  const playerScore =
    Number(player.level) + Number(player.experience) + Number(player.mana);
  const opponentScore = Number(opponent.level) + Number(opponent.attack);

  const win = playerScore >= opponentScore;
  const baseExp = boss ? 70 : 40;
  const baseCoins = boss ? 70 : 40;
  const gainedExp = win ? baseExp : 0;
  const gainedCoins = win ? baseCoins : 0;

  const damage = win
    ? Math.floor(Math.random() * 5)
    : Math.floor(Math.random() * 12) + 3;
  const nextHealth = Math.max(0, (player.health || 0) - damage);

  return {
    result: win ? "win" : "loss",
    opponentLabel,
    opponentName: opponent.name,
    gainedExp,
    gainedCoins,
    damage,
    nextHealth,
  };
};

const recordBattle = async ({
  playerId,
  enemyId,
  bossId,
  result,
  gainedExp,
  battleTime,
  client,
}) => {
  const queryClient = client || pool;
  const { rows } = await queryClient.query(
    "INSERT INTO battles (player_id, enemy_id, boss_id, result, experience_gained, battle_time) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *;",
    [playerId, enemyId || null, bossId || null, result, gainedExp, battleTime],
  );
  return rows[0];
};
  

const updatePlayerAfterBattle = async ({
  playerId,
  nextHealth,
  nextLevel,
  nextExperience,
  nextCoins,
  client,
}) => {
  const queryClient = client || pool;
  const { rows } = await queryClient.query(
    "UPDATE players SET health = $1, level = $2, experience = $3, coins = $4 WHERE id = $5 RETURNING *;",
    [nextHealth, nextLevel, nextExperience, nextCoins, playerId],
  );
  return rows[0] || null;
};

const getQuestById = async (questId, client) => {
  const queryClient = client || pool;
  const { rows } = await queryClient.query(
    "SELECT id, title, reward_experience, reward_item_id FROM quests WHERE id = $1;",
    [questId],
  );
  return rows[0] || null;
};

const ensureCompletedStatus = async (client) => {
  const { rows } = await client.query(
    "SELECT id FROM statuses WHERE LOWER(name) = 'completed' LIMIT 1;",
  );

  if (rows[0]) return rows[0].id;

  const inserted = await client.query(
    "INSERT INTO statuses (name, description) VALUES ('completed', 'Quest completed') RETURNING id;",
  );
  return inserted.rows[0].id;
};

const upsertPlayerQuest = async ({
  playerId,
  questId,
  statusId,
  now,
  client,
}) => {
  const { rows } = await client.query(
    "SELECT id FROM player_quests WHERE player_id = $1 AND quest_id = $2 LIMIT 1;",
    [playerId, questId],
  );

  if (rows[0]) {
    const updated = await client.query(
      "UPDATE player_quests SET status_id = $1, completed_at = $2 WHERE id = $3 RETURNING *;",
      [statusId, now, rows[0].id],
    );
    return updated.rows[0];
  }

  const inserted = await client.query(
    "INSERT INTO player_quests (player_id, quest_id, status_id, started_at, completed_at) VALUES ($1, $2, $3, $4, $5) RETURNING *;",
    [playerId, questId, statusId, now, now],
  );
  return inserted.rows[0];
};

const grantQuestRewards = async ({ playerId, quest, client }) => {
  const updates = {
    experienceGained: Number(quest.reward_experience) || 0,
    itemGranted: null,
  };

  if (quest.reward_item_id) {
    const existing = await client.query(
      "SELECT id, quantity FROM player_items WHERE player_id = $1 AND item_id = $2 LIMIT 1;",
      [playerId, quest.reward_item_id],
    );

    if (existing.rows[0]) {
      const nextQuantity = (existing.rows[0].quantity || 0) + 1;
      const updated = await client.query(
        "UPDATE player_items SET quantity = $1 WHERE id = $2 RETURNING *;",
        [nextQuantity, existing.rows[0].id],
      );
      updates.itemGranted = updated.rows[0];
    } else {
      const inserted = await client.query(
        "INSERT INTO player_items (player_id, item_id, quantity) VALUES ($1, $2, $3) RETURNING *;",
        [playerId, quest.reward_item_id, 1],
      );
      updates.itemGranted = inserted.rows[0];
    }
  }

  if (updates.experienceGained > 0) {
    const player = await getPlayerById(playerId, client);
    const levelInfo = computeLevel(
      Number(player.level) || 1,
      Number(player.experience) || 0,
      updates.experienceGained,
    );

    await client.query(
      "UPDATE players SET level = $1, experience = $2 WHERE id = $3;",
      [levelInfo.level, levelInfo.experience, playerId],
    );
    updates.levelInfo = levelInfo;
  }

  return updates;
};

module.exports = {
  toInt,
  getPlayerById,
  getEnemyById,
  getBossById,
  computeLevel,
  simulateBattle,
  recordBattle,
  updatePlayerAfterBattle,
  getQuestById,
  ensureCompletedStatus,
  upsertPlayerQuest,
  grantQuestRewards,
};
