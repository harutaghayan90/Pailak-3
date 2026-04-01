'use client';

import { useEffect, useState } from 'react';

export default function ToDoList() {
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const res = await fetch('https://n8n.aghayan.space/webhook/chat2', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            collection: 'tasks',
            action: 'get',
          }),
        });

        const data = await res.json();

        console.log('API RESPONSE:', data);

        // 🔥 CRITICAL FIX
        if (Array.isArray(data)) {
          setTasks(data);
        } else if (Array.isArray(data.data)) {
          setTasks(data.data);
        } else {
          setTasks([]); // fallback so map doesn't crash
        }

      } catch (err) {
        console.error(err);
        setTasks([]); // prevent crash
      }
    };

    fetchTasks();
  }, []);

  return (
    <div className="toDoSection">
      <h2>Tasks</h2>

      {tasks.length === 0 && <p>No tasks</p>}

      {tasks.map((task, i) => (
        <div key={i}>
          <p>{task.name}</p>
          <p>{task.status}</p>
        </div>
      ))}
    </div>
  );
}