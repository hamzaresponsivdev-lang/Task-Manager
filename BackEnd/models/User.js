module.exports = function (pool) {
  return {
    async findByEmail(email) {
      const result = await pool.query("SELECT * FROM users WHERE LOWER(email) = $1", [
        email.trim().toLowerCase(),
      ]);
      return result.rows[0];
    },

    async findById(id) {
      const result = await pool.query(
        "SELECT id, email, created_at FROM users WHERE id = $1",
        [id],
      );
      return result.rows[0];
    },

    async create(email, hashedPassword) {
      const result = await pool.query(
        "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email, created_at",
        [email, hashedPassword],
      );
      return result.rows[0];
    },
  };
};
