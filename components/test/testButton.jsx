'use client';

import { testServerFucntion } from "./server";

export default function TestButton() {
  const handleClick = (e) => {
    // e.prventDfault();

    testServerFucntion("calling server funciton ...");
  };

  return (
    <div>
      <button
        className="p-3 border border-gray-500 bg-gray-50"
        onClick={handleClick}
      >
        Test button
      </button>
    </div>
  );
}
