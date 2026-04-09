"use client";

import { useEffect, useState } from "react";
import {
  CircleCheckBigIcon,
  CircleIcon,
  FolderKanban,
  GoalIcon,
  Loader2,
} from "lucide-react";

export default function ToDoList({ refreshTasks }) {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);

  // ✅ Popup state
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [promptText, setPromptText] = useState("");

  const requestData = async (body) => {
    const res = await fetch("https://n8n.aghayan.space/webhook/chat2", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.json();
  };

  const fetchPopupPrompt = async () => {
    try {
      const res = await fetch(
        "https://n8n.aghayan.space/webhook/f3f986c2-a524-4c67-a960-02a31c7247da",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "get" }),
        }
      );

      const data = await res.json();
      const prompt = data?.prompt || "No data";
      setPromptText(prompt);
    } catch (e) {
      console.error("Failed to fetch AI prompt:", e);
      setPromptText("No data");
    }
  };

  const toArray = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.tasks?.data)) return payload.tasks.data;
    if (Array.isArray(payload?.goals?.data)) return payload.goals.data;
    if (Array.isArray(payload?.requestedData)) return payload.requestedData;
    if (Array.isArray(payload?.requested_data)) return payload.requested_data;
    return [];
  };

  const getCreatedAtTime = (item) => {
    const source = item?.json || item;
    const raw = source?.created_at || source?.createdAt;
    const time = raw ? new Date(raw).getTime() : 0;
    return Number.isFinite(time) ? time : 0;
  };

  const sortByCreatedAtDesc = (list) =>
    [...list].sort((a, b) => getCreatedAtTime(b) - getCreatedAtTime(a));

  const handleTaskClick = async (task) => {
    const nextStatus = task.status === "completed" ? "open" : "completed";
    const updatedTask = { ...task, status: nextStatus };

    setSections((prev) =>
      prev.map((section) => ({
        ...section,
        tasks: section.tasks.map((t) =>
          String(t?.id) === String(task?.id) ? updatedTask : t
        ),
      }))
    );

    const body = {
      collection: "tasks",
      action: "update",
      data: [updatedTask],
      tasks: [updatedTask],
    };

    try {
      await requestData(body);
    } catch (error) {
      console.error("Task update failed:", error);

      setSections((prev) =>
        prev.map((section) => ({
          ...section,
          tasks: section.tasks.map((t) =>
            String(t?.id) === String(task?.id) ? task : t
          ),
        }))
      );
    }
  };

  const loadTasksFromDb = async () => {
    try {
      setLoading(true);

      const goalsPayload = await requestData({
        collection: "goals",
        action: "get",
      });
      const tasksPayload = await requestData({
        collection: "tasks",
        action: "get",
      });

      const goals = sortByCreatedAtDesc(toArray(goalsPayload));
      const tasks = sortByCreatedAtDesc(toArray(tasksPayload));

      const groupedTasks = tasks.reduce((acc, task) => {
        const t = task?.json || task;
        const key = String(t?.goal_id ?? t?.goalId ?? "ungrouped");

        if (!acc[key]) acc[key] = [];
        acc[key].push(t);

        return acc;
      }, {});

      const mappedGoals = goals.map((goal, index) => {
        const g = goal?.json || goal;
        const goalId = String(g?.id ?? `goal-${index}`);

        return {
          id: goalId,
          name: g?.name || g?.title || `Goal ${index + 1}`,
          tasks: sortByCreatedAtDesc(groupedTasks[goalId] || []),
        };
      });

      const orphanTasks = sortByCreatedAtDesc(groupedTasks.ungrouped || []);
      if (orphanTasks.length > 0) {
        mappedGoals.push({
          id: "ungrouped",
          name: "No Goal",
          tasks: orphanTasks,
        });
      }

      setSections(mappedGoals);
    } catch (error) {
      console.error(error);
      setSections([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasksFromDb();
  }, [refreshTasks]);

  // ✅ Save prompt handler
  const handleSavePrompt = async () => {
    try {
      await requestData({
        action: "ai_prompt",
        prompt: promptText,
      });

      setIsPromptOpen(false);
      setPromptText("");
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div
      className="toDoSection w-full h-full px-10 relative"
      style={{
        padding: 16,
        background: "#f8fafc",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div className="title_section">
        <h2
          style={{
            margin: 0,
            marginTop: 5,
            marginBottom: 12,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <FolderKanban size={18} /> Goals & Tasks
        </h2>

        <div className="prompt_section">
          <button
            className="prompt_button"
            onClick={() => {
              setIsPromptOpen(true);
              fetchPopupPrompt(); // ✅ fetch prompt when opening
            }}
          >
            AI Prompt
          </button>
        </div>
      </div>

      {loading && (
        <div className="w-full h-60 flex justify-center items-center">
          <Loader2 className="size-12 animate-spin" />
        </div>
      )}

      {!loading && sections.length === 0 && <p style={{ margin: 0 }}>No data</p>}

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", paddingRight: 4 }}>
        {!loading &&
          sections.map((section) => (
            <div
              key={section.id}
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: 10,
                background: "#fff",
                padding: 12,
                marginTop: 10,
              }}
            >
              <div className="flex mb-5 items-center gap-3">
                <GoalIcon />
                <h3 className="text-lg">{section.name}</h3>
              </div>

              {section.tasks.length === 0 ? (
                <p style={{ margin: 0, color: "#64748b" }}>No tasks</p>
              ) : (
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {section.tasks.map((task, index) => (
                    <li key={task?.id || `${section.id}-${index}`} style={{ marginBottom: 6 }}>
                      <div
                        style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                        className={`${task.status === "completed" ? "line-through" : ""} hover:scale-[101%] duration-200 cursor-pointer`}
                      >
                        <button onClick={() => handleTaskClick(task)}>
                          {task.status === "open" && <CircleIcon className="size-6 text-gray-100" />}
                          {task.status === "completed" && <CircleCheckBigIcon className="size-6 text-green-200" />}
                        </button>
                        {task?.name || task?.title || "Untitled task"}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
      </div>

      {/* ✅ POPUP */}
      {isPromptOpen && (
        <div
          onClick={() => setIsPromptOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "60%",
              height: "90vh",
              background: "#fff",
              borderRadius: 12,
              padding: 20,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <h3>AI Prompt</h3>
              <button onClick={() => setIsPromptOpen(false)}>✕</button>
            </div>

            {/* Content */}
            <div style={{ flex: 1, marginTop: 10 }}>
              <textarea
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                placeholder="Write your prompt..."
                style={{
                  width: "100%",
                  height: "100%",
                  border: "1px solid #e2e8f0",
                  borderRadius: 8,
                  padding: 10,
                  resize: "none",
                }}
              />
            </div>

            {/* Footer */}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                marginTop: 10,
              }}
            >
              <button onClick={() => setIsPromptOpen(false)}>Close</button>

              <button
                onClick={handleSavePrompt}
                style={{
                  background: "#3b82f6",
                  color: "#fff",
                  padding: "6px 12px",
                  borderRadius: 6,
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}