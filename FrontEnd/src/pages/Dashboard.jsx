import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import TaskCard from "../components/TaskCard";
import { apiRequest } from "../api";

export default function Dashboard() {
  const [tasks, setTasks] = useState([]);
  const [teams, setTeams] = useState([]);
  const [teamId, setTeamId] = useState("");
  const [teamName, setTeamName] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingTaskId, setDeletingTaskId] = useState(null);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const fetchTasks = useCallback(async (selectedTeamId) => {
    if (!selectedTeamId) {
      setTasks([]);
      return;
    }

    try {
      const data = await apiRequest(
        `/tasks/team/${encodeURIComponent(selectedTeamId)}`,
      );
      setTasks(data.tasks || []);
      setError("");
    } catch (requestError) {
      if (requestError.status === 401) {
        navigate("/login", { replace: true });
        return;
      }
      setError(requestError.message);
    }
  }, [navigate]);

  useEffect(() => {
    let cancelled = false;

    async function loadTeams() {
      try {
        const session = await apiRequest("/auth/me");
        if (!session.authenticated) {
          navigate("/login", { replace: true });
          return;
        }
        const data = await apiRequest("/teams");
        if (cancelled) return;

        const availableTeams = data.teams || [];
        setTeams(availableTeams);
        const firstTeamId = String(availableTeams[0]?.id || "");
        setTeamId(firstTeamId);
        if (firstTeamId) await fetchTasks(firstTeamId);
      } catch (requestError) {
        if (cancelled) return;
        if (requestError.status === 401) {
          navigate("/login", { replace: true });
        } else {
          setError(requestError.message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadTeams();
    return () => {
      cancelled = true;
    };
  }, [fetchTasks, navigate]);

  const handleTeamChange = async (event) => {
    const selectedTeamId = event.target.value;
    setTeamId(selectedTeamId);
    await fetchTasks(selectedTeamId);
  };

  const handleCreateTeam = async (event) => {
    event.preventDefault();
    setError("");
    setSaving(true);

    try {
      const data = await apiRequest("/teams", {
        method: "POST",
        body: JSON.stringify({ name: teamName }),
      });
      setTeams((currentTeams) => [data.team, ...currentTeams]);
      const newTeamId = String(data.team.id);
      setTeamId(newTeamId);
      await fetchTasks(newTeamId);
      setTeamName("");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateTask = async (event) => {
    event.preventDefault();
    setError("");
    setSaving(true);

    try {
      await apiRequest("/tasks", {
        method: "POST",
        body: JSON.stringify({ title, description, team_id: teamId }),
      });
      setTitle("");
      setDescription("");
      await fetchTasks(teamId);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (taskId, status) => {
    setError("");
    try {
      await apiRequest(`/tasks/${encodeURIComponent(taskId)}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await fetchTasks(teamId);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm("Delete this task? This action cannot be undone.")) {
      return;
    }

    setError("");
    setDeletingTaskId(taskId);
    try {
      await apiRequest(`/tasks/${encodeURIComponent(taskId)}`, {
        method: "DELETE",
      });
      await fetchTasks(teamId);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setDeletingTaskId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="mx-auto max-w-7xl px-6 py-8">
        {error && (
          <div role="alert" className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="h-fit space-y-6">
            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-bold text-gray-800">Your Teams</h2>
              <form onSubmit={handleCreateTeam} className="space-y-3">
                <label htmlFor="team-name" className="block text-sm font-medium text-gray-700">
                  Create a team
                </label>
                <input
                  id="team-name"
                  type="text"
                  required
                  value={teamName}
                  onChange={(event) => setTeamName(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Product"
                />
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
                >
                  Create Team
                </button>
              </form>

              {teams.length > 0 && (
                <div className="mt-5">
                  <label htmlFor="team-select" className="mb-1 block text-sm font-medium text-gray-700">
                    Selected team
                  </label>
                  <select
                    id="team-select"
                    value={teamId}
                    onChange={handleTeamChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  >
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </section>

            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-bold text-gray-800">Create New Task</h2>
              <form onSubmit={handleCreateTask} className="space-y-4">
                <div>
                  <label htmlFor="task-title" className="mb-1 block text-sm font-medium text-gray-700">
                    Task Title
                  </label>
                  <input
                    id="task-title"
                    type="text"
                    required
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Update UI components"
                  />
                </div>

                <div>
                  <label htmlFor="task-description" className="mb-1 block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    id="task-description"
                    rows="3"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Task details..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={saving || !teamId}
                  className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Add Task"}
                </button>
                {!teams.length && !loading && (
                  <p className="text-sm text-gray-500">Create a team before adding tasks.</p>
                )}
              </form>
            </section>
          </div>

          <section className="lg:col-span-2">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800">
                {teams.find((team) => String(team.id) === teamId)?.name || "Team"} Tasks
              </h2>
              <span className="text-sm text-gray-500">{tasks.length} total tasks</span>
            </div>

            {loading ? (
              <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-500">
                Loading your workspace...
              </div>
            ) : tasks.length === 0 ? (
              <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-500">
                No tasks found for this team yet. Create one using the form.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {tasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onStatusChange={handleStatusChange}
                    onDelete={handleDeleteTask}
                    deleting={deletingTaskId === task.id}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
