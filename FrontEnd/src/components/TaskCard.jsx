export default function TaskCard({ task, onStatusChange, onDelete, deleting }) {
  // Determine badge colors based on task status
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "Done":
        return "bg-green-100 text-green-700 border-green-200";
      case "In Progress":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between">
      <div>
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-semibold text-gray-800">{task.title}</h3>
          <span
            className={`text-xs font-medium px-2.5 py-1 rounded-full border ${getStatusBadgeClass(
              task.status,
            )}`}
          >
            {task.status || "To Do"}
          </span>
        </div>
        <p className="text-sm text-gray-600 mb-4">{task.description}</p>
      </div>

      <div className="flex justify-between items-center pt-3 border-t border-gray-100 text-sm">
        <span className="text-xs text-gray-400">Team ID: {task.team_id}</span>

        <div className="flex flex-wrap justify-end gap-2">
          {task.status !== "In Progress" && (
            <button
              type="button"
              onClick={() => onStatusChange(task.id, "In Progress")}
              className="rounded-lg bg-yellow-50 px-3 py-1.5 text-xs font-medium text-yellow-700 transition hover:bg-yellow-100"
            >
              In Progress
            </button>
          )}
          {task.status !== "Done" && (
            <button
              type="button"
              onClick={() => onStatusChange(task.id, "Done")}
              className="rounded-lg bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 transition hover:bg-green-100"
            >
              Mark Done
            </button>
          )}
          <button
            type="button"
            onClick={() => onDelete(task.id)}
            disabled={deleting}
            aria-label={`Delete task: ${task.title}`}
            className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
