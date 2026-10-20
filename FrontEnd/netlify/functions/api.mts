import type { Config, Context } from "@netlify/functions";
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { and, desc, eq, gt, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { sessions, tasks, teams, users } from "../../db/schema.js";

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

const SESSION_COOKIE = "tm_session";
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
const TASK_STATUSES = ["To Do", "In Progress", "Done"];

const teamColumns = {
  id: teams.id,
  name: teams.name,
  created_by: teams.createdBy,
  created_at: teams.createdAt,
};

const taskColumns = {
  id: tasks.id,
  title: tasks.title,
  description: tasks.description,
  team_id: tasks.teamId,
  status: tasks.status,
  created_at: tasks.createdAt,
};

type User = { id: number; email: string };

function error(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

async function readBody(req: Request): Promise<Record<string, unknown>> {
  try {
    const body = await req.json();
    return body && typeof body === "object" ? body : {};
  } catch {
    return {};
  }
}

function parseId(value: unknown): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 && id <= 2147483647 ? id : null;
}

async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

async function verifyPassword(password: string, stored: string) {
  const [scheme, saltHex, hashHex] = stored.split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = await scrypt(password, Buffer.from(saltHex, "hex"), expected.length);
  return timingSafeEqual(actual, expected);
}

function sessionCookie(value: string, maxAge: number) {
  return `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

async function getUser(context: Context): Promise<User | null> {
  const sessionId = context.cookies.get(SESSION_COOKIE);
  if (!sessionId) return null;

  const [row] = await db
    .select({ id: users.id, email: users.email })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, sessionId), gt(sessions.expiresAt, new Date())));
  return row ?? null;
}

async function handleAuth(req: Request, context: Context, action: string) {
  if (action === "register" && req.method === "POST") {
    const body = await readBody(req);
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8) {
      return error("Enter a valid email and a password with at least 8 characters.", 400);
    }

    const [user] = await db
      .insert(users)
      .values({ email, password: await hashPassword(password) })
      .onConflictDoNothing({ target: users.email })
      .returning({ id: users.id, email: users.email, created_at: users.createdAt });
    if (!user) return error("Email is already registered", 400);

    return Response.json({ message: "User registered successfully", user }, { status: 201 });
  }

  if (action === "login" && req.method === "POST") {
    const body = await readBody(req);
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    const [user] = email
      ? await db.select().from(users).where(eq(users.email, email))
      : [];
    if (!user || !(await verifyPassword(password, user.password))) {
      return error("Incorrect email or password.", 401);
    }

    // Clear out this user's expired sessions while issuing a new one.
    await db
      .delete(sessions)
      .where(and(eq(sessions.userId, user.id), sql`${sessions.expiresAt} <= now()`));
    const sessionId = randomBytes(32).toString("hex");
    await db.insert(sessions).values({
      id: sessionId,
      userId: user.id,
      expiresAt: new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000),
    });

    return Response.json(
      { message: "Logged in successfully", user: { id: user.id, email: user.email } },
      { headers: { "Set-Cookie": sessionCookie(sessionId, SESSION_MAX_AGE_SECONDS) } },
    );
  }

  if (action === "me" && req.method === "GET") {
    const user = await getUser(context);
    return Response.json({ authenticated: Boolean(user), user });
  }

  if (action === "logout" && req.method === "POST") {
    const sessionId = context.cookies.get(SESSION_COOKIE);
    if (sessionId) await db.delete(sessions).where(eq(sessions.id, sessionId));
    return Response.json(
      { message: "Logged out successfully" },
      { headers: { "Set-Cookie": sessionCookie("", 0) } },
    );
  }

  return error("Not found.", 404);
}

async function handleTeams(req: Request, user: User, segments: string[]) {
  if (segments.length > 0) return error("Not found.", 404);

  if (req.method === "GET") {
    const rows = await db
      .select(teamColumns)
      .from(teams)
      .where(eq(teams.createdBy, user.id))
      .orderBy(desc(teams.createdAt));
    return Response.json({ teams: rows });
  }

  if (req.method === "POST") {
    const body = await readBody(req);
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) return error("Team name is required.", 400);

    const [team] = await db
      .insert(teams)
      .values({ name, createdBy: user.id })
      .returning(teamColumns);
    return Response.json({ message: "Team created successfully", team }, { status: 201 });
  }

  return error("Not found.", 404);
}

async function ownsTeam(teamId: number, userId: number) {
  const [team] = await db
    .select({ id: teams.id })
    .from(teams)
    .where(and(eq(teams.id, teamId), eq(teams.createdBy, userId)));
  return Boolean(team);
}

async function ownedTaskId(taskId: number, userId: number) {
  const [task] = await db
    .select({ id: tasks.id })
    .from(tasks)
    .innerJoin(teams, eq(teams.id, tasks.teamId))
    .where(and(eq(tasks.id, taskId), eq(teams.createdBy, userId)));
  return task?.id ?? null;
}

async function handleTasks(req: Request, user: User, segments: string[]) {
  // POST /tasks
  if (segments.length === 0 && req.method === "POST") {
    const body = await readBody(req);
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const teamId = parseId(body.team_id);
    if (!title || !body.team_id) return error("Task title and team are required.", 400);
    if (!teamId || !(await ownsTeam(teamId, user.id))) return error("Team not found.", 404);

    const [task] = await db
      .insert(tasks)
      .values({ title, description, teamId, status: "To Do" })
      .returning(taskColumns);
    return Response.json({ message: "Task created successfully", task }, { status: 201 });
  }

  // GET /tasks/team/:teamId
  if (segments.length === 2 && segments[0] === "team" && req.method === "GET") {
    const teamId = parseId(segments[1]);
    if (!teamId) return Response.json({ tasks: [] });

    const rows = await db
      .select(taskColumns)
      .from(tasks)
      .innerJoin(teams, eq(teams.id, tasks.teamId))
      .where(and(eq(tasks.teamId, teamId), eq(teams.createdBy, user.id)))
      .orderBy(desc(tasks.createdAt));
    return Response.json({ tasks: rows });
  }

  // PATCH /tasks/:id/status
  if (segments.length === 2 && segments[1] === "status" && req.method === "PATCH") {
    const body = await readBody(req);
    const status = body.status;
    if (typeof status !== "string" || !TASK_STATUSES.includes(status)) {
      return error("Choose a valid task status.", 400);
    }

    const taskId = parseId(segments[0]);
    const ownedId = taskId && (await ownedTaskId(taskId, user.id));
    if (!ownedId) return error("Task not found.", 404);

    const [task] = await db
      .update(tasks)
      .set({ status })
      .where(eq(tasks.id, ownedId))
      .returning(taskColumns);
    return Response.json({ message: "Task status updated successfully", task });
  }

  // DELETE /tasks/:id
  if (segments.length === 1 && req.method === "DELETE") {
    const taskId = parseId(segments[0]);
    const ownedId = taskId && (await ownedTaskId(taskId, user.id));
    if (!ownedId) return error("Task not found.", 404);

    await db.delete(tasks).where(eq(tasks.id, ownedId));
    return Response.json({ message: "Task deleted successfully." });
  }

  return error("Not found.", 404);
}

export default async (req: Request, context: Context) => {
  const [resource, ...segments] = new URL(req.url).pathname
    .split("/")
    .filter(Boolean)
    .map(decodeURIComponent);

  try {
    if (resource === "health" || resource === "test-db") {
      const [row] = (await db.execute(sql`SELECT NOW() AS now`)).rows as { now: string }[];
      return resource === "health"
        ? Response.json({ status: "ok", database: "connected" })
        : Response.json({ success: true, time: row?.now });
    }

    if (resource === "auth") {
      return await handleAuth(req, context, segments.join("/"));
    }

    const user = await getUser(context);
    if (!user) return error("Unauthorized. Please log in.", 401);

    if (resource === "teams") return await handleTeams(req, user, segments);
    if (resource === "tasks") return await handleTasks(req, user, segments);
    return error("Not found.", 404);
  } catch (err) {
    console.error("API request failed:", err);
    if (resource === "health") {
      return Response.json({ status: "unavailable", database: "disconnected" }, { status: 503 });
    }
    return error("The server could not complete the request.", 500);
  }
};

export const config: Config = {
  path: ["/auth/*", "/teams", "/teams/*", "/tasks", "/tasks/*", "/health", "/test-db"],
};
