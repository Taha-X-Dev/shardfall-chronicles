const {
  authMiddleware,
  requireAdmin,
  requireSelfOrAdmin,
} = require("../middleware/authMiddleware");
const errorChecker = require("../utils/errorChecker");
const pool = require("../utils/pgClient");
const { createHttpError } = require("../utils/commonUtils");
const {
  getPlayerIdOrRespond,
  getBattleTargetsOrRespond,
  getQuestCompletePayloadOrRespond,
} = require("../utils/commonUtils");
const {
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
} = require("../services/gameplayService");

const withTransaction = async (fn) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

const fetchPlayerItem = async (client, playerId, itemId) => {
  const { rows } = await client.query(
    "SELECT id, quantity FROM player_items WHERE player_id = $1 AND item_id = $2 LIMIT 1;",
    [playerId, itemId],
  );
  return rows[0] || null;
};

const adjustPlayerItem = async (client, itemRow, delta) => {
  const currentQty = Number(itemRow.quantity) || 0;
  const nextQty = currentQty + delta;
  if (nextQty <= 0) {
    await client.query("DELETE FROM player_items WHERE id = $1;", [itemRow.id]);
    return null;
  }

  const { rows } = await client.query(
    "UPDATE player_items SET quantity = $1 WHERE id = $2 RETURNING *;",
    [nextQty, itemRow.id],
  );
  return rows[0] || null;
};

const upsertPlayerItem = async (
  client,
  playerId,
  itemId,
  quantity,
  shopId,
  insertQuantity,
) => {
  const existing = await fetchPlayerItem(client, playerId, itemId);
  if (existing) {
    return adjustPlayerItem(client, existing, quantity);
  }

  const { rows } = await client.query(
    "INSERT INTO player_items (player_id, item_id, quantity, shop_id) VALUES ($1, $2, $3, $4) RETURNING *;",
    [playerId, itemId, insertQuantity ?? quantity, shopId || null],
  );
  return rows[0] || null;
};

const updatePlayerCoins = async (client, playerId, nextCoins) => {
  await client.query("UPDATE players SET coins = $1 WHERE id = $2;", [
    nextCoins,
    playerId,
  ]);
};

const registerGameplayRoutes = (app, basePath = "/game") => {
  app.post(`${basePath}/players/:id/battle`, async (req, res) => {
    try {
      const playerId = getPlayerIdOrRespond(req);
      const targets = getBattleTargetsOrRespond(req);
      const { enemyId, bossId } = targets;

      const player = await getPlayerById(playerId);

      const enemy = enemyId ? await getEnemyById(enemyId) : null;
      const boss = bossId ? await getBossById(bossId) : null;

      const battleOutcome = simulateBattle({ player, enemy, boss });
      const levelInfo = computeLevel(
        player.level || 1,
        player.experience || 0,
        battleOutcome.gainedExp,
      );
      const nextCoins =
        (Number(player.coins) || 0) + (Number(battleOutcome.gainedCoins) || 0);

      const battleTime = new Date();
      const result = await withTransaction(async (client) => {
        const battle = await recordBattle({
          playerId,
          enemyId,
          bossId,
          result: battleOutcome.result,
          gainedExp: battleOutcome.gainedExp,
          battleTime,
          client,
        });

        const updatedPlayer = await updatePlayerAfterBattle({
          playerId,
          nextHealth: battleOutcome.nextHealth,
          nextLevel: levelInfo.level,
          nextExperience: levelInfo.experience,
          nextCoins,
          client,
        });

        return { battle, updatedPlayer };
      });

      return res.json({
        message: "Battle resolved.",
        outcome: battleOutcome,
        levelInfo,
        coins: { gained: battleOutcome.gainedCoins, total: nextCoins },
        battle: result.battle,
        player: result.updatedPlayer,
      });
    } catch (err) {
      errorChecker(err, res);
    }
  });



  app.post(
    `${basePath}/quests/:id/complete`,
    authMiddleware,
    requireSelfOrAdmin((req) => req.body?.player_id),
    async (req, res) => {
      try {
        const payload = getQuestCompletePayloadOrRespond(req);
        const { questId, playerId } = payload;

        const player = await getPlayerById(playerId);

        const result = await withTransaction(async (client) => {
          const quest = await getQuestById(questId, client);

          const completedStatusId = await ensureCompletedStatus(client);
          const now = new Date();

          const questProgress = await upsertPlayerQuest({
            playerId,
            questId,
            statusId: completedStatusId,
            now,
            client,
          });

          const rewards = await grantQuestRewards({
            playerId,
            quest,
            client,
          });

          return { quest, questProgress, rewards };
        });



        return res.json({
          message: "Quest completed.",
          quest: { id: result.quest.id, title: result.quest.title },
          questProgress: result.questProgress,
          rewards: result.rewards,
        });
      } catch (err) {
        errorChecker(err, res);
      }
    },
  );

  app.delete(
    `${basePath}/battles/:id`,
    authMiddleware,
    requireAdmin,
    async (req, res) => {
      try {
        const battleId = req.params.id;

        const { rowCount } = await pool.query(
          "DELETE FROM battles WHERE id = $1;",
          [battleId],
        );

        return res.json({
          message: "Battle deleted.",
          deleted: rowCount,
        });
      } catch (err) {
        errorChecker(err, res);
      }
    },
  );

  app.put(
    `${basePath}/battles/:id`,
    authMiddleware,
    requireAdmin,
    async (req, res) => {
      try {
        const battleId = req.params.id;

        const { result, experience_gained } = req.body || {};

        const { rows } = await pool.query(
          "UPDATE battles SET result = $1, experience_gained = $2 WHERE id = $3 RETURNING *;",
          [result, experience_gained, battleId],
        );

        return res.json({ message: "Battle updated.", battle: rows[0] });
      } catch (err) {
        errorChecker(err, res);
      }
    },
  );

  app.post(
    `${basePath}/shops/:id/purchase`,
    authMiddleware,
    requireSelfOrAdmin((req) => req.body?.player_id),
    async (req, res) => {
      try {
        const shopId = req.params.id;
        const playerId = req.body?.player_id;
        const itemId = req.body?.item_id;
        const quantity = req.body?.quantity || 1;

        const result = await withTransaction(async (client) => {
          const shopItem = await client.query(
            "SELECT price FROM shop_items WHERE shop_id = $1 AND item_id = $2 LIMIT 1;",
            [shopId, itemId],
          );

          const price = Number(shopItem.rows[0]?.price) || 0;
          const totalCost = price * quantity;

          const player = await getPlayerById(playerId, client);

          const playerCoins = Number(player.coins) || 0;
          if (playerCoins < totalCost) {
            throw createHttpError(400, "Not enough coins.");
          }



          const itemRow = await upsertPlayerItem(
            client,
            playerId,
            itemId,
            quantity,
            shopId,
          );

          const nextCoinsValue = playerCoins - totalCost;
          await updatePlayerCoins(client, playerId, nextCoinsValue);

          return { itemRow, totalCost, nextCoinsValue };
        });

        return res.json({
          message: "Purchase successful.",
          item: result.itemRow,
          coins: { spent: result.totalCost, left: result.nextCoinsValue },
        });
      } catch (err) {
        errorChecker(err, res);
      }
    },
  );

  app.post(
    `${basePath}/shops/:id/sell`,
    authMiddleware,
    requireSelfOrAdmin((req) => req.body?.player_id),
    async (req, res) => {
      try {
        const shopId = req.params.id;
        const playerId = req.body?.player_id;
        const itemId = req.body?.item_id;
        const quantity = req.body?.quantity || 1;

        const result = await withTransaction(async (client) => {
          const shopItem = await client.query(
            "SELECT price FROM shop_items WHERE shop_id = $1 AND item_id = $2 LIMIT 1;",
            [shopId, itemId],
          );

          const price = Number(shopItem.rows[0]?.price) || 0;
          const totalGain = price * quantity;

          const playerItem = await fetchPlayerItem(client, playerId, itemId);

          const currentQty = Number(playerItem.quantity) || 0;
          if (currentQty < quantity) {
            throw createHttpError(400, "Not enough quantity.");
          }

          const itemRow = await adjustPlayerItem(client, playerItem, -quantity);

          const player = await getPlayerById(playerId, client);

          const nextCoinsValue =
            (Number(player.coins) || 0) + (Number(totalGain) || 0);
          await updatePlayerCoins(client, playerId, nextCoinsValue);

          return { itemRow, totalGain, nextCoinsValue };
        });



        return res.json({
          message: "Sell successful.",
          item: result.itemRow,
          coins: { gained: result.totalGain, total: result.nextCoinsValue },
        });
      } catch (err) {
        errorChecker(err, res);
      }
    },
  );


  app.post(
    `${basePath}/craft`,
    authMiddleware,
    requireSelfOrAdmin((req) => req.body?.player_id),
    async (req, res) => {
      try {
        const playerId = req.body?.player_id;
        const recipeId = req.body?.recipe_id;
        if (!playerId || !recipeId) {
          throw createHttpError(400, "player_id and recipe_id are required.");
        }

        const result = await withTransaction(async (client) => {
          const player = await getPlayerById(playerId, client);
          if (!player) {
            throw createHttpError(404, "Player not found.");
          }

          const recipeResult = await client.query(
            "SELECT id, name, input_item_id, input_item_qty, input_item_id2, input_item_qty2, output_item_id, output_item_qty FROM recipes WHERE id = $1 LIMIT 1;",
            [recipeId],
          );

          const recipe = recipeResult.rows[0];
          if (!recipe) {
            throw createHttpError(404, "Recipe not found.");
          }
          const outputId = Number(recipe.output_item_id);
          const outputQty = Number(recipe.output_item_qty) || 1;
          const inputId1 = Number(recipe.input_item_id);
          const inputQty1 = Number(recipe.input_item_qty) || 1;
          const inputId2 = Number(recipe.input_item_id2) || null;
          const inputQty2 = Number(recipe.input_item_qty2) || 1;

          const reqItem1 = await fetchPlayerItem(client, playerId, inputId1);
          if (!reqItem1) {
            throw createHttpError(400, "Missing required item 1.");
          }

          const currentQty1 = Number(reqItem1.quantity) || 0;
          if (currentQty1 < inputQty1) {
            throw createHttpError(400, "Not enough item 1.");
          }

          let reqItem2 = null;
          if (inputId2) {
            reqItem2 = await fetchPlayerItem(client, playerId, inputId2);
            if (!reqItem2) {
              throw createHttpError(400, "Missing required item 2.");
            }
            const currentQty2 = Number(reqItem2.quantity) || 0;
            if (currentQty2 < inputQty2) {
              throw createHttpError(400, "Not enough item 2.");
            }
          }

          await adjustPlayerItem(client, reqItem1, -inputQty1);

          if (reqItem2) {
            await adjustPlayerItem(client, reqItem2, -inputQty2);
          }

          const craftedRow = await upsertPlayerItem(
            client,
            playerId,
            outputId,
            outputQty,
            null,
            1,
          );

          

          return { craftedRow, recipe };
        });

        return res.json({
          message: "Crafting successful.",
          crafted: result.craftedRow,
          recipe: result.recipe,
        });
      } catch (err) {
        errorChecker(err, res);
      }
    },
  );
};

module.exports = registerGameplayRoutes;
