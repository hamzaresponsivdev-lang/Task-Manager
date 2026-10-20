module.exports = function (pool) {
  return {
    async create(title, description, teamId, userId) {
      const result = await pool.query(
        `INSERT INTO tasks (title, description, team_id, status)
         SELECT $1, $2, teams.id, 'To Do'
         FROM teams
         WHERE teams.id = $3 AND teams.created_by = $4
         RETURNING *`,
        [title, description, teamId, userId],
      );
      return result.rows[0];
    },

    async findByTeam(teamId, userId) {
      const result = await pool.query(
        `SELECT tasks.*
         FROM tasks
         INNER JOIN teams ON teams.id = tasks.team_id
         WHERE tasks.team_id = $1 AND teams.created_by = $2
         ORDER BY tasks.created_at DESC`,
        [teamId, userId],
      );
      return result.rows;
    },

    async updateStatus(taskId, status, userId) {
      const result = await pool.query(
        `UPDATE tasks
         SET status = $1
         WHERE id = $2
           AND EXISTS (
             SELECT 1 FROM teams
             WHERE teams.id = tasks.team_id AND teams.created_by = $3
           )
         RETURNING *`,
        [status, taskId, userId],
      );
      return result.rows[0];
    },

    async delete(taskId, userId) {
      const result = await pool.query(
        `DELETE FROM tasks
         WHERE id = $1
           AND EXISTS (
             SELECT 1 FROM teams
             WHERE teams.id = tasks.team_id AND teams.created_by = $2
           )
         RETURNING id`,
        [taskId, userId],
      );
      return result.rows[0];
    },
  };
};
