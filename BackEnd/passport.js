const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcrypt");

module.exports = function (passport, pool) {
  // 1. Configure Local Strategy for Login
  passport.use(
    new LocalStrategy(
      { usernameField: "email" },
      async (email, password, done) => {
        try {
          // Find user by email in Supabase
          const result = await pool.query(
            "SELECT id, email, password, created_at FROM users WHERE LOWER(email) = $1",
            [email.trim().toLowerCase()],
          );
          if (result.rows.length === 0) {
            return done(null, false, {
              message: "Incorrect email or password.",
            });
          }

          const user = result.rows[0];

          // Compare entered password with the hashed password in the database
          const isValidPassword = await bcrypt.compare(password, user.password);
          if (!isValidPassword) {
            return done(null, false, {
              message: "Incorrect email or password.",
            });
          }

          // Authentication successful, return user object
          return done(null, user);
        } catch (err) {
          return done(err);
        }
      },
    ),
  );

  // 2. Serialize user id into the session
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  // 3. Deserialize user from the session using their id
  passport.deserializeUser(async (id, done) => {
    try {
      const result = await pool.query(
        "SELECT id, email, created_at FROM users WHERE id = $1",
        [id],
      );
      done(null, result.rows[0] || false);
    } catch (err) {
      done(err);
    }
  });
};
