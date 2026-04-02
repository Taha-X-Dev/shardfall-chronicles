const pool = require("../utils/pgClient");
const errorChecker = require("../utils/errorChecker");
const {
  authMiddleware,
  requireAdmin,
} = require("../middleware/authMiddleware");
const {
  getIdOrRespond,
  getPayloadOrRespond,
} = require("../utils/commonUtils");



const MODELS = [
  {
    route: "locations",
    table: "locations",
    fields: ["name", "description"],
    required: ["name"],
  },
  {
    route: "statuses",
    table: "statuses",
    fields: ["name", "description", "duration"],
    required: ["name"],
  },
  {
    route: "shops",
    table: "shops",
    fields: ["name", "location_id"],
    required: ["name", "location_id"],
    adminOnlyWrite: true,
  },
  {
    route: "items",
    table: "items",
    fields: ["name", "type", "rarity", "power"],
    required: ["name", "type"],
    adminOnlyWrite: true,
  },
  {
    route: "shop_items",
    table: "shop_items",
    fields: ["shop_id", "item_id", "price"],
    required: ["shop_id", "item_id", "price"],
  },
  {
    route: "players",
    table: "players",
    fields: ["name", "level", "experience", "health", "mana", "coins", "created_at"],
    required: ["name"],
  },
  {
    route: "player_items",
    table: "player_items",
    fields: ["player_id", "item_id", "quantity", "shop_id"],
    required: ["player_id", "item_id"],
  },
  {
    route: "player_shops",
    table: "player_shops",
    fields: ["player_id", "shop_id", "visited_at", "reputation"],
    required: ["player_id", "shop_id"],
  },
  {
    route: "recipes",
    table: "recipes",
    fields: [
      "name",
      "input_item_id",
      "input_item_qty",
      "input_item_id2",
      "input_item_qty2",
      "output_item_id",
      "output_item_qty",
    ],
    required: ["name", "input_item_id", "input_item_qty", "output_item_id"],
    adminOnlyWrite: true,
  },
  {
    route: "skills",
    table: "skills",
    fields: ["name", "description", "power"],
    required: ["name"],
    adminOnlyWrite: true,
  },
  {
    route: "player_skills",
    table: "player_skills",
    fields: ["player_id", "skill_id", "level", "acquired_at"],
    required: ["player_id", "skill_id"],
  },
  {
    route: "enemies",
    table: "enemies",
    fields: ["name", "level", "health", "attack"],
    required: ["name"],
  },
  {
    route: "bosses",
    table: "bosses",
    fields: ["name", "level", "health", "attack", "location_id"],
    required: ["name", "location_id"],
    adminOnlyWrite: true,
  },
  {
    route: "quests",
    table: "quests",
    fields: ["title", "description", "reward_experience", "reward_item_id"],
    required: ["title"],
  },
  {
    route: "achievements",
    table: "achievements",
    fields: ["title", "description", "reward_experience"],
    required: ["title"],
    adminOnlyWrite: true,
  },
  {
    route: "player_achievements",
    table: "player_achievements",
    fields: ["player_id", "achievement_id", "unlocked_at"],
    required: ["player_id", "achievement_id"],
  },
  {
    route: "player_quests",
    table: "player_quests",
    fields: [
      "player_id",
      "quest_id",
      "status_id",
      "started_at",
      "completed_at",
    ],
    required: ["player_id", "quest_id", "status_id"],
  },
  {
    route: "battles",
    table: "battles",
    fields: [
      "player_id",
      "enemy_id",
      "boss_id",
      "result",
      "experience_gained",
      "battle_time",
    ],
    required: ["player_id", "result"],
  },
];



const registerFactoryRoutes = (app, basePath = "/api") => {
  MODELS.forEach(({ route, table, fields, required, adminOnlyWrite }) => {
    const listPath = `${basePath}/${route}`;
    const detailPath = `${basePath}/${route}/:id`;

    app.get(listPath, async (_, res) => {
      try {
        const { rows } = await pool.query(
          `SELECT * FROM ${table} ORDER BY id;`,
        );
        res.json(rows);
      } catch (err) {
        errorChecker(err, res);
      }
    });

    app.get(detailPath, async (req, res) => {
      try {
        const getId = getIdOrRespond(req, res);
        if (!getId) return;

        const { rows } = await pool.query(
          `SELECT * FROM ${table} WHERE id = $1;`,
          [getId],
        );
        if (!rows[0]) {
          return res
            .status(404)
            .json({ message: `${route} record not found.` });
        }
        res.json(rows[0]);
      } catch (err) {
        errorChecker(err, res);
      }
    });




    app.post(listPath, authMiddleware, requireAdmin, async (req, res) => {
      try {
        const payload = getPayloadOrRespond(req, res, {
          fields,
          required,
          isUpdate: false,
        });
        if (!payload) return;

        const keys = Object.keys(payload);
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");
        const values = Object.values(payload);

        const { rows } = await pool.query(
          `INSERT INTO ${table} (${keys.join(",")}) VALUES (${placeholders}) RETURNING *;`,
          values,
        );
        res
          .status(201)
          .json({ message: "Record created successfully.", data: rows[0] });
      } catch (err) {
        errorChecker(err, res);
      }
    });

    app.put(detailPath, authMiddleware, requireAdmin, async (req, res) => {
      try {
        const id = getIdOrRespond(req, res);
        if (!id) return;

        const payload = getPayloadOrRespond(req, res, {
          fields,
          required,
          isUpdate: true,
        });
        if (!payload) return;

        const keys = Object.keys(payload);
        const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(", ");
        const values = [...Object.values(payload), id];

        const { rows } = await pool.query(
          `UPDATE ${table} SET ${setClause} WHERE id = $${values.length} RETURNING *;`,
          values,
        );
        if (!rows[0]) {
          return res
            .status(404)
            .json({ message: `${route} record not found.` });
        }
        res.json({ message: "Record updated successfully.", data: rows[0] });
      } catch (err) {
        errorChecker(err, res);
      }
    });

    app.delete(detailPath, authMiddleware, requireAdmin, async (req, res) => {
      try {
        const deletedId = getIdOrRespond(req, res);
        if (!deletedId) return;
        const { rowCount } = await pool.query(
          `DELETE FROM ${table} WHERE id = $1;`,
          [deletedId],
        );
        if (!rowCount) {
          return res
            .status(404)
            .json({ message: `${route} record not found.` });
        }

        res.json({ message: "Record deleted successfully." });
      } catch (err) {
        errorChecker(err, res);
      }
    });
  });
};

module.exports = registerFactoryRoutes;
