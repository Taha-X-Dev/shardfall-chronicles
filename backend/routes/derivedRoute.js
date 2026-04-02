const errorChecker = require("../utils/errorChecker");
const {
  authMiddleware,
  requireSelfOrAdmin,
} = require("../middleware/authMiddleware");
const {
  getLeaderboard,
  getPlayerById,
  getPlayerInventory,
  getPlayerQuestSummary,
  getPlayerBattleStats,
  getShopInventory,
} = require("../services/derivedService");

const toInt = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};



const registerDerivedRoutes = (app, basePath = "/api") => {
  app.get(`${basePath}/leaderboard`, async (req, res) => {
    try {
      const limit = toInt(req.query?.limit) || 10;
      const rows = await getLeaderboard(limit);
      res.json({ limit: Math.min(Math.max(limit, 1), 100), players: rows });
    } catch (err) {
      errorChecker(err, res);
    }
  });

  app.get(
    `${basePath}/players/:id/summary`,
    authMiddleware,
    requireSelfOrAdmin((req) => req.params.id),
    async (req, res) => {
      try {
        const playerId = toInt(req.params.id);
        if (!playerId || playerId <= 0) {
          return res.status(400).json({ message: "Invalid player id." });
        }

        const player = await getPlayerById(playerId);
        if (!player) {
          return res.status(404).json({ message: "Player not found." });
        }

        const [inventory, quests, battles] = await Promise.all([
          getPlayerInventory(playerId),
          getPlayerQuestSummary(playerId),
          getPlayerBattleStats(playerId),
        ]);

        return res.json({
          player,
          inventory,
          quests,
          battles,
        });
      } catch (err) {
        errorChecker(err, res);
      }
    },
  );


  
  app.get(`${basePath}/shops/:id/inventory`, async (req, res) => {
    try {
      const shopId = toInt(req.params.id);
      if (!shopId || shopId <= 0) {
        return res.status(400).json({ message: "Invalid shop id." });
      }

      const items = await getShopInventory(shopId);
      return res.json({ shop_id: shopId, items });
    } catch (err) {
      errorChecker(err, res);
    }
  });
};

module.exports = registerDerivedRoutes;
