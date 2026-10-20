module.exports = function (pool) {
  return {
    async create(name, userId) {
      const result = await pool.query(
        "INSERT INTO teams (name, created_by) VALUES ($1, $2) RETURNING id, name, created_by, created_at",
        [name, userId],
      );
      return result.rows[0];
    },

    async findAll(userId) {
      const result = await pool.query(
        "SELECT id, name, created_by, created_at FROM teams WHERE created_by = $1 ORDER BY created_at DESC",
        [userId],
      );
      return result.rows;
    },
  };
};
