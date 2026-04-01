'use client';

import { useEffect, useState } from 'react';

export default function ToDoList() {
  const [goalBlocks, setGoalBlocks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(true);

        const res = await fetch('https://n8n.aghayan.space/webhook/chat2', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ collection: 'tasks', action: 'get' }),
        });

        const payload = await res.json();
        console.log("aaaaaaaaaaa", payload)
        setGoalBlocks(toGoalBlocks(payload));
      } catch (error) {
        console.error(error);
        setGoalBlocks([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, []);

  // Helper to get task name, unwrap if n8n-style
  const taskName = (task) => {
    const t = task?.json || task;
    return t?.name || t?.title || t?.task || 'Untitled task';
  };

  // Helper to get goal name
  const goalName = (goal, fallback = 'No Goal') => goal?.name || goal?.title || goal?.goal || fallback;
  const goalTitle = (goal) =>
    goal?.title ||
    goal?.name ||
    goal?.description ||
    goal?.goal_title ||
    goal?.goalTitle ||
    goal?.objective ||
    '';

  // Convert API payload into consistent array of goal blocks
  const toGoalBlocks = (payload) => {
    if (!payload) return [];

    const allBlocks = [];

    const addBlock = (goalValue, tasksValue, fallbackIndex = 0, explicitTitle = '') => {
      const key = goalName(goalValue, `Goal ${fallbackIndex + 1}`);
      allBlocks.push({
        goal: key,
        title: explicitTitle || goalTitle(goalValue),
        tasks: Array.isArray(tasksValue) ? tasksValue.map((t) => ({ name: taskName(t) })) : [],
      });
    };

    const collectGoalSections = (node, fallbackIndex = 0) => {
      if (!node) return;

      if (Array.isArray(node)) {
        node.forEach((item, i) => collectGoalSections(item, i));
        return;
      }

      const obj = node?.json || node;

      if (obj?.goal && Array.isArray(obj?.tasks)) {
        const key = typeof obj.goal === 'object' ? obj.goal : { goal: obj.goal };
        const titleFromWrapper = goalTitle(obj);
        addBlock(key, obj.tasks, fallbackIndex, titleFromWrapper);
      }

      if ((obj?.name || obj?.title || obj?.goal) && Array.isArray(obj?.tasks)) {
        addBlock(obj, obj.tasks, fallbackIndex);
      }

      if (Array.isArray(obj?.goals)) {
        obj.goals.forEach((g, i) => addBlock(g, g?.tasks, i));
      }
    };

    // collect grouped sections from common top-level containers
    collectGoalSections(payload?.requestedData || payload?.requested_data);
    collectGoalSections(payload?.data);
    collectGoalSections(payload);

    // collect flat task lists and group them by goal
    const lists = [];
    if (Array.isArray(payload?.tasks?.data)) lists.push(payload.tasks.data);
    if (Array.isArray(payload?.data)) lists.push(payload.data);
    if (Array.isArray(payload)) lists.push(payload);

    const grouped = new Map();
    lists.forEach((list) => {
      list.forEach((item) => {
        const taskObj = item?.json || item;

        // skip grouped goal objects in this stage
        if (Array.isArray(taskObj?.tasks)) return;

        const gName =
          taskObj?.goal?.name ||
          taskObj?.goal_name ||
          taskObj?.goalName ||
          taskObj?.goal ||
          taskObj?.goal_id ||
          'No Goal';

        const gTitle =
          taskObj?.goal?.title ||
          taskObj?.goal?.name ||
          taskObj?.goal_title ||
          taskObj?.goalTitle ||
          taskObj?.goal_description ||
          taskObj?.goalDescription ||
          taskObj?.objective ||
          '';

        if (!grouped.has(gName)) {
          grouped.set(gName, { title: gTitle, tasks: [] });
        } else if (!grouped.get(gName).title && gTitle) {
          grouped.get(gName).title = gTitle;
        }

        grouped.get(gName).tasks.push({ name: taskName(taskObj) });
      });
    });

    grouped.forEach((value, goal) => {
      allBlocks.push({ goal: String(goal), title: value.title || '', tasks: value.tasks });
    });

    // merge same goal sections so all incoming data is shown per section
    const merged = new Map();
    allBlocks.forEach((block) => {
      if (!merged.has(block.goal)) {
        merged.set(block.goal, { title: block.title || '', tasks: [] });
      }

      const existing = merged.get(block.goal);
      if (!existing.title && block.title) existing.title = block.title;
      existing.tasks.push(...block.tasks);
    });

    return Array.from(merged.entries()).map(([goal, value]) => {
      let title = value.title;
      let tasks = value.tasks;

      // If goal key is generic ("Goal 1") and title is missing, use first task as title.
      if (!title && /^goal\s*\d+$/i.test(goal) && tasks.length > 0) {
        title = tasks[0]?.name || '';
        tasks = tasks.slice(1);
      }

      return {
        goal,
        title,
        tasks,
      };
    });
  };

  return (
    <div className="toDoSection" style={{ padding: 16, background: '#f8fafc' }}>
      <h2 style={{ margin: 0, marginBottom: 12 }}>Goals and Tasks</h2>

      {loading && <p>Requesting data...</p>}
      {!loading && goalBlocks.length === 0 && <p>No goals or tasks</p>}

      {!loading &&
        goalBlocks.map((block, i) => (
          <div
            key={`${block.goal}-${i}`}
            style={{
              border: '1px solid #e5e7eb',
              borderRadius: 10,
              background: '#fff',
              padding: 12,
              marginTop: 10,
            }}
          >
            <h3 style={{ margin: 0 }}>{block.title || block.goal}</h3>
            {block.title && block.title !== block.goal && (
              <p style={{ margin: '2px 0 8px', color: '#6b7280', fontSize: 12 }}>{block.goal}</p>
            )}

            {block.tasks.length === 0 ? (
              <p style={{ margin: 0, color: '#6b7280' }}>No tasks</p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {block.tasks.map((t, idx) => (
                  <li key={`${t.name}-${idx}`} style={{ marginBottom: 4 }}>
                    {t.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
    </div>
  );
}
