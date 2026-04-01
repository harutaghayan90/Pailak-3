"use client";

import AiChat from "@/components/ai";
import ToDoList from "@/components/to_do";
import { useState } from "react";

export default function Home() {
  const [_refreshTasks, _setRefreshTasks] = useState(0);

  const handleTaskAdded = () => {
    _setRefreshTasks(Date.now());
  };

  return (
    <div className="flex w-full h-screen ">
      <div className="w-8/12">
        <AiChat onTask={handleTaskAdded} />
      </div>
      <div className="w-4/12">
        <ToDoList refreshTasks={_refreshTasks} />
      </div>
    </div>
  );
}
