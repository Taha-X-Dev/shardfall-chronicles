const pool = require("../utils/pgClient");

const getLeaderboard = async (limit = 10) => {
  const safeLimit = Math.min(Math.max(limit, 1), 100);
  const { rows } = await pool.query(
    "SELECT id, name, level, experience, health, mana FROM players ORDER BY level DESC, experience DESC, id ASC LIMIT $1;",
    [safeLimit],
  );
  return rows;
};

const getPlayerById = async (playerId) => {
  const { rows } = await pool.query(
    "SELECT id, name, level, experience, health, mana, coins, created_at FROM players WHERE id = $1;",
    [playerId],
  );
  return rows[0] || null;
};

const getPlayerInventory = async (playerId) => {
  const { rows } = await pool.query(
    "SELECT id, item_id, quantity FROM player_items WHERE player_id = $1 ORDER BY id ASC;",
    [playerId],
  );
  return rows;
};

const getPlayerQuestSummary = async (playerId) => {
  const { rows } = await pool.query(
    "SELECT id, quest_id, status_id, started_at, completed_at FROM player_quests WHERE player_id = $1 ORDER BY id ASC;",
    [playerId],
  );
  return rows;
};

const getPlayerBattleStats = async (playerId) => {
  const { rows } = await pool.query(
    "SELECT id, result, experience_gained, battle_time FROM battles WHERE player_id = $1 ORDER BY battle_time DESC NULLS LAST, id DESC;",
    [playerId],
  );
  return rows;
};

const getShopInventory = async (shopId) => {
  const { rows } = await pool.query(
    "SELECT id, item_id, price FROM shop_items WHERE shop_id = $1 ORDER BY id ASC;",
    [shopId],
  );
  return rows;
};

module.exports = {
  getLeaderboard,
  getPlayerById,
  getPlayerInventory,
  getPlayerQuestSummary,
  getPlayerBattleStats,
  getShopInventory,
};
