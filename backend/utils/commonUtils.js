const createHttpError = (statusCode, message) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

const getPlayerIdOrRespond = (req) => req.params.id;

const getBattleTargetsOrRespond = (req) => {
  const enemyId = req.body?.enemy_id ?? null;
  const bossId = req.body?.boss_id ?? null;
  return { enemyId, bossId };
};

const getQuestCompletePayloadOrRespond = (req) => {
  return { questId: req.params.id, playerId: req.body?.player_id };
};

const getPayloadOrRespond = (req) => {
  return req.body || {};
};

const getIdOrRespond = (req, _res, paramName) => {
  const name = paramName || "id";
  return req.params[name];
};

module.exports = {
  createHttpError,
  getPlayerIdOrRespond,
  getBattleTargetsOrRespond,
  getQuestCompletePayloadOrRespond,
  getPayloadOrRespond,
  getIdOrRespond,
};
